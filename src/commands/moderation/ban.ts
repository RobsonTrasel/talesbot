import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { ensureHierarchy, getTargetMember } from "./_helpers";
import * as E from "../../ui/embeds";
import { UserFacingError } from "../../utils/errors";

export default defineCommand({
  name: "ban",
  category: "moderation",
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bane um membro do servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("Usuário a banir").setRequired(true),
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Motivo").setMaxLength(400),
    )
    .addIntegerOption((o) =>
      o
        .setName("delete_days")
        .setDescription("Quantos dias de mensagens apagar (0-7)")
        .setMinValue(0)
        .setMaxValue(7),
    ),
  async execute(ctx) {
    await ctx.defer();
    const target = getTargetMember(ctx);
    const reason = (ctx.string("reason") || "Sem motivo").slice(0, 400);
    const deleteDays = ctx.integer("delete_days") ?? 0;
    ensureHierarchy(ctx, target, "banir");
    if (!target.bannable) {
      throw new UserFacingError("Não consigo banir esse usuário.");
    }
    await target.ban({
      reason: `${ctx.member?.user.tag}: ${reason}`,
      deleteMessageSeconds: deleteDays * 86400,
    });
    await ctx.reply({
      embeds: [
        E.fail(
          "Banido",
          `**${target.user.tag}** — ${reason}${deleteDays > 0 ? ` · ${deleteDays}d de msgs apagadas` : ""}`,
        ),
      ],
    });
  },
});
