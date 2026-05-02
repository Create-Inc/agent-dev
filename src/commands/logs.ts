import { existsSync } from "node:fs";
import { findSession } from "../session.js";
import { logFile } from "../paths.js";
import { streamAll, readTailLines, readHeadLines } from "../logreader.js";
import type { Options } from "../flags.js";

function resolveLog(options: Options): string {
  const session = findSession(options.session);
  if (!session) {
    console.error(options.session ? `no active session "${options.session}"` : "no active session");
    process.exit(1);
  }

  const path = logFile(session.id);
  if (!existsSync(path)) {
    console.error("log file not found");
    process.exit(1);
  }

  return path;
}

export function logs(_args: string[], options: Options) {
  streamAll(resolveLog(options));
}

export function tail(args: string[], options: Options) {
  const n = parseInt(args[0]) || 50;
  const lines = readTailLines(resolveLog(options), n);
  for (const line of lines) {
    console.log(line);
  }
}

export async function head(args: string[], options: Options) {
  const n = parseInt(args[0]) || 50;
  const lines = await readHeadLines(resolveLog(options), n);
  for (const line of lines) {
    console.log(line);
  }
}
