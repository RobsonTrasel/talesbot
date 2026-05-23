type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS: Record<Level, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};

const RESET = "\x1b[0m";

export class Logger {
  private static globalLevel: Level =
    (process.env.LOG_LEVEL as Level) || "info";

  constructor(private readonly scope: string) {}

  static setLevel(level: Level) {
    Logger.globalLevel = level;
  }

  private should(level: Level): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[Logger.globalLevel];
  }

  private write(level: Level, args: unknown[]) {
    if (!this.should(level)) return;
    const time = new Date().toISOString().slice(11, 23);
    const tag = `${COLORS[level]}${level.toUpperCase().padEnd(5)}${RESET}`;
    const scope = `\x1b[90m[${this.scope}]${RESET}`;
    const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
    stream.write(`${time} ${tag} ${scope} ${args.map((a) => format(a)).join(" ")}\n`);
  }

  debug(...args: unknown[]) {
    this.write("debug", args);
  }
  info(...args: unknown[]) {
    this.write("info", args);
  }
  warn(...args: unknown[]) {
    this.write("warn", args);
  }
  error(...args: unknown[]) {
    this.write("error", args);
  }

  child(subScope: string): Logger {
    return new Logger(`${this.scope}:${subScope}`);
  }
}

function format(v: unknown): string {
  if (v instanceof Error) return v.stack || v.message;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
