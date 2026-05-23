import { ActivityType, Client, PresenceStatusData } from "discord.js";
import { Logger } from "./Logger";

export interface PresenceEntry {
  /**
   * Tipo da atividade:
   *  - Playing      => "Jogando <texto>"
   *  - Listening    => "Ouvindo <texto>"
   *  - Watching     => "Assistindo a <texto>"
   *  - Competing    => "Competindo em <texto>"
   *  - Custom       => so o texto, sem prefixo
   *  - Streaming    => "Transmitindo <texto>" (precisa url do Twitch/YouTube)
   */
  type: ActivityType;
  /** Texto da atividade. Suporta variaveis: {servers} {users} {ping} {commands}. */
  name: string;
  /** Status do bot: 'online' | 'idle' | 'dnd' | 'invisible'. Default 'online'. */
  status?: PresenceStatusData;
  /** Necessario se type === Streaming. */
  url?: string;
}

export class PresenceRotator {
  private readonly logger = new Logger("presence");
  private timer: NodeJS.Timeout | null = null;
  private index = 0;
  private started = false;

  constructor(
    private readonly client: Client<true>,
    private readonly entries: readonly PresenceEntry[],
    private readonly intervalMs: number,
  ) {}

  start(): void {
    if (this.started) return;
    if (!this.entries.length) {
      this.logger.warn("Sem presences configuradas, rotador desligado");
      return;
    }
    this.started = true;
    this.tick();
    if (this.entries.length > 1) {
      this.timer = setInterval(() => this.tick(), this.intervalMs);
    }
    this.logger.info(
      `Rotacionando ${this.entries.length} presence(s) a cada ${Math.round(this.intervalMs / 1000)}s`,
    );
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.started = false;
  }

  private tick(): void {
    const entry = this.entries[this.index];
    if (!entry) return;
    this.index = (this.index + 1) % this.entries.length;

    try {
      this.client.user.setPresence({
        status: entry.status || "online",
        activities: [
          {
            name: this.format(entry.name),
            type: entry.type,
            ...(entry.url ? { url: entry.url } : {}),
          },
        ],
      });
    } catch (e) {
      this.logger.warn("falha ao setar presence", e);
    }
  }

  private format(text: string): string {
    const guilds = this.client.guilds.cache.size;
    const users = this.client.guilds.cache.reduce(
      (sum, g) => sum + (g.memberCount || 0),
      0,
    );
    const ping = this.client.ws.ping;
    return text
      .replace(/\{servers\}/g, String(guilds))
      .replace(/\{users\}/g, String(users))
      .replace(/\{ping\}/g, String(ping));
  }
}
