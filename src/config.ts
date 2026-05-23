import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variavel de ambiente faltando: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  discord: {
    token: required("DISCORD_TOKEN"),
    clientId: required("CLIENT_ID"),
    guildId: process.env.GUILD_ID || undefined,
    prefix: optional("PREFIX", "!"),
  },
  lavalink: {
    host: optional("LAVALINK_HOST", "127.0.0.1"),
    port: optional("LAVALINK_PORT", "2333"),
    password: optional("LAVALINK_PASSWORD", "youshallnotpass"),
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
    configured: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
  },
  timeouts: {
    idleMs: 5 * 60 * 1000,
    emptyVcMs: 60 * 1000,
    interactionDeferMs: 2500,
  },
  limits: {
    queryMaxLength: 500,
    playlistMaxTracks: 500,
    purgeMaxMessages: 100,
  },
} as const;

export type Config = typeof config;
