import { SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { requirePlayer } from "../../music/helpers";
import * as E from "../../ui/embeds";

export default defineCommand({
  name: "shuffle",
  category: "music",
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Embaralha a fila"),
  async execute(ctx) {
    await ctx.defer();
    const player = requirePlayer(ctx);
    if (player.queue.size < 2) {
      await ctx.reply({
        embeds: [
          E.warn("Fila pequena demais", "Adiciona mais músicas pra embaralhar."),
        ],
      });
      return;
    }
    player.queue.shuffle();
    await ctx.reply({
      embeds: [
        E.info(
          "Fila embaralhada",
          `${player.queue.size} faixa(s) reordenadas.`,
        ),
      ],
    });
  },
});
