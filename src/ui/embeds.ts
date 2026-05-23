import { EmbedBuilder } from "discord.js";
import type { KazagumoPlayer, KazagumoTrack } from "kazagumo";
import { formatDuration, truncate } from "../utils/duration";

export const COLOR = {
  primary: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
  muted: 0x4f545c,
  spotify: 0x1db954,
  youtube: 0xff0000,
  youtubeMusic: 0xff0000,
  soundcloud: 0xff5500,
} as const;

export function sourceColor(track: KazagumoTrack | undefined): number {
  const src = (track?.sourceName || "").toLowerCase();
  if (src.includes("spotify")) return COLOR.spotify;
  if (src.includes("soundcloud")) return COLOR.soundcloud;
  if (src.includes("youtube")) return COLOR.youtube;
  return COLOR.primary;
}

export function sourceLabel(track: KazagumoTrack | undefined): string {
  const src = (track?.sourceName || "").toLowerCase();
  if (!src) return "—";
  if (src.includes("youtube_music")) return "YouTube Music";
  if (src.includes("youtube")) return "YouTube";
  if (src.includes("spotify")) return "Spotify";
  if (src.includes("soundcloud")) return "SoundCloud";
  if (src.includes("twitch")) return "Twitch";
  if (src.includes("bandcamp")) return "Bandcamp";
  if (src.includes("vimeo")) return "Vimeo";
  if (src.includes("http")) return "HTTP";
  return src.charAt(0).toUpperCase() + src.slice(1);
}

function thumbnailOf(track: KazagumoTrack): string | null {
  const t = track as KazagumoTrack & { artworkUrl?: string };
  if (t.thumbnail) return t.thumbnail;
  if (t.artworkUrl) return t.artworkUrl;
  if (t.identifier && (t.sourceName || "").includes("youtube")) {
    return `https://i.ytimg.com/vi/${t.identifier}/hqdefault.jpg`;
  }
  return null;
}

function requesterMention(track: KazagumoTrack): string {
  const r = (track as KazagumoTrack & { requester?: { id?: string } | string }).requester;
  if (!r) return "—";
  if (typeof r === "string") return `<@${r}>`;
  if (r.id) return `<@${r.id}>`;
  return "—";
}

export function nowPlaying(track: KazagumoTrack, player: KazagumoPlayer): EmbedBuilder {
  const e = new EmbedBuilder()
    .setColor(sourceColor(track))
    .setAuthor({ name: "Tocando agora" })
    .setTitle(truncate(track.title || "desconhecido", 240))
    .setDescription(`por **${truncate(track.author || "desconhecido", 100)}**`)
    .addFields(
      {
        name: "Duração",
        value: track.isStream ? "`AO VIVO`" : `\`${formatDuration(track.length)}\``,
        inline: true,
      },
      { name: "Fonte", value: sourceLabel(track), inline: true },
      { name: "Pedido por", value: requesterMention(track), inline: true },
    )
    .setFooter({
      text:
        player.queue.size > 0
          ? `${player.queue.size} faixa(s) na fila`
          : "Última da fila",
    });
  if (track.uri) e.setURL(track.uri);
  const art = thumbnailOf(track);
  if (art) e.setThumbnail(art);
  return e;
}

export function addedTrack(track: KazagumoTrack, player: KazagumoPlayer): EmbedBuilder {
  const position = player.queue.size;
  const e = new EmbedBuilder()
    .setColor(sourceColor(track))
    .setAuthor({ name: "Adicionado à fila" })
    .setTitle(truncate(track.title || "desconhecido", 240))
    .setDescription(`por **${truncate(track.author || "desconhecido", 100)}**`)
    .addFields(
      {
        name: "Duração",
        value: track.isStream ? "`AO VIVO`" : `\`${formatDuration(track.length)}\``,
        inline: true,
      },
      {
        name: "Posição",
        value: position > 0 ? `\`#${position}\`` : "`tocando agora`",
        inline: true,
      },
      { name: "Fonte", value: sourceLabel(track), inline: true },
    );
  if (track.uri) e.setURL(track.uri);
  const art = thumbnailOf(track);
  if (art) e.setThumbnail(art);
  return e;
}

export function addedPlaylist(name: string | undefined, tracks: KazagumoTrack[]): EmbedBuilder {
  const total = tracks.reduce((s, t) => s + (t.length || 0), 0);
  return new EmbedBuilder()
    .setColor(COLOR.primary)
    .setAuthor({ name: "Playlist adicionada" })
    .setTitle(truncate(name || "playlist", 240))
    .addFields(
      { name: "Faixas", value: `\`${tracks.length}\``, inline: true },
      { name: "Duração total", value: `\`${formatDuration(total)}\``, inline: true },
    );
}

export function queueList(player: KazagumoPlayer): EmbedBuilder {
  const current = player.queue.current;
  const upcoming = Array.from(player.queue).slice(0, 10);

  let desc = "";
  if (current) {
    desc +=
      `**Tocando agora**\n` +
      `[${truncate(current.title, 70)}](${current.uri || ""}) — \`${current.isStream ? "AO VIVO" : formatDuration(current.length)}\`\n\n`;
  }
  if (upcoming.length) {
    desc += "**Próximas**\n";
    desc += upcoming
      .map(
        (t, i) =>
          `\`${String(i + 1).padStart(2, " ")}\` [${truncate(t.title, 60)}](${t.uri || ""}) — \`${t.isStream ? "AO VIVO" : formatDuration(t.length)}\``,
      )
      .join("\n");
  } else if (current) {
    desc += "_Sem mais faixas na fila._";
  } else {
    desc = "_Fila vazia._";
  }
  if (player.queue.size > 10) {
    desc += `\n\n_…e mais ${player.queue.size - 10} faixa(s)._`;
  }
  desc = desc.slice(0, 4000);

  const total = player.queue.size + (current ? 1 : 0);
  const totalDur =
    (current?.length || 0) +
    Array.from(player.queue).reduce((s, t) => s + (t.length || 0), 0);

  return new EmbedBuilder()
    .setColor(COLOR.primary)
    .setAuthor({ name: "Fila" })
    .setDescription(desc)
    .setFooter({
      text: `${total} faixa(s) · ${formatDuration(totalDur)} no total · Loop: ${player.loop}`,
    });
}

function status(title: string, description: string | null, color: number): EmbedBuilder {
  const e = new EmbedBuilder().setColor(color).setAuthor({ name: title });
  if (description) e.setDescription(description);
  return e;
}

export const ok = (title: string, desc: string | null = null) => status(title, desc, COLOR.success);
export const warn = (title: string, desc: string | null = null) => status(title, desc, COLOR.warning);
export const fail = (title: string, desc: string | null = null) => status(title, desc, COLOR.danger);
export const muted = (title: string, desc: string | null = null) => status(title, desc, COLOR.muted);
export const info = (title: string, desc: string | null = null) => status(title, desc, COLOR.primary);
