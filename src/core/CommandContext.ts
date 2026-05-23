import {
  ChatInputCommandInteraction,
  Client,
  Guild,
  GuildMember,
  GuildTextBasedChannel,
  InteractionReplyOptions,
  Message,
  MessageReplyOptions,
} from "discord.js";
import type { MusicManager } from "../music/MusicManager";
import type { CommandRegistry } from "./CommandRegistry";
import type { Logger } from "./Logger";

export type CommandSource =
  | { kind: "slash"; interaction: ChatInputCommandInteraction }
  | { kind: "prefix"; message: Message; args: string[] };

export interface CommandServices {
  readonly client: Client<true>;
  readonly music: MusicManager;
  readonly logger: Logger;
  readonly registry: CommandRegistry;
}

/**
 * Contexto unificado pra comandos slash e prefix.
 * Esconde a diferenca entre Interaction e Message com defer/reply abstratos.
 */
export class CommandContext {
  constructor(
    readonly source: CommandSource,
    readonly services: CommandServices,
  ) {}

  get client(): Client<true> {
    return this.services.client;
  }

  get music(): MusicManager {
    return this.services.music;
  }

  get registry(): CommandRegistry {
    return this.services.registry;
  }

  get logger(): Logger {
    return this.services.logger;
  }

  get guild(): Guild | null {
    return this.source.kind === "slash"
      ? this.source.interaction.guild
      : this.source.message.guild;
  }

  get guildId(): string | null {
    return this.guild?.id ?? null;
  }

  get member(): GuildMember | null {
    const m =
      this.source.kind === "slash"
        ? this.source.interaction.member
        : this.source.message.member;
    return m instanceof GuildMember ? m : null;
  }

  get channel(): GuildTextBasedChannel | null {
    const c =
      this.source.kind === "slash"
        ? this.source.interaction.channel
        : this.source.message.channel;
    return c && c.isTextBased() && !c.isDMBased()
      ? (c as GuildTextBasedChannel)
      : null;
  }

  arg(index: number): string | undefined {
    if (this.source.kind === "prefix") return this.source.args[index];
    return undefined;
  }

  joinedArgs(): string {
    if (this.source.kind === "prefix") return this.source.args.join(" ");
    return "";
  }

  string(name: string): string | undefined {
    if (this.source.kind === "slash") {
      return this.source.interaction.options.getString(name) || undefined;
    }
    return this.joinedArgs() || undefined;
  }

  user(name: string): GuildMember | null {
    if (this.source.kind === "slash") {
      const m = this.source.interaction.options.getMember(name);
      return m instanceof GuildMember ? m : null;
    }
    const arg = this.source.args[0];
    if (!arg) return null;
    const id = arg.replace(/[<@!>]/g, "");
    return this.guild?.members.cache.get(id) || null;
  }

  integer(name: string): number | null {
    if (this.source.kind === "slash") {
      return this.source.interaction.options.getInteger(name);
    }
    const arg = this.source.args[0];
    if (!arg) return null;
    const n = Number(arg);
    return Number.isFinite(n) ? Math.floor(n) : null;
  }

  async defer(ephemeral = false): Promise<void> {
    if (this.source.kind !== "slash") return;
    const i = this.source.interaction;
    if (i.deferred || i.replied) return;
    await i.deferReply(ephemeral ? { flags: 1 << 6 } : undefined).catch(() => {});
  }

  async reply(content: string | InteractionReplyOptions | MessageReplyOptions): Promise<void> {
    const payload = typeof content === "string" ? { content } : content;
    try {
      if (this.source.kind === "slash") {
        const i = this.source.interaction;
        if (i.deferred || i.replied) {
          // editReply nao aceita flags ephemeral (ja foi decidido no defer)
          const { flags: _ignoreFlags, ...rest } = payload as InteractionReplyOptions & { flags?: unknown };
          await i.editReply(rest);
        } else {
          await i.reply(payload as InteractionReplyOptions);
        }
      } else {
        await this.source.message.reply(payload as MessageReplyOptions);
      }
    } catch {
      // discord recusou; swallow
    }
  }

  async replyEphemeral(content: string | InteractionReplyOptions): Promise<void> {
    const payload =
      typeof content === "string"
        ? { content, flags: 1 << 6 }
        : { ...content, flags: 1 << 6 };
    return this.reply(payload as InteractionReplyOptions);
  }
}
