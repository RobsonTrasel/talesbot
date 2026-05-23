import { SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import { requirePlayer } from "../../music/helpers";
import * as E from "../../ui/embeds";

const MODES = ["none", "track", "queue"] as const;
type Mode = (typeof MODES)[number];

const LABELS: Record<Mode, string> = {
  none: "desligado",
  track: "música atual",
  queue: "fila inteira",
};

export default defineCommand({
  name: "loop",
  category: "music",
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Alterna o modo de repetição")
    .addStringOption((o) =>
      o
        .setName("mode")
        .setDescription("Modo")
        .addChoices(
          { name: "none (desligado)", value: "none" },
          { name: "track (música atual)", value: "track" },
          { name: "queue (fila inteira)", value: "queue" },
        ),
    ),
  async execute(ctx) {
    await ctx.defer();
    const player = requirePlayer(ctx);
    const requested = ctx.string("mode");
    let next: Mode;
    if (requested && MODES.includes(requested as Mode)) {
      next = requested as Mode;
    } else {
      const cur = MODES.indexOf(player.loop as Mode);
      next = MODES[(cur + 1) % MODES.length]!;
    }
    player.setLoop(next);
    await ctx.reply({ embeds: [E.info("Loop", `**${LABELS[next]}**`)] });
  },
});
