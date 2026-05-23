import { SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../core/Command";
import * as E from "../../ui/embeds";

const API_URL = "http://xinga-me.appspot.com/api";
const TIMEOUT_MS = 5000;

const FALLBACKS = [
  "zé ruela pão de salsicha",
  "filho de uma micareteira alisador de pentelho",
  "rebostola adorador de linguiça",
  "cara de quem perdeu no bingo da igreja",
  "abestalhado nível pamonha",
  "trapalhão de feira livre",
];

async function fetchXingamento(): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { xingamento?: string };
    if (!data.xingamento) throw new Error("resposta sem campo xingamento");
    return data.xingamento;
  } finally {
    clearTimeout(timer);
  }
}

function pickFallback(): string {
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]!;
}

export default defineCommand({
  name: "ofender",
  category: "general",
  aliases: ["xingar", "zoa", "insulto"],
  data: new SlashCommandBuilder()
    .setName("ofender")
    .setDescription("Gera uma ofensa aleatória (zoeira)")
    .addUserOption((o) =>
      o.setName("user").setDescription("Quem zoar (opcional)").setRequired(false),
    ),
  async execute(ctx) {
    await ctx.defer();
    let xingamento: string;
    try {
      xingamento = await fetchXingamento();
    } catch (e) {
      ctx.logger.warn("API xinga-me falhou, usando fallback:", e);
      xingamento = pickFallback();
    }

    const target = ctx.user("user");
    const description = target ? `${target}, ${xingamento}` : xingamento;

    await ctx.reply({
      embeds: [E.warn("0800-ofensa", description)],
    });
  },
});
