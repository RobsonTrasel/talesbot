export class UserFacingError extends Error {
  readonly userFacing = true as const;
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export function isUserFacing(e: unknown): e is UserFacingError {
  return e instanceof Error && (e as { userFacing?: boolean }).userFacing === true;
}

export function errorMessage(e: unknown, maxLen = 300): string {
  if (e instanceof Error) return e.message.slice(0, maxLen);
  if (typeof e === "string") return e.slice(0, maxLen);
  return "Erro desconhecido";
}
