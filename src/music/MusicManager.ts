import {
  Client,
  Events,
  PermissionFlagsBits,
  VoiceState,
} from "discord.js";
import { Kazagumo, KazagumoPlayer, KazagumoTrack } from "kazagumo";
import { Connectors } from "shoukaku";
import { config } from "../config";
import { Logger } from "../core/Logger";
import * as E from "../ui/embeds";
import { IdleManager } from "./IdleManager";

export class MusicManager {
  private readonly logger = new Logger("music");
  readonly kazagumo: Kazagumo;
  private readonly idle = new IdleManager(
    config.timeouts.idleMs,
    config.timeouts.emptyVcMs,
  );

  constructor(private readonly client: Client) {
    this.kazagumo = new Kazagumo(
      {
        defaultSearchEngine: "youtube",
        defaultSource: "ytmsearch:",
        send: (guildId, payload) => {
          const guild = client.guilds.cache.get(guildId);
          if (guild) guild.shard.send(payload);
        },
      },
      new Connectors.DiscordJS(client),
      [
        {
          name: "main",
          url: `${config.lavalink.host}:${config.lavalink.port}`,
          auth: config.lavalink.password,
          secure: false,
        },
      ],
    );

    this.attachNodeEvents();
    this.attachPlayerEvents();
    this.attachVoiceTracking();
    this.patchCreatePlayerForPauseIdle();
  }

  async search(query: string, opts: { requester: unknown; isUrl: boolean }) {
    const result = await this.kazagumo.search(query, { requester: opts.requester });
    if (!opts.isUrl && !result?.tracks?.length) {
      this.logger.warn(`YT Music vazio pra "${query}", tentando YouTube`);
      return this.kazagumo.search(query, {
        source: "ytsearch:",
        requester: opts.requester,
      });
    }
    return result;
  }

  getPlayer(guildId: string): KazagumoPlayer | undefined {
    return this.kazagumo.players.get(guildId);
  }

  async createPlayer(opts: {
    guildId: string;
    voiceId: string;
    textId: string;
  }): Promise<KazagumoPlayer> {
    return this.kazagumo.createPlayer({
      guildId: opts.guildId,
      voiceId: opts.voiceId,
      textId: opts.textId,
      deaf: true,
    });
  }

  destroy(guildId: string): void {
    const player = this.getPlayer(guildId);
    if (!player) return;
    this.idle.clearAll(guildId);
    try {
      player.destroy();
    } catch (e) {
      this.logger.warn(`erro destruindo player ${guildId}`, e);
    }
  }

  destroyAll(): void {
    for (const p of this.kazagumo.players.values()) {
      this.destroy(p.guildId);
    }
  }

  // ---- internals ----

  private sendText(player: KazagumoPlayer, payload: unknown): void {
    if (!player.textId) return;
    const ch = this.client.channels.cache.get(player.textId);
    if (!ch || !ch.isTextBased() || ch.isDMBased()) return;
    (ch as { send: (p: unknown) => Promise<unknown> })
      .send(payload as object)
      .catch((e: unknown) => this.logger.debug("send falhou", e));
  }

  private sendEmbed(player: KazagumoPlayer, embed: unknown): void {
    this.sendText(player, { embeds: [embed] });
  }

  private attachNodeEvents(): void {
    this.kazagumo.shoukaku.on("ready", (name) =>
      this.logger.info(`node "${name}" conectado`),
    );
    this.kazagumo.shoukaku.on("error", (name, error) =>
      this.logger.error(`node "${name}" erro:`, error?.message || error),
    );
    this.kazagumo.shoukaku.on("close", (name, code, reason) =>
      this.logger.warn(`node "${name}" fechado (${code}) ${reason || ""}`),
    );
    this.kazagumo.shoukaku.on("disconnect", (name) => {
      this.logger.warn(`node "${name}" desconectado, destruindo players`);
      this.destroyAll();
    });
  }

