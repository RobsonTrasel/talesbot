import "dotenv/config";
import { REST, Routes } from "discord.js";
import { join } from "node:path";
import { CommandRegistry } from "./core/CommandRegistry";
import { Logger } from "./core/Logger";
import { config } from "./config";

const logger = new Logger("deploy");

async function main(): Promise<void> {
  const registry = new CommandRegistry();
  registry.loadDir(join(__dirname, "commands"));
  const body = registry.all.map((c) => c.data.toJSON());

  if (!body.length) {
    logger.error("Nenhum comando encontrado");
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  if (config.discord.guildId) {
    logger.info(
      `Registrando ${body.length} comando(s) no servidor ${config.discord.guildId}...`,
    );
    await rest.put(
      Routes.applicationGuildCommands(
        config.discord.clientId,
        config.discord.guildId,
      ),
      { body },
    );
    logger.info("OK. Disponíveis imediatamente nesse servidor.");
  } else {
    logger.info(`Registrando ${body.length} comando(s) globalmente...`);
    await rest.put(Routes.applicationCommands(config.discord.clientId), { body });
    logger.info("OK. Pode demorar até 1h pra propagar.");
  }
}

main().catch((e) => {
  logger.error("Falha:", e);
  process.exit(1);
});
