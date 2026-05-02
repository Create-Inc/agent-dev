import { homedir } from "node:os";
import { join } from "node:path";

export const STATE_DIR = join(homedir(), ".agent-dev");
export const SESSIONS_DIR = join(STATE_DIR, "sessions");

export function sessionDir(id: string) {
  return join(SESSIONS_DIR, id);
}

export function pidFile(id: string) {
  return join(sessionDir(id), "pid");
}

export function logFile(id: string) {
  return join(sessionDir(id), "out.log");
}

export function metaFile(id: string) {
  return join(sessionDir(id), "meta.json");
}
