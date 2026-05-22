import { spawn } from "node:child_process";
import { openSync, createWriteStream, mkdirSync } from "node:fs";
import { logFile, sessionDir } from "./paths.js";
import { defaultSessionId, saveMeta, type SessionMeta } from "./session.js";
import type { Options } from "./flags.js";

export function daemonize(cmd: string[], options: Options): SessionMeta {
  const id = options.session ?? defaultSessionId();
  const dir = sessionDir(id);
  mkdirSync(dir, { recursive: true });

  const log = logFile(id);

  let spawnCmd: string[];
  let url: string | null = null;

  if (options.portless) {
    const name = options.session ?? id;
    spawnCmd = ["portless", name, ...cmd];
    url = `https://${name}.localhost`;
  } else {
    spawnCmd = cmd;
  }

  const [bin, ...args] = spawnCmd;

  if (options.attach) {
    return spawnAttached(bin, args, { id, cmd, log, url, options });
  }

  return spawnDetached(bin, args, { id, cmd, log, url, options });
}

function spawnDetached(
  bin: string,
  args: string[],
  ctx: { id: string; cmd: string[]; log: string; url: string | null; options: Options }
): SessionMeta {
  const out = openSync(ctx.log, "a");
  const err = openSync(ctx.log, "a");

  const env = Object.keys(ctx.options.env).length > 0
    ? { ...process.env, ...ctx.options.env }
    : undefined;

  const child = spawn(bin, args, {
    detached: true,
    stdio: ["ignore", out, err],
    cwd: process.cwd(),
    env,
  });

  child.unref();

  const meta: SessionMeta = {
    id: ctx.id,
    name: ctx.options.session,
    cmd: ctx.cmd,
    cwd: process.cwd(),
    pid: child.pid!,
    portless: ctx.options.portless,
    url: ctx.url,
    env: ctx.options.env,
    startedAt: new Date().toISOString(),
  };

  saveMeta(meta);
  return meta;
}

function spawnAttached(
  bin: string,
  args: string[],
  ctx: { id: string; cmd: string[]; log: string; url: string | null; options: Options }
): SessionMeta {
  const logStream = createWriteStream(ctx.log, { flags: "a" });

  const env = Object.keys(ctx.options.env).length > 0
    ? { ...process.env, ...ctx.options.env }
    : undefined;

  const child = spawn(bin, args, {
    stdio: ["inherit", "pipe", "pipe"],
    cwd: process.cwd(),
    env,
  });

  // tee stdout and stderr to both terminal and log file
  child.stdout!.on("data", (chunk: Buffer) => {
    process.stdout.write(chunk);
    logStream.write(chunk);
  });
  child.stderr!.on("data", (chunk: Buffer) => {
    process.stderr.write(chunk);
    logStream.write(chunk);
  });

  const meta: SessionMeta = {
    id: ctx.id,
    name: ctx.options.session,
    cmd: ctx.cmd,
    cwd: process.cwd(),
    pid: child.pid!,
    portless: ctx.options.portless,
    url: ctx.url,
    env: ctx.options.env,
    startedAt: new Date().toISOString(),
  };

  saveMeta(meta);

  child.on("close", (code) => {
    logStream.end();
    process.exit(code ?? 0);
  });

  // forward signals to child
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => child.kill(sig));
  }

  return meta;
}
