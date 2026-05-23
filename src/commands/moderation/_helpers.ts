import type { GuildMember } from "discord.js";
import { UserFacingError } from "../../utils/errors";
import type { CommandContext } from "../../core/CommandContext";

export function getTargetMember(ctx: CommandContext, optionName = "user"): GuildMember {
  const target = ctx.user(optionName);
  if (!target) throw new UserFacingError(`Usuário inválido. Mencione ou use ID.`);
  return target;
}

/**
 * Garante hierarquia: o autor da ação tem cargo > alvo, e o bot tem cargo > alvo.
 */
export function ensureHierarchy(
  ctx: CommandContext,
  target: GuildMember,
  action: string,
): void {
  const author = ctx.member;
  const me = ctx.guild?.members.me;
  if (!author || !me) throw new UserFacingError("Falha ao validar hierarquia.");

  if (target.id === author.id) {
    throw new UserFacingError(`Você não pode se ${action} sozinho.`);
  }
  if (target.id === me.id) {
    throw new UserFacingError(`Você quer me ${action}? :(`);
  }
  if (target.id === ctx.guild?.ownerId) {
    throw new UserFacingError(`Não dá pra ${action} o dono do servidor.`);
  }
  if (
    author.id !== ctx.guild?.ownerId &&
    author.roles.highest.comparePositionTo(target.roles.highest) <= 0
  ) {
    throw new UserFacingError(
      `Seu cargo precisa ser maior que o do alvo pra ${action}.`,
    );
  }
  if (me.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    throw new UserFacingError(
      `Meu cargo precisa ser maior que o do alvo pra ${action}.`,
    );
  }
}
