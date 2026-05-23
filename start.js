require("dotenv").config();
const { spawn } = require("node:child_process");
const path = require("node:path");

const MAX_RESTARTS = 5;
const RESTART_WINDOW_MS = 60_000; // janela em que contamos restarts
const RESTART_DELAY_MS = 5_000;

const services = new Map(); // name -> { cmd, args, opts, restarts: [], child }

let shuttingDown = false;

function pipeStream(stream, prefix, onLine) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      process.stdout.write(`${prefix} ${line}\n`);
      if (onLine) onLine(line);
    }
  });
  stream.on("end", () => {
    if (buffer) process.stdout.write(`${prefix} ${buffer}\n`);
  });
}

function spawnService(name) {
  const svc = services.get(name);
  if (!svc) return null;
  const child = spawn(svc.cmd, svc.args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    ...svc.opts,
  });
  svc.child = child;
  const prefix = `[${name}]`;
  pipeStream(child.stdout, prefix, svc.onLine);
  pipeStream(child.stderr, prefix, svc.onLine);

  child.on("error", (e) => {
    console.error(`${prefix} erro ao iniciar:`, e.message);
    handleExit(name, -1);
  });
  child.on("exit", (code, signal) => {
    console.log(
      `${prefix} encerrou (code=${code}${signal ? `, signal=${signal}` : ""})`,
    );
    handleExit(name, code);
  });

  return child;
}

function handleExit(name, code) {
  if (shuttingDown) return;
  const svc = services.get(name);
  if (!svc) return;

  const now = Date.now();
  svc.restarts = svc.restarts.filter((t) => now - t < RESTART_WINDOW_MS);
  svc.restarts.push(now);

  if (svc.restarts.length > MAX_RESTARTS) {
    console.error(
      `[start] ${name} crashou ${MAX_RESTARTS}+ vezes em ${RESTART_WINDOW_MS / 1000}s. Desistindo.`,
    );
    return shutdown(1);
  }

  console.log(
    `[start] reiniciando ${name} em ${RESTART_DELAY_MS / 1000}s (tentativa ${svc.restarts.length}/${MAX_RESTARTS})...`,
  );
  setTimeout(() => {
    if (!shuttingDown) spawnService(name);
  }, RESTART_DELAY_MS);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const [name, svc] of services) {
    const c = svc.child;
    if (c && !c.killed) {
      console.log(`[start] encerrando ${name}...`);
      try {
        c.kill("SIGTERM");
      } catch {}
    }
  }
  setTimeout(() => process.exit(exitCode), 1500);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("uncaughtException", (e) => {
  console.error("[start] uncaughtException:", e);
  shutdown(1);
});

const lavalinkEnv = {
  ...process.env,
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || "",
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || "",
  LAVALINK_PASSWORD: process.env.LAVALINK_PASSWORD || "youshallnotpass",
};

console.log("[start] iniciando Lavalink...");

const ready = new Promise((resolve, reject) => {
  const timeoutMs = 120_000;
  const timer = setTimeout(
    () => reject(new Error(`Lavalink nao ficou pronto em ${timeoutMs / 1000}s`)),
    timeoutMs,
  );
  services.set("lavalink", {
    cmd: "java",
    args: ["-jar", "Lavalink.jar"],
    opts: {
      cwd: path.join(__dirname, "lavalink"),
      env: lavalinkEnv,
    },
    onLine: (line) => {
      if (line.includes("Lavalink is ready to accept connections")) {
        clearTimeout(timer);
        resolve();
      }
    },
    restarts: [],
    child: null,
  });
  spawnService("lavalink");
});

ready
  .then(() => {
    console.log("[start] Lavalink pronto, subindo bot...");
    services.set("bot", {
      cmd: process.execPath,
      args: [path.join(__dirname, "dist", "index.js")],
      opts: {},
      onLine: null,
      restarts: [],
      child: null,
    });
    spawnService("bot");
  })
  .catch((e) => {
    console.error("[start]", e.message);
    shutdown(1);
  });
