import { SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { requirePlayer } from "../../music/helpers";
import * as E from "../../ui/embeds";

export default defineCommand({
  name: "stop",
  category: "music",
  aliases: ["leave", "disconnect", "dc"],
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Para a música e limpa a fila"),
  async execute(ctx) {
    await ctx.defer();
    requirePlayer(ctx);
    ctx.music.destroy(ctx.guildId!);
    await ctx.reply({
      embeds: [E.fail("Parei", "Limpei a fila e saí da call.")],
    });
  },
});
