import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { ensureHierarchy, getTargetMember } from "./_helpers";
import * as E from "../../ui/embeds";
import { UserFacingError } from "../../utils/errors";

export default defineCommand({
  name: "kick",
  category: "moderation",
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsa um membro do servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("Usuário a expulsar").setRequired(true),
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Motivo").setMaxLength(400),
    ),
  async execute(ctx) {
    await ctx.defer();
    const target = getTargetMember(ctx);
    const reason = (ctx.string("reason") || "Sem motivo").slice(0, 400);
    ensureHierarchy(ctx, target, "expulsar");
    if (!target.kickable) {
      throw new UserFacingError("Não consigo expulsar esse usuário.");
    }
    await target.kick(`${ctx.member?.user.tag}: ${reason}`);
    await ctx.reply({
      embeds: [
        E.fail("Expulso", `**${target.user.tag}** — ${reason}`),
      ],
    });
  },
});
