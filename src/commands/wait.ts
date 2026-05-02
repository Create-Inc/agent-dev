import { createConnection } from "node:net";
import { existsSync, readFileSync } from "node:fs";
import { findSession, isRunning } from "../session.js";
import { logFile } from "../paths.js";
import type { Options } from "../flags.js";

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

interface WaitOptions {
  port?: number;
  text?: string;
  timeout?: number;
}

export async function wait(_args: string[], options: Options & WaitOptions) {
  const session = findSession(options.session);
  if (!session) {
    console.error(options.session ? `no active session "${options.session}"` : "no active session");
    process.exit(1);
  }

  if (!options.port && !options.text) {
    console.error("specify --port <number> or --text <string>");
    process.exit(1);
  }

  const timeout = options.timeout ?? 30000;
  const log = logFile(session.id);
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (!isRunning(session.pid)) {
      console.error(JSON.stringify({ error: "process died", session: session.id, pid: session.pid }));
      process.exit(1);
    }

    if (options.port) {
      const up = await checkPort(options.port);
      if (up) {
        console.log(JSON.stringify({ ready: true, session: session.id, port: options.port }));
        return;
      }
    }

    if (options.text && existsSync(log)) {
      const content = readFileSync(log, "utf-8");
      if (content.toLowerCase().includes(options.text.toLowerCase())) {
        console.log(JSON.stringify({ ready: true, session: session.id, match: options.text }));
        return;
      }
    }

    await sleep(500);
  }

  console.error(JSON.stringify({ error: "timeout", session: session.id, elapsed: Date.now() - start }));
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
