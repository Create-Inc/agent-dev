import { findSession, removeSession, isRunning } from "../session.js";
import type { Options } from "../flags.js";

export function stop(_args: string[], options: Options) {
  const session = findSession(options.session);
  if (!session) {
    console.error(options.session ? `no active session "${options.session}"` : "no active session");
    process.exit(1);
  }

  try {
    process.kill(session.pid, "SIGTERM");
  } catch {
    // already dead
  }

  setTimeout(() => {
    if (isRunning(session.pid)) {
      try {
        process.kill(session.pid, "SIGKILL");
      } catch {
        // ignore
      }
    }
    removeSession(session.id);
    console.log(JSON.stringify({ stopped: session.id, pid: session.pid }));
  }, 500);
}
