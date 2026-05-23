import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { COLOR } from "../../ui/embeds";
import { config } from "../../config";

const CATEGORY_LABELS: Record<string, string> = {
  music: "🎵 Música",
  moderation: "🛡️ Moderação",
  general: "ℹ️ Geral",
};

export default defineCommand({
  name: "help",
  category: "general",
  aliases: ["h", "ajuda"],
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Mostra todos os comandos disponíveis"),
  async execute(ctx) {
    await ctx.defer();
    const grouped = ctx.registry.groupedByCategory();
    const embed = new EmbedBuilder()
      .setColor(COLOR.primary)
      .setAuthor({ name: ctx.client.user.username, iconURL: ctx.client.user.displayAvatarURL() })
      .setTitle("Comandos disponíveis")
      .setDescription(
        `Use \`/<comando>\` ou \`${config.discord.prefix}<comando>\`.`,
      );

    for (const [category, cmds] of grouped) {
      const label = CATEGORY_LABELS[category] || category;
      const lines = cmds
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => {
          const desc = c.data.description;
          return `\`${c.name}\` — ${desc}`;
        });
      embed.addFields({ name: label, value: lines.join("\n") || "—" });
    }

    embed.setFooter({
      text: `${ctx.registry.all.length} comando(s) carregado(s)`,
    });

    await ctx.reply({ embeds: [embed] });
  },
});
