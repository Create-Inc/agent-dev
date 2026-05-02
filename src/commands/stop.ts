import { findSession, removeSession, isRunning, killProcessGroup } from "../session.js";
import type { Options } from "../flags.js";

export function stop(_args: string[], options: Options) {
  const session = findSession(options.session);
  if (!session) {
    console.error(options.session ? `no active session "${options.session}"` : "no active session");
    process.exit(1);
  }

  killProcessGroup(session.pid, "SIGTERM");

  setTimeout(() => {
    if (isRunning(session.pid)) {
      killProcessGroup(session.pid, "SIGKILL");
    }
    removeSession(session.id);
    console.log(JSON.stringify({ stopped: session.id, pid: session.pid }));
  }, 1000);
}
