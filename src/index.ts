#!/usr/bin/env node

import { run } from "./commands/run.js";
import { stop } from "./commands/stop.js";
import { search } from "./commands/search.js";
import { restart } from "./commands/restart.js";
import { status } from "./commands/status.js";
import { logs, tail, head } from "./commands/logs.js";
import { mark, marks } from "./commands/mark.js";
import { parseFlags } from "./flags.js";

const { options, rest } = parseFlags(process.argv.slice(2));
const [command, ...args] = rest;

const commands: Record<string, (args: string[], options: ReturnType<typeof parseFlags>["options"]) => void | Promise<void>> = {
  run,
  stop,
  search,
  restart,
  status,
  logs,
  tail,
  head,
  mark,
  marks,
};

if (!command || !commands[command]) {
  console.error(`usage: agent-dev [flags] <command> [args]

commands:
  run <cmd...>    Start a dev server as a background daemon
  stop            Stop the running session
  restart         Restart the current session
  search <terms>  Search session logs
  status          Show current session info
  logs            Dump all session logs
  tail [n]        Last n lines of logs (default 50)
  head [n]        First n lines of logs (default 50)
  mark [name]     Set a checkpoint (search defaults to after latest mark)
  marks           List all marks

flags:
  --session <name>   Name the session (default: random id)
  --portless         Route through portless (https://<name>.localhost)
  --all              Search all logs, ignoring marks

env:
  AGENT_DEV_SESSION    Default session name
  AGENT_DEV_PORTLESS   Set to "1" to enable portless
  AGENT_DEV_LOG_DIR    Custom state/log directory (default: ~/.agent-dev)`);
  process.exit(command ? 1 : 0);
}

await commands[command](args, options);
