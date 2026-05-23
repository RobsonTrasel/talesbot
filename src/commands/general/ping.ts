import { SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import * as E from "../../ui/embeds";

export default defineCommand({
  name: "ping",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Mostra a latência do bot e do Lavalink"),
  async execute(ctx) {
    await ctx.defer();
    const wsPing = ctx.client.ws.ping;
    const nodes = Array.from(ctx.music.kazagumo.shoukaku.nodes.values());
    const lavaPing = nodes[0]
      ? `${nodes[0].stats?.frameStats ? "ativo" : "ocioso"}`
      : "desconectado";
    await ctx.reply({
      embeds: [
        E.info(
          "Ping",
          `**Discord WS:** \`${wsPing}ms\`\n**Lavalink:** ${lavaPing}`,
        ),
      ],
    });
  },
});
