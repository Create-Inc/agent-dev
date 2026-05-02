#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { toOptions } from "./flags.js";
import { run } from "./commands/run.js";
import { stop } from "./commands/stop.js";
import { search } from "./commands/search.js";
import { restart } from "./commands/restart.js";
import { status } from "./commands/status.js";
import { logs, tail, head } from "./commands/logs.js";
import { mark, marks } from "./commands/mark.js";
import { wait } from "./commands/wait.js";
import { clean } from "./commands/clean.js";

const globalOptions = {
  session: {
    type: "string" as const,
    describe: "Session name (default: repo-branch hash)",
  },
  portless: {
    type: "boolean" as const,
    describe: "Route through portless (https://<name>.localhost)",
  },
  all: {
    type: "boolean" as const,
    describe: "Ignore repo scope and marks",
  },
};

yargs(hideBin(process.argv))
  .scriptName("agent-dev")
  .usage("$0 <command> [args]")
  .options(globalOptions)
  .command(
    "run <cmd..>",
    "Start a dev server (background by default, --attach for foreground)",
    (y) =>
      y
        .positional("cmd", { type: "string", array: true, demandOption: true })
        .option("attach", { type: "boolean", describe: "Run in foreground, tee output to log" }),
    (argv) => run(argv.cmd as string[], toOptions(argv))
  )
  .command(
    "stop",
    "Stop the running session",
    (y) => y,
    (argv) => stop([], toOptions(argv))
  )
  .command(
    "restart",
    "Restart the current session",
    (y) => y,
    (argv) => restart([], toOptions(argv))
  )
  .command(
    "search <terms..>",
    "Search session logs",
    (y) =>
      y.positional("terms", { type: "string", array: true, demandOption: true }),
    (argv) => search(argv.terms as string[], toOptions(argv))
  )
  .command(
    "status",
    "Show current session info",
    (y) => y,
    (argv) => status([], toOptions(argv))
  )
  .command(
    "logs",
    "Dump all session logs",
    (y) => y,
    (argv) => logs([], toOptions(argv))
  )
  .command(
    "tail [n]",
    "Last n lines of logs (default 50)",
    (y) => y.positional("n", { type: "number", default: 50 }),
    (argv) => tail([String(argv.n)], toOptions(argv))
  )
  .command(
    "head [n]",
    "First n lines of logs (default 50)",
    (y) => y.positional("n", { type: "number", default: 50 }),
    (argv) => head([String(argv.n)], toOptions(argv))
  )
  .command(
    "mark [name..]",
    "Set a log checkpoint (search defaults to after latest mark)",
    (y) => y.positional("name", { type: "string", array: true }),
    (argv) => mark((argv.name as string[]) ?? [], toOptions(argv))
  )
  .command(
    "marks",
    "List all marks",
    (y) => y,
    (argv) => marks([], toOptions(argv))
  )
  .command(
    "wait",
    "Wait until the server is ready",
    (y) =>
      y
        .option("port", { type: "number", describe: "Wait for a specific port" })
        .option("text", { type: "string", describe: "Wait for text in logs" })
        .option("timeout", { type: "number", default: 30000, describe: "Timeout in ms" }),
    (argv) => wait([], { ...toOptions(argv), port: argv.port, text: argv.text, timeout: argv.timeout })
  )
  .command(
    "clean",
    "Remove dead session state",
    (y) => y,
    (argv) => clean([], toOptions(argv))
  )
  .demandCommand(1, "")
  .parserConfiguration({ "unknown-options-as-args": true })
  .help()
  .parse();
