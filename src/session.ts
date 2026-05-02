import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { pidFile, metaFile, sessionDir, SESSIONS_DIR } from "./paths.js";
import { randomBytes } from "node:crypto";

export interface SessionMeta {
  id: string;
  cmd: string[];
  cwd: string;
  pid: number;
  startedAt: string;
}

export function generateId(): string {
  return randomBytes(4).toString("hex");
}

export function saveMeta(meta: SessionMeta) {
  mkdirSync(sessionDir(meta.id), { recursive: true });
  writeFileSync(metaFile(meta.id), JSON.stringify(meta, null, 2));
  writeFileSync(pidFile(meta.id), String(meta.pid));
}

export function loadMeta(id: string): SessionMeta | null {
  const path = metaFile(id);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function listSessions(): SessionMeta[] {
  if (!existsSync(SESSIONS_DIR)) return [];
  return readdirSync(SESSIONS_DIR)
    .map((name) => loadMeta(name))
    .filter((m): m is SessionMeta => m !== null);
}

export function removeSession(id: string) {
  const dir = sessionDir(id);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
}

export function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function findActiveSession(): SessionMeta | null {
  const sessions = listSessions();
  for (const s of sessions) {
    if (isRunning(s.pid)) return s;
  }
  return null;
}
