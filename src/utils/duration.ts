export function formatDuration(ms: number | undefined | null): string {
  if (!ms || ms < 0) return "?";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

const UNITS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parseia "10m", "1h30m", "2d" em milissegundos. Retorna null se invalido. */
export function parseDuration(input: string): number | null {
  if (!input) return null;
  const matches = input.toLowerCase().matchAll(/(\d+)\s*([smhd])/g);
  let total = 0;
  let found = false;
  for (const [, num, unit] of matches) {
    found = true;
    total += Number(num) * UNITS[unit];
  }
  return found ? total : null;
}

export function truncate(s: string | undefined | null, n = 100): string {
  if (!s) return "?";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
