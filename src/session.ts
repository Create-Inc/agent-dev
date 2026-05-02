import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pidFile, metaFile, sessionDir, SESSIONS_DIR } from "./paths.js";
import { randomBytes } from "node:crypto";

export interface SessionMeta {
  id: string;
  name: string | null;
  cmd: string[];
  cwd: string;
  pid: number;
  portless: boolean;
  url: string | null;
  startedAt: string;
}

export function generateId(): string {
  return randomBytes(4).toString("hex");
}

function getGitRoot(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function getProjectRoot(): string {
  return getGitRoot() ?? process.cwd();
}

export function defaultSessionId(): string {
  const root = getGitRoot();
  if (root) {
    try {
      const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      const hash = createHash("sha256").update(`${root}:${branch}`).digest("hex").slice(0, 8);
      const repoName = root.split("/").pop() ?? "repo";
      return `${repoName}-${branch}-${hash}`;
    } catch {
      // fall through
    }
  }

  // non-git: hash the cwd for a stable session id
  const cwd = process.cwd();
  const hash = createHash("sha256").update(cwd).digest("hex").slice(0, 8);
  const dirName = cwd.split("/").pop() ?? "project";
  return `${dirName}-${hash}`;
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
  const all = readdirSync(SESSIONS_DIR)
    .map((name) => loadMeta(name))
    .filter((m): m is SessionMeta => m !== null);

  // auto-prune dead sessions
  const alive: SessionMeta[] = [];
  for (const s of all) {
    if (isRunning(s.pid)) {
      alive.push(s);
    } else {
      removeSession(s.id);
    }
  }
  return alive;
}

export function removeSession(id: string) {
  const dir = sessionDir(id);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
}

export function killProcessGroup(pid: number, signal: NodeJS.Signals = "SIGTERM") {
  try { process.kill(-pid, signal); } catch {}
  try { process.kill(pid, signal); } catch {}
}

export function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function listRepoSessions(): SessionMeta[] {
  return listSessions().filter((s) => isSameRepo(s.cwd));
}

function isSameRepo(sessionCwd: string): boolean {
  const root = getProjectRoot();
  return sessionCwd.startsWith(root);
}

export function findSession(name: string | null): SessionMeta | null {
  const sessions = listSessions();
  if (name) {
    return sessions.find((s) => s.name === name || s.id === name) ?? null;
  }
  // without --session, scope to current repo
  for (const s of sessions) {
    if (isSameRepo(s.cwd)) return s;
  }
  return null;
}

export function findActiveSession(): SessionMeta | null {
  return findSession(null);
}
