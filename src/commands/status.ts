import { listSessions, isRunning } from "../session.js";
import type { Options } from "../flags.js";

export function status(_args: string[], options: Options) {
  let sessions = listSessions();

  if (options.session) {
    sessions = sessions.filter((s) => s.name === options.session || s.id === options.session);
  }

  if (sessions.length === 0) {
    console.log("no sessions");
    return;
  }

  for (const s of sessions) {
    const alive = isRunning(s.pid);
    const out: Record<string, unknown> = {
      session: s.id,
      pid: s.pid,
      running: alive,
      cmd: s.cmd.join(" "),
      cwd: s.cwd,
      started: s.startedAt,
    };
    if (s.name) out.name = s.name;
    if (s.url) out.url = s.url;
    console.log(JSON.stringify(out));
  }
}
