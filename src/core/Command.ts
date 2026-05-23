import {
  PermissionResolvable,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import type { CommandContext } from "./CommandContext";

export type CommandCategory = "music" | "moderation" | "general";

export type CommandBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface Command {
  /** Nome do comando, em lowercase. Usado como /<name> e !<name>. */
  readonly name: string;
  /** Categoria, usada pra organizar /help. */
  readonly category: CommandCategory;
  /** Apelidos pra prefix command. */
  readonly aliases?: readonly string[];
  /** Permissoes que o USUARIO precisa ter (Discord.js permission flags). */
  readonly userPermissions?: readonly PermissionResolvable[];
  /** Permissoes que o BOT precisa ter no canal/guild. */
  readonly botPermissions?: readonly PermissionResolvable[];
  /** So funciona em DM-less (guild). Default true. */
  readonly guildOnly?: boolean;
  /** Resposta deve ser ephemeral por padrao. */
  readonly ephemeral?: boolean;
  /** Builder do slash command pra registrar via REST. */
  readonly data: CommandBuilder;
  /** Logica do comando. */
  execute(ctx: CommandContext): Promise<void>;
}

/**
 * Helper pra definir comandos com inferencia de tipo + defaults sensatos.
 * Exporta um Command pronto via `export default defineCommand({...})`.
 */
export function defineCommand(cmd: Command): Command {
  return cmd;
}
