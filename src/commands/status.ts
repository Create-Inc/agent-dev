import { listSessions, isRunning } from "../session.js";

export function status(_args: string[]) {
  const sessions = listSessions();

  if (sessions.length === 0) {
    console.log("no sessions");
    return;
  }

  for (const s of sessions) {
    const alive = isRunning(s.pid);
    console.log(JSON.stringify({
      session: s.id,
      pid: s.pid,
      running: alive,
      cmd: s.cmd.join(" "),
      cwd: s.cwd,
      started: s.startedAt,
    }));
  }
}
