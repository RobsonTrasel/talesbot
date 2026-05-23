import { SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { requirePlayer } from "../../music/helpers";
import * as E from "../../ui/embeds";

export default defineCommand({
  name: "queue",
  category: "music",
  aliases: ["q"],
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Mostra a fila atual"),
  async execute(ctx) {
    await ctx.defer();
    const player = requirePlayer(ctx, { sameVC: false });
    await ctx.reply({ embeds: [E.queueList(player)] });
  },
});
