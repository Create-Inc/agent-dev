import { existsSync } from "node:fs";
import { findSession } from "../session.js";
import { logFile } from "../paths.js";
import type { Options } from "../flags.js";

export function logs(_args: string[], options: Options) {
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

  console.log(JSON.stringify({ session: session.id, log: path }));
}
