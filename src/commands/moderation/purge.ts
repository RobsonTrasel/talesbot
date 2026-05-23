import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { defineCommand } from "../../core/Command";
import * as E from "../../ui/embeds";
import { UserFacingError } from "../../utils/errors";
import { config } from "../../config";

export default defineCommand({
  name: "purge",
  category: "moderation",
  aliases: ["clear", "clean"],
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Apaga as últimas N mensagens do canal (max 100)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) =>
      o
        .setName("count")
        .setDescription("Quantas (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addUserOption((o) =>
      o.setName("user").setDescription("Filtrar por usuário (opcional)"),
    ),
  async execute(ctx) {
    await ctx.defer(/* ephemeral */ true);
    const count = ctx.integer("count");
    if (count === null || count < 1 || count > config.limits.purgeMaxMessages) {
      throw new UserFacingError(`Quantidade inválida (1-${config.limits.purgeMaxMessages}).`);
    }
    const channel = ctx.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new UserFacingError("Só funciona em canais de texto.");
    }
    const userFilter = ctx.user("user");

    let messages = await channel.messages.fetch({ limit: 100 });
    if (userFilter) {
      messages = messages.filter((m) => m.author.id === userFilter.id);
    }
    const toDelete = Array.from(messages.values()).slice(0, count);
    if (!toDelete.length) {
      throw new UserFacingError("Nada pra apagar nesse filtro.");
    }
    const deleted = await channel.bulkDelete(toDelete, /* filterOld */ true);
    await ctx.reply({
      embeds: [
        E.muted(
          "Limpeza",
          `Apaguei **${deleted.size}** mensagem(ns)${userFilter ? ` de ${userFilter.user.tag}` : ""}.${
            deleted.size < toDelete.length
              ? " (mensagens > 14 dias não podem ser apagadas em massa)"
              : ""
          }`,
        ),
      ],
    });
  },
});
