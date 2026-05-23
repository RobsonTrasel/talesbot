import "dotenv/config";
import * as dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { Bot } from "./core/Bot";
import { Logger } from "./core/Logger";
import { config } from "./config";

const logger = new Logger("main");

if (!config.spotify.configured) {
  logger.warn(
    "SPOTIFY_CLIENT_ID/SECRET não definidos. Links do Spotify não funcionam (busca por texto usa YouTube Music).",
  );
}

const bot = new Bot();
bot.start().catch((e) => {
  logger.error("Falha no start:", e);
  process.exit(1);
});
