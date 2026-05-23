import { SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { requirePlayer } from "../../music/helpers";
import * as E from "../../ui/embeds";
import { truncate } from "../../utils/duration";

export default defineCommand({
  name: "skip",
  category: "music",
  aliases: ["s", "next"],
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Pula a música atual"),
  async execute(ctx) {
    await ctx.defer();
    const player = requirePlayer(ctx);
    const current = player.queue.current;
    if (player.queue.size === 0) {
      ctx.music.destroy(ctx.guildId!);
      await ctx.reply({
        embeds: [E.muted("Pulei", "Era a última. Saí da call.")],
      });
      return;
    }
    await player.skip();
    await ctx.reply({
      embeds: [
        E.info("Pulado", current ? `~~${truncate(current.title, 120)}~~` : null),
      ],
    });
  },
});
