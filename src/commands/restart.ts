import { findSession, removeSession, isRunning, killProcessGroup } from "../session.js";
import { daemonize } from "../daemon.js";
import type { Options } from "../flags.js";

export function restart(_args: string[], options: Options) {
  const session = findSession(options.session);
  if (!session) {
    console.error(options.session ? `no active session "${options.session}"` : "no active session to restart");
    process.exit(1);
  }

  const { cmd, pid, id, portless, name } = session;

  killProcessGroup(pid, "SIGTERM");

  setTimeout(() => {
    if (isRunning(pid)) {
      killProcessGroup(pid, "SIGKILL");
    }
    removeSession(id);

    const restartOptions: Options = { session: name ?? options.session, portless: portless || options.portless, all: false, attach: false, env: session.env ?? {} };
    const meta = daemonize(cmd, restartOptions);
    const out: Record<string, unknown> = { restarted: meta.id, pid: meta.pid, cmd: meta.cmd.join(" ") };
    if (meta.url) out.url = meta.url;
    console.log(JSON.stringify(out));
  }, 1000);
}
