import type { KazagumoPlayer } from "kazagumo";

type Timer = ReturnType<typeof setTimeout>;

/**
 * Gerencia timers de idle (pausado/parado) e call vazia por guild.
 */
export class IdleManager {
  private readonly idle = new Map<string, Timer>();
  private readonly emptyVc = new Map<string, Timer>();

  constructor(
    private readonly idleMs: number,
    private readonly emptyVcMs: number,
  ) {}

  armIdle(player: KazagumoPlayer, onExpire: () => void): void {
    this.clearIdle(player.guildId);
    this.idle.set(
      player.guildId,
      setTimeout(onExpire, this.idleMs),
    );
  }

  clearIdle(guildId: string): void {
    const t = this.idle.get(guildId);
    if (t) {
      clearTimeout(t);
      this.idle.delete(guildId);
    }
  }

  armEmptyVc(guildId: string, onExpire: () => void): void {
    if (this.emptyVc.has(guildId)) return; // ja armado
    this.emptyVc.set(guildId, setTimeout(onExpire, this.emptyVcMs));
  }

  clearEmptyVc(guildId: string): void {
    const t = this.emptyVc.get(guildId);
    if (t) {
      clearTimeout(t);
      this.emptyVc.delete(guildId);
    }
  }

  clearAll(guildId: string): void {
    this.clearIdle(guildId);
    this.clearEmptyVc(guildId);
  }
}
