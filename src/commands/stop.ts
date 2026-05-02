import { findActiveSession, removeSession, isRunning } from "../session.js";

export function stop(_args: string[]) {
  const session = findActiveSession();
  if (!session) {
    console.error("no active session");
    process.exit(1);
  }

  try {
    process.kill(session.pid, "SIGTERM");
  } catch {
    // already dead
  }

  // give it a moment, then force kill
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
