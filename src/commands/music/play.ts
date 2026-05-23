import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { getVoiceChannel, isUrl } from "../../music/helpers";
import { config } from "../../config";
import { UserFacingError } from "../../utils/errors";
import * as E from "../../ui/embeds";

export default defineCommand({
  name: "play",
  category: "music",
  aliases: ["p"],
  botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Toca uma música (link YouTube/Spotify ou termo de busca)")
    .addStringOption((o) =>
      o.setName("query").setDescription("Link ou nome").setRequired(true),
    ),
  async execute(ctx) {
    await ctx.defer();
    const raw = (ctx.string("query") || "").trim();
    if (!raw) throw new UserFacingError("Use: `/play <link ou nome>`");
    const query = raw.slice(0, config.limits.queryMaxLength);

    const voiceChannel = getVoiceChannel(ctx);
    const existing = ctx.music.getPlayer(ctx.guildId!);
    if (existing && existing.voiceId !== voiceChannel.id) {
      throw new UserFacingError(
        "Já estou em outra call. Entra na minha call ou usa `/stop`.",
      );
    }

    const result = await ctx.music
      .search(query, {
        requester: ctx.member?.user,
        isUrl: isUrl(query),
      })
      .catch((e) => {
        ctx.logger.error("search falhou:", e);
        return null;
      });

    if (!result || !result.tracks?.length) {
      await ctx.reply({
        embeds: [
          E.warn("Nada encontrado", `Sem resultados pra \`${query.slice(0, 120)}\`.`),
        ],
      });
      return;
    }

    const player =
      existing ??
      (await ctx.music.createPlayer({
        guildId: ctx.guildId!,
        voiceId: voiceChannel.id,
        textId: ctx.channel!.id,
      }));

    if (result.type === "PLAYLIST") {
      const tracks = result.tracks.slice(0, config.limits.playlistMaxTracks);
      for (const t of tracks) player.queue.add(t);
      await ctx.reply({
        embeds: [E.addedPlaylist(result.playlistName, tracks)],
      });
    } else {
      const track = result.tracks[0]!;
      player.queue.add(track);
      await ctx.reply({ embeds: [E.addedTrack(track, player)] });
    }

    if (!player.playing && !player.paused) {
      try {
        player.play();
      } catch (e) {
        ctx.logger.error("play start falhou:", e);
      }
    }
  },
});
