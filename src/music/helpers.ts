import type { KazagumoPlayer } from "kazagumo";
import type { VoiceBasedChannel } from "discord.js";
import { UserFacingError } from "../utils/errors";
import type { CommandContext } from "../core/CommandContext";

export function getVoiceChannel(ctx: CommandContext): VoiceBasedChannel {
  const channel = ctx.member?.voice.channel;
  if (!channel) {
    throw new UserFacingError("Você precisa estar em um canal de voz primeiro.");
  }
  return channel;
}

export function requirePlayer(
  ctx: CommandContext,
  opts: { sameVC?: boolean } = {},
): KazagumoPlayer {
  const sameVC = opts.sameVC ?? true;
  if (!ctx.guildId) throw new UserFacingError("Só em servidor.");
  const player = ctx.music.getPlayer(ctx.guildId);
  if (!player) throw new UserFacingError("Não tem nada tocando.");
  if (sameVC) {
    const userVc = ctx.member?.voice.channelId;
    if (!userVc) {
      throw new UserFacingError("Você precisa estar em um canal de voz.");
    }
    if (userVc !== player.voiceId) {
      throw new UserFacingError(
        "Entra na mesma call que o bot pra usar esse comando.",
      );
    }
  }
  return player;
}

export function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}
