import { findActiveSession } from "../session.js";
import { daemonize } from "../daemon.js";

export function run(args: string[]) {
  if (args.length === 0) {
    console.error("usage: agent-dev run <command> [args...]");
    process.exit(1);
  }

  const existing = findActiveSession();
  if (existing) {
    console.error(`session ${existing.id} already running (pid ${existing.pid})`);
    console.error("run 'agent-dev stop' first, or use 'agent-dev restart'");
    process.exit(1);
  }

  const meta = daemonize(args);
  console.log(JSON.stringify({ session: meta.id, pid: meta.pid, cmd: meta.cmd.join(" ") }));
}
