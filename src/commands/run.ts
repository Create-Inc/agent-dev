import { findSession } from "../session.js";
import { daemonize } from "../daemon.js";
import type { Options } from "../flags.js";

export function run(args: string[], options: Options) {
  if (args.length === 0) {
    console.error("usage: agent-dev run <command> [args...]");
    process.exit(1);
  }

  const existing = findSession(options.session);
  if (existing) {
    console.error(`session ${existing.id} already running (pid ${existing.pid})`);
    console.error("run 'agent-dev stop' first, or use 'agent-dev restart'");
    process.exit(1);
  }

  const meta = daemonize(args, options);
  const out: Record<string, unknown> = { session: meta.id, pid: meta.pid, cmd: meta.cmd.join(" ") };
  if (meta.name) out.name = meta.name;
  if (meta.url) out.url = meta.url;
  console.log(JSON.stringify(out));
}
