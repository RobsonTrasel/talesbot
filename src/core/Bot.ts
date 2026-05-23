import {
  Client,
  Events,
  GatewayIntentBits,
  PermissionsBitField,
  ChatInputCommandInteraction,
  Message,
  MessageFlags,
} from "discord.js";
import { join } from "node:path";
import { config } from "../config";
import { MusicManager } from "../music/MusicManager";
import { presences, presenceIntervalMs, presenceStatus } from "../presence";
import { CommandContext, CommandServices } from "./CommandContext";
import { CommandRegistry } from "./CommandRegistry";
import { Logger } from "./Logger";
import { PresenceRotator } from "./PresenceRotator";
import { isUserFacing, errorMessage } from "../utils/errors";
import { truncate } from "../utils/duration";

export class Bot {
  private readonly logger = new Logger("bot");
  private readonly client: Client;
  private readonly registry = new CommandRegistry();
  private music!: MusicManager;
  private services!: CommandServices;
  private presenceRotator: PresenceRotator | null = null;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
      ],
    });
  }

  async start(): Promise<void> {
    this.logger.info("Carregando comandos...");
    this.registry.loadDir(join(__dirname, "..", "commands"));
    this.logger.info(`${this.registry.all.length} comando(s) carregado(s)`);

    this.music = new MusicManager(this.client);

    this.client.once(Events.ClientReady, (c) => {
      this.services = {
        client: c,
        music: this.music,
        logger: this.logger,
        registry: this.registry,
      };
      this.logger.info(`Logado como ${c.user.tag} · prefix: ${config.discord.prefix}`);

      const entries = presences.map((p) => ({
        ...p,
        status: p.status ?? presenceStatus,
      }));
      this.presenceRotator = new PresenceRotator(c, entries, presenceIntervalMs);
      this.presenceRotator.start();
    });

    this.attachHandlers();
    this.attachShutdown();

    await this.client.login(config.discord.token);
  }

  private attachHandlers(): void {
    this.client.on(Events.MessageCreate, (m) => this.onMessage(m));
    this.client.on(Events.InteractionCreate, (i) => {
      if (i.isChatInputCommand()) this.onSlash(i);
    });
  }

  private async onMessage(message: Message): Promise<void> {
    if (message.author.bot || !message.inGuild()) return;
    if (!message.content.startsWith(config.discord.prefix)) return;

    const args = message.content.slice(config.discord.prefix.length).trim().split(/\s+/);
    const name = (args.shift() || "").toLowerCase();
    if (!name) return;
    const cmd = this.registry.get(name);
    if (!cmd) return;

    const ctx = new CommandContext(
      { kind: "prefix", message, args },
      this.services,
    );
    await this.runCommand(cmd.name, async () => {
      this.preflightChecks(ctx, cmd);
      await cmd.execute(ctx);
    }, ctx);
  }

  private async onSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const cmd = this.registry.get(interaction.commandName);
    if (!cmd) return;

    const ctx = new CommandContext(
      { kind: "slash", interaction },
      this.services,
    );
    await this.runCommand(cmd.name, async () => {
      this.preflightChecks(ctx, cmd);
      await cmd.execute(ctx);
    }, ctx);
  }

  private preflightChecks(ctx: CommandContext, cmd: import("./Command").Command): void {
    if ((cmd.guildOnly ?? true) && !ctx.guild) {
      throw userErr("Esse comando só funciona em servidor.");
    }
    if (cmd.userPermissions?.length) {
      const member = ctx.member;
      if (!member) throw userErr("Não consegui verificar suas permissões.");
      const missing = cmd.userPermissions.filter(
        (p) => !member.permissions.has(p),
      );
      if (missing.length) {
        throw userErr(
          `Você precisa de: ${missing.map((p) => permName(p)).join(", ")}`,
        );
      }
    }
    if (cmd.botPermissions?.length) {
      const me = ctx.guild?.members.me;
      if (!me) throw userErr("Não consegui verificar minhas permissões.");
      const missing = cmd.botPermissions.filter((p) => !me.permissions.has(p));
      if (missing.length) {
        throw userErr(
          `Eu preciso de: ${missing.map((p) => permName(p)).join(", ")}`,
        );
      }
    }
  }

  private async runCommand(
    name: string,
    fn: () => Promise<void>,
    ctx: CommandContext,
  ): Promise<void> {
    try {
      await fn();
    } catch (err) {
      const userFacing = isUserFacing(err);
      if (!userFacing) this.logger.error(`[${name}]`, err);
      const msg = userFacing
        ? (err as Error).message
        : `Erro inesperado: ${truncate(errorMessage(err), 300)}`;
      await ctx.replyEphemeral(msg).catch(() => {});
    }
  }

  private attachShutdown(): void {
    const shutdown = (signal: string) => {
      this.logger.info(`Recebido ${signal}, encerrando players...`);
      this.presenceRotator?.stop();
      this.music.destroyAll();
      setTimeout(() => process.exit(0), 1000);
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("unhandledRejection", (e) => this.logger.error("unhandledRejection", e));
    process.on("uncaughtException", (e) => this.logger.error("uncaughtException", e));
  }

  get commands(): CommandRegistry {
    return this.registry;
  }
}

function userErr(msg: string): Error {
  const e = new Error(msg) as Error & { userFacing?: boolean };
  e.userFacing = true;
  return e;
}

function permName(p: unknown): string {
  if (typeof p === "bigint" || typeof p === "string") {
    try {
      const flags = new PermissionsBitField(p as bigint).toArray();
      return flags.join("+") || String(p);
    } catch {
      return String(p);
    }
  }
  return String(p);
}
