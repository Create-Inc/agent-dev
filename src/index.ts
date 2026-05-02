#!/usr/bin/env node

import { run } from "./commands/run.js";
import { stop } from "./commands/stop.js";
import { search } from "./commands/search.js";
import { restart } from "./commands/restart.js";
import { status } from "./commands/status.js";

const [command, ...args] = process.argv.slice(2);

const commands: Record<string, (args: string[]) => void> = {
  run,
  stop,
  search,
  restart,
  status,
};

if (!command || !commands[command]) {
  console.error(`usage: agent-dev <command> [args]

commands:
  run <cmd...>    Start a dev server as a background daemon
  stop            Stop the running session
  restart         Restart the current session
  search <terms>  Search session logs
  status          Show current session info`);
  process.exit(command ? 1 : 0);
}

commands[command](args);