  private attachPlayerEvents(): void {
    this.kazagumo.on("playerStart", (player, track) => {
      this.idle.clearIdle(player.guildId);
      this.sendEmbed(player, E.nowPlaying(track, player));
    });

    this.kazagumo.on("playerEmpty", (player) => {
      this.sendEmbed(player, E.muted("Fila terminada", "Saindo da call."));
      this.destroy(player.guildId);
    });

    this.kazagumo.on("playerException", (player, data) => {
      const msg =
        (data as { exception?: { message?: string } })?.exception?.message ||
        (data as { error?: string })?.error ||
        "desconhecido";
      this.logger.error("exception:", msg);
      this.sendEmbed(
        player,
        E.fail("Falha tocando faixa", `${truncate(msg, 200)}\nPulando.`),
      );
      this.skipOrDestroy(player);
    });

    this.kazagumo.on("playerStuck", (player, data) => {
      this.logger.warn("stuck", data);
      this.sendEmbed(
        player,
        E.warn("Travou", "Buffer parou. Pulando pra próxima."),
      );
      this.skipOrDestroy(player);
    });

    this.kazagumo.on("playerDestroy", (player) => {
      this.idle.clearAll(player.guildId);
    });
  }

  private skipOrDestroy(player: KazagumoPlayer): void {
    try {
      if (player.queue.size > 0) {
        void player.skip();
      } else {
        this.destroy(player.guildId);
      }
    } catch (e) {
      this.logger.error("falha skip:", e);
      this.destroy(player.guildId);
    }
  }

  private attachVoiceTracking(): void {
    this.client.on(Events.VoiceStateUpdate, (oldS, newS) => {
      this.onVoiceStateUpdate(oldS, newS);
    });
  }

  private onVoiceStateUpdate(oldS: VoiceState, newS: VoiceState): void {
    const guildId = newS.guild.id;
    const player = this.getPlayer(guildId);
    if (!player) return;

    // bot mudou de estado
    if (newS.id === this.client.user?.id) {
      if (!newS.channelId) {
        this.logger.info(`bot removido da call em ${guildId}, destruindo`);
        this.destroy(guildId);
        return;
      }
      if (newS.channelId !== player.voiceId) {
        player.voiceId = newS.channelId;
      }
      return;
    }

    // alguem entrou/saiu - checa se call ficou vazia
    if (!player.voiceId) return;
    const botVcId = player.voiceId;
    const botVC = newS.guild.channels.cache.get(botVcId);
    if (!botVC || !("members" in botVC)) return;
    const memberMap = (botVC as { members: Map<string, { user: { bot: boolean } }> }).members;
    let humans = 0;
    for (const m of memberMap.values()) if (!m.user.bot) humans++;
    if (humans === 0) {
      this.idle.armEmptyVc(guildId, () => {
        const current = this.getPlayer(guildId);
        if (current !== player) return;
        const ch = newS.guild.channels.cache.get(botVcId);
        const stillEmpty = ch && "members" in ch
          ? Array.from(
              (ch as { members: Map<string, { user: { bot: boolean } }> }).members.values(),
            ).every((m) => m.user.bot)
          : true;
        if (stillEmpty) {
          this.sendEmbed(player, E.muted("Call vazia", "Ninguém na call. Saindo."));
          this.destroy(guildId);
        }
      });
    } else {
      this.idle.clearEmptyVc(guildId);
    }
  }

  /** Intercepta player.pause() pra armar/limpar idle timer. */
  private patchCreatePlayerForPauseIdle(): void {
    const orig = this.kazagumo.createPlayer.bind(this.kazagumo);
    this.kazagumo.createPlayer = async (opts) => {
      const player = await orig(opts);
      const origPause = player.pause.bind(player);
      player.pause = (state: boolean) => {
        const ret = origPause(state);
        if (state) {
          this.idle.armIdle(player, () => {
            this.sendEmbed(
              player,
              E.muted("Inativo", "Sem atividade por muito tempo. Saindo."),
            );
            this.destroy(player.guildId);
          });
        } else {
          this.idle.clearIdle(player.guildId);
        }
        return ret;
      };
      return player;
    };
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
