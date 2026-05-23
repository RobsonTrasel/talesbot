import { readdirSync, statSync } from "node:fs";
import { join, extname, basename, resolve } from "node:path";
import type { Command } from "./Command";
import { Logger } from "./Logger";

/**
 * Carrega todos os comandos de um diretorio recursivamente.
 * Cada arquivo .ts/.js deve ter `export default` um Command.
 */
export class CommandRegistry {
  private readonly logger = new Logger("registry");
  private readonly commands = new Map<string, Command>();
  private readonly aliases = new Map<string, string>();

  get all(): readonly Command[] {
    return [...this.commands.values()];
  }

  get(nameOrAlias: string): Command | undefined {
    const direct = this.commands.get(nameOrAlias);
    if (direct) return direct;
    const aliased = this.aliases.get(nameOrAlias);
    return aliased ? this.commands.get(aliased) : undefined;
  }

  register(cmd: Command): void {
    if (this.commands.has(cmd.name)) {
      this.logger.warn(`Comando duplicado ignorado: ${cmd.name}`);
      return;
    }
    if (cmd.data.name !== cmd.name) {
      this.logger.warn(
        `data.name ("${cmd.data.name}") != name ("${cmd.name}") em ${cmd.name}, usando data.name`,
      );
    }
    this.commands.set(cmd.name, cmd);
    for (const alias of cmd.aliases || []) {
      if (this.aliases.has(alias) || this.commands.has(alias)) {
        this.logger.warn(`Alias duplicado ignorado: ${alias} (de ${cmd.name})`);
        continue;
      }
      this.aliases.set(alias, cmd.name);
    }
    this.logger.debug(`+ ${cmd.category}/${cmd.name}${cmd.aliases?.length ? ` (aliases: ${cmd.aliases.join(", ")})` : ""}`);
  }

  loadDir(dir: string): void {
    const absDir = resolve(dir);
    let entries: string[];
    try {
      entries = readdirSync(absDir);
    } catch (e) {
      this.logger.warn(`Nao consegui ler ${absDir}`);
      return;
    }
    for (const entry of entries) {
      const full = join(absDir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        this.loadDir(full);
        continue;
      }
      const ext = extname(entry);
      if (ext !== ".js" && ext !== ".ts") continue;
      if (basename(entry).startsWith("_")) continue;
      try {
        const mod = require(full);
        const cmd: Command | undefined = mod.default ?? mod.command;
        if (!cmd || !cmd.name || typeof cmd.execute !== "function") {
          this.logger.warn(`Pulando ${full}: nao exporta um Command valido`);
          continue;
        }
        this.register(cmd);
      } catch (e) {
        this.logger.error(`Falha ao carregar ${full}:`, e);
      }
    }
  }

  groupedByCategory(): Map<string, Command[]> {
    const out = new Map<string, Command[]>();
    for (const cmd of this.commands.values()) {
      const list = out.get(cmd.category) || [];
      list.push(cmd);
      out.set(cmd.category, list);
    }
    return out;
  }
}
