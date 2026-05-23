import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { ensureHierarchy, getTargetMember } from "./_helpers";
import * as E from "../../ui/embeds";
import { UserFacingError } from "../../utils/errors";
import { parseDuration, formatDuration } from "../../utils/duration";

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000; // limite do Discord: 28 dias

export default defineCommand({
  name: "timeout",
  category: "moderation",
  aliases: ["mute"],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Silencia um membro temporariamente (ou remove se duration=0)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("Usuário").setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("duration")
        .setDescription("Tempo (ex: 10m, 1h30m, 2d). 0 pra remover")
        .setRequired(true),
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Motivo").setMaxLength(400),
    ),
  async execute(ctx) {
    await ctx.defer();
    const target = getTargetMember(ctx);
    const durationRaw = (ctx.string("duration") || "").trim();
    const reason = (ctx.string("reason") || "Sem motivo").slice(0, 400);
    ensureHierarchy(ctx, target, "silenciar");
    if (!target.moderatable) {
      throw new UserFacingError("Não consigo silenciar esse usuário.");
    }

    if (durationRaw === "0" || durationRaw.toLowerCase() === "off") {
      await target.timeout(null, `${ctx.member?.user.tag}: timeout removido`);
      await ctx.reply({
        embeds: [E.ok("Timeout removido", `**${target.user.tag}**`)],
      });
      return;
    }

    const ms = parseDuration(durationRaw);
    if (ms === null || ms <= 0) {
      throw new UserFacingError(
        "Duração inválida. Use formatos como `10m`, `1h30m`, `2d`.",
      );
    }
    if (ms > MAX_TIMEOUT_MS) {
      throw new UserFacingError("Máximo permitido pelo Discord: 28 dias.");
    }
    await target.timeout(ms, `${ctx.member?.user.tag}: ${reason}`);
    await ctx.reply({
      embeds: [
        E.warn(
          "Silenciado",
          `**${target.user.tag}** por **${formatDuration(ms)}** — ${reason}`,
        ),
      ],
    });
  },
});
