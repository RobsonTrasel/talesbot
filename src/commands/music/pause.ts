import { SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { requirePlayer } from "../../music/helpers";
import * as E from "../../ui/embeds";

export default defineCommand({
  name: "pause",
  category: "music",
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pausa a música atual"),
  async execute(ctx) {
    await ctx.defer();
    const player = requirePlayer(ctx);
    if (player.paused) {
      await ctx.reply({ embeds: [E.warn("Já está pausada")] });
      return;
    }
    player.pause(true);
    await ctx.reply({ embeds: [E.warn("Pausado")] });
  },
});
