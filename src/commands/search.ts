import { readFileSync, existsSync } from "node:fs";
import { listSessions } from "../session.js";
import { logFile } from "../paths.js";

export function search(args: string[]) {
  if (args.length === 0) {
    console.error("usage: agent-dev search <terms...>");
    process.exit(1);
  }

  const pattern = args.join(" ").toLowerCase();
  const sessions = listSessions();

  if (sessions.length === 0) {
    console.error("no sessions found");
    process.exit(1);
  }

  for (const session of sessions) {
    const log = logFile(session.id);
    if (!existsSync(log)) continue;

    const content = readFileSync(log, "utf-8");
    const lines = content.split("\n");
    const matches = lines
      .map((line, i) => ({ line, num: i + 1 }))
      .filter(({ line }) => line.toLowerCase().includes(pattern));

    if (matches.length > 0) {
      console.log(`--- session ${session.id} (${session.cmd.join(" ")}) ---`);
      for (const { line, num } of matches) {
        console.log(`  ${num}: ${line}`);
      }
    }
  }
}
