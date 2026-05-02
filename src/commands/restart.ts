import { findActiveSession, removeSession, isRunning } from "../session.js";
import { daemonize } from "../daemon.js";

export function restart(_args: string[]) {
  const session = findActiveSession();
  if (!session) {
    console.error("no active session to restart");
    process.exit(1);
  }

  const { cmd, pid, id } = session;

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already dead
  }

  setTimeout(() => {
    if (isRunning(pid)) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // ignore
      }
    }
    removeSession(id);

    const meta = daemonize(cmd);
    console.log(JSON.stringify({ restarted: meta.id, pid: meta.pid, cmd: meta.cmd.join(" ") }));
  }, 500);
}
