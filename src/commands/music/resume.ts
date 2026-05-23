import { SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { requirePlayer } from "../../music/helpers";
import * as E from "../../ui/embeds";

export default defineCommand({
  name: "resume",
  category: "music",
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Retoma a música pausada"),
  async execute(ctx) {
    await ctx.defer();
    const player = requirePlayer(ctx);
    if (!player.paused) {
      await ctx.reply({ embeds: [E.info("Já está tocando")] });
      return;
    }
    player.pause(false);
    await ctx.reply({ embeds: [E.ok("Retomado")] });
  },
});
