import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CLI = join(import.meta.dirname, "..", "dist", "index.js");
const TEST_DIR = join(tmpdir(), "agent-dev-test-" + process.pid);

function run(...args: string[]): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      encoding: "utf-8",
      env: { ...process.env, AGENT_DEV_LOG_DIR: TEST_DIR },
      timeout: 10_000,
    });
    return { stdout, stderr: "", status: 0 };
  } catch (e: any) {
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", status: e.status ?? 1 };
  }
}

function sleep(ms: number) {
  execFileSync("sleep", [String(ms / 1000)]);
}

function cleanup() {
  // stop any running sessions
  try { run("stop"); } catch {}
  try { run("--session", "named", "stop"); } catch {}
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
}

afterEach(() => cleanup());

describe("agent-dev e2e", () => {
  it("run starts a daemon and returns JSON", () => {
    const { stdout, status } = run("run", "python3", "-m", "http.server", "0");
    assert.equal(status, 0);
    const out = JSON.parse(stdout);
    assert.ok(out.session);
    assert.ok(out.pid);
    assert.equal(out.cmd, "python3 -m http.server 0");
  });

  it("status shows running session", () => {
    run("run", "python3", "-m", "http.server", "0");
    const { stdout } = run("status");
    const out = JSON.parse(stdout);
    assert.equal(out.running, true);
    assert.ok(out.pid);
  });

  it("stop kills the session", () => {
    run("run", "python3", "-m", "http.server", "0");
    sleep(300);
    const { stdout, status } = run("stop");
    assert.equal(status, 0);
    const out = JSON.parse(stdout);
    assert.ok(out.stopped);

    sleep(600);
    const { stdout: statusOut } = run("status");
    assert.match(statusOut, /no sessions/);
  });

  it("restart re-runs with the same command", () => {
    const { stdout: first } = run("run", "python3", "-m", "http.server", "0");
    const firstPid = JSON.parse(first).pid;
    sleep(300);

    const { stdout: restarted } = run("restart");
    sleep(600);
    const out = JSON.parse(restarted);
    assert.ok(out.restarted);
    assert.notEqual(out.pid, firstPid);
    assert.equal(out.cmd, "python3 -m http.server 0");
  });

  it("run rejects if session already active", () => {
    run("run", "python3", "-m", "http.server", "0");
    const { stderr, status } = run("run", "python3", "-m", "http.server", "0");
    assert.equal(status, 1);
    assert.match(stderr, /already running/);
  });

  it("stop errors when no session", () => {
    const { stderr, status } = run("stop");
    assert.equal(status, 1);
    assert.match(stderr, /no active session/);
  });

  it("named sessions work with --session", () => {
    const { stdout } = run("--session", "named", "run", "python3", "-m", "http.server", "0");
    const out = JSON.parse(stdout);
    assert.equal(out.session, "named");
    assert.equal(out.name, "named");

    const { stdout: statusOut } = run("--session", "named", "status");
    const s = JSON.parse(statusOut);
    assert.equal(s.name, "named");
    assert.equal(s.running, true);
  });

  it("search finds text in logs", () => {
    run("run", "node", "-e", `
      const http = require('http');
      const s = http.createServer((req, res) => { res.end('ok'); });
      s.listen(0, () => console.log('READY on port ' + s.address().port));
    `);
    sleep(1000);

    const { stdout } = run("search", "READY");
    assert.match(stdout, /READY on port/);
  });

  it("search returns context lines", () => {
    run("run", "node", "-e", `
      console.log('line1');
      console.log('ERROR something broke');
      console.log('  at Object.<anonymous>');
      console.log('  at Module._compile');
      console.log('  at node:internal');
      setTimeout(() => {}, 30000);
    `);
    sleep(1000);

    const { stdout } = run("search", "ERROR");
    assert.match(stdout, /ERROR something broke/);
    assert.match(stdout, /at Object/);
    assert.match(stdout, /at Module/);
  });

  it("tail returns last N lines", () => {
    run("run", "node", "-e", `
      for (let i = 1; i <= 20; i++) console.log('line' + i);
      setTimeout(() => {}, 30000);
    `);
    sleep(1000);

    const { stdout } = run("tail", "3");
    const lines = stdout.trim().split("\n");
    assert.equal(lines.length, 3);
    assert.match(lines[2], /line20/);
  });

  it("head returns first N lines", () => {
    run("run", "node", "-e", `
      for (let i = 1; i <= 20; i++) console.log('line' + i);
      setTimeout(() => {}, 30000);
    `);
    sleep(1000);

    const { stdout } = run("head", "3");
    const lines = stdout.trim().split("\n");
    assert.equal(lines.length, 3);
    assert.match(lines[0], /line1/);
  });

  it("logs dumps all output", () => {
    run("run", "node", "-e", `
      console.log('hello from logs');
      setTimeout(() => {}, 30000);
    `);
    sleep(1000);

    const { stdout } = run("logs");
    assert.match(stdout, /hello from logs/);
  });

  it("session env var works like --session flag", () => {
    const stdout = execFileSync("node", [CLI, "run", "python3", "-m", "http.server", "0"], {
      encoding: "utf-8",
      env: { ...process.env, AGENT_DEV_LOG_DIR: TEST_DIR, AGENT_DEV_SESSION: "envtest" },
    });
    const out = JSON.parse(stdout);
    assert.equal(out.session, "envtest");
    assert.equal(out.name, "envtest");

    // clean up
    execFileSync("node", [CLI, "--session", "envtest", "stop"], {
      encoding: "utf-8",
      env: { ...process.env, AGENT_DEV_LOG_DIR: TEST_DIR },
    });
  });
});
