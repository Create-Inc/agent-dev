import { existsSync } from "node:fs";
import { listSessions, listRepoSessions } from "../session.js";
import { logFile } from "../paths.js";
import { searchLog } from "../logreader.js";
import { getLatestMark } from "../marks.js";
import type { Options } from "../flags.js";

export function search(args: string[], options: Options) {
  if (args.length === 0) {
    console.error("usage: agent-dev search <terms...>");
    process.exit(1);
  }

  const pattern = args.join(" ");
  let sessions = options.all ? listSessions() : listRepoSessions();

  if (options.session) {
    sessions = sessions.filter((s) => s.name === options.session || s.id === options.session);
  }

  if (sessions.length === 0) {
    console.error("no sessions found");
    process.exit(1);
  }

  for (const session of sessions) {
    const log = logFile(session.id);
    if (!existsSync(log)) continue;

    const mark = options.all ? null : getLatestMark(session.id);
    const results = searchLog(log, pattern, mark ? { startByte: mark.byte } : {});

    if (results.length > 0) {
      const label = session.name ?? session.id;
      if (mark) {
        console.log(`--- session ${label} (after mark "${mark.name}") ---`);
      } else {
        console.log(`--- session ${label} (${session.cmd.join(" ")}) ---`);
      }
      for (const { line, num, context } of results) {
        console.log(`  ${num}: ${line}`);
        for (let i = 0; i < context.length; i++) {
          if (context[i].trim()) {
            console.log(`  ${num + i + 1}  ${context[i]}`);
          }
        }
      }
    }
  }
}
