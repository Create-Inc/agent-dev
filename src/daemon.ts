import { spawn } from "node:child_process";
import { openSync, mkdirSync } from "node:fs";
import { logFile, sessionDir } from "./paths.js";
import { generateId, saveMeta, type SessionMeta } from "./session.js";

export function daemonize(cmd: string[]): SessionMeta {
  const id = generateId();
  const dir = sessionDir(id);
  mkdirSync(dir, { recursive: true });

  const log = logFile(id);
  const out = openSync(log, "a");
  const err = openSync(log, "a");

  const [bin, ...args] = cmd;
  const child = spawn(bin, args, {
    detached: true,
    stdio: ["ignore", out, err],
    cwd: process.cwd(),
  });

  child.unref();

  const meta: SessionMeta = {
    id,
    cmd,
    cwd: process.cwd(),
    pid: child.pid!,
    startedAt: new Date().toISOString(),
  };

  saveMeta(meta);
  return meta;
}
