import { spawn } from "node:child_process";
import { openSync, mkdirSync } from "node:fs";
import { logFile, sessionDir } from "./paths.js";
import { generateId, saveMeta, type SessionMeta } from "./session.js";
import type { Options } from "./flags.js";

export function daemonize(cmd: string[], options: Options): SessionMeta {
  const id = options.session ?? generateId();
  const dir = sessionDir(id);
  mkdirSync(dir, { recursive: true });

  const log = logFile(id);
  const out = openSync(log, "a");
  const err = openSync(log, "a");

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
  const child = spawn(bin, args, {
    detached: true,
    stdio: ["ignore", out, err],
    cwd: process.cwd(),
  });

  child.unref();

  const meta: SessionMeta = {
    id,
    name: options.session,
    cmd,
    cwd: process.cwd(),
    pid: child.pid!,
    portless: options.portless,
    url,
    startedAt: new Date().toISOString(),
  };

  saveMeta(meta);
  return meta;
}
