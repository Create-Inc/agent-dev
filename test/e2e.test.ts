import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CLI = join(import.meta.dirname, "..", "dist", "index.js");
const FIXTURES = join(import.meta.dirname, "fixtures");
const TEST_DIR = join(tmpdir(), "agent-dev-test-" + process.pid);

function run(...args: string[]): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      encoding: "utf-8",
      env: { ...process.env, AGENT_DEV_LOG_DIR: TEST_DIR },
      timeout: 35_000,
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
  try { run("stop"); } catch {}
  try { run("--session", "named", "stop"); } catch {}
  try { run("--session", "s1", "stop"); } catch {}
  try { run("--session", "s2", "stop"); } catch {}
  try { run("--session", "waitport", "stop"); } catch {}
  try { run("--session", "waittext", "stop"); } catch {}
  try { run("--session", "waitdead", "stop"); } catch {}
  try { run("--session", "waittimeout", "stop"); } catch {}
  try { run("--session", "marktest", "stop"); } catch {}
  try { run("--session", "parenttest", "stop"); } catch {}
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
}

afterEach(() => cleanup());

// -- fixtures --

function fixture(name: string, code: string) {
  mkdirSync(FIXTURES, { recursive: true });
  const path = join(FIXTURES, name);
  writeFileSync(path, code);
  return path;
}

const serverFixture = (port: number) => fixture(`server-${port}.mjs`, `
  import http from 'node:http';
  const s = http.createServer((req, res) => res.end('ok'));
  s.listen(${port}, () => console.log('listening on http://localhost:${port}'));
`);

const logFixture = (lines: string[]) => fixture("logger.mjs", `
  ${lines.map(l => `console.log(${JSON.stringify(l)});`).join("\n")}
  setTimeout(() => {}, 60000);
`);

const parentChildFixture = (port: number) => {
  fixture("child-proc.mjs", `
    import http from 'node:http';
    const s = http.createServer((req, res) => res.end('ok'));
    s.listen(${port}, () => console.log('child on ${port}'));
  `);
  return fixture("parent-proc.mjs", `
    import { fork } from 'node:child_process';
    import { fileURLToPath } from 'node:url';
    import { dirname, join } from 'node:path';
    const dir = dirname(fileURLToPath(import.meta.url));
    console.log('parent pid', process.pid);
    fork(join(dir, 'child-proc.mjs'));
  `);
};

// ==========================================
// Core lifecycle
// ==========================================

describe("lifecycle", () => {
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
    assert.ok(JSON.parse(stdout).stopped);

    sleep(1200);
    const { stdout: statusOut } = run("status");
    assert.match(statusOut, /no sessions/);
  });

  it("restart re-runs with the same command", () => {
    const { stdout: first } = run("run", "python3", "-m", "http.server", "0");
    const firstPid = JSON.parse(first).pid;
    sleep(300);

    const { stdout: restarted } = run("restart");
    sleep(1200);
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

  it("stop kills child processes (process group)", () => {
    const f = parentChildFixture(9871);
    run("--session", "parenttest", "run", "node", f);
    sleep(1500);

    // verify child is serving
    try {
      execFileSync("curl", ["-s", "http://localhost:9871"], { timeout: 3000 });
    } catch {
      // may not be up yet, that's ok for this test
    }

    run("--session", "parenttest", "stop");
    sleep(1500);

    // port should be freed
    const { status } = (() => {
      try {
        execFileSync("curl", ["-s", "--connect-timeout", "1", "http://localhost:9871"], { timeout: 3000 });
        return { status: 0 };
      } catch {
        return { status: 1 };
      }
    })();
    assert.equal(status, 1, "child process should be dead after stop");
  });
});

// ==========================================
// Sessions
// ==========================================

describe("sessions", () => {
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

  it("session env var works like --session flag", () => {
    const stdout = execFileSync("node", [CLI, "run", "python3", "-m", "http.server", "0"], {
      encoding: "utf-8",
      env: { ...process.env, AGENT_DEV_LOG_DIR: TEST_DIR, AGENT_DEV_SESSION: "envtest" },
    });
    const out = JSON.parse(stdout);
    assert.equal(out.session, "envtest");
    assert.equal(out.name, "envtest");

    execFileSync("node", [CLI, "--session", "envtest", "stop"], {
      encoding: "utf-8",
      env: { ...process.env, AGENT_DEV_LOG_DIR: TEST_DIR },
    });
  });

  it("dead sessions show as not running in status", () => {
    run("--session", "s1", "run", "node", "-e", "console.log('bye'); process.exit(0)");
    sleep(1000);
    const { stdout } = run("--session", "s1", "status");
    const out = JSON.parse(stdout);
    assert.equal(out.running, false);
    assert.equal(out.name, "s1");
  });

  it("dead session logs are still searchable", () => {
    run("--session", "s2", "run", "node", "-e", "console.log('CRASH happened'); process.exit(1)");
    sleep(1000);
    const { stdout } = run("--session", "s2", "search", "CRASH");
    assert.match(stdout, /CRASH happened/);
  });

  it("clean removes dead sessions", () => {
    run("--session", "s1", "run", "node", "-e", "process.exit(0)");
    sleep(1000);
    const { stdout } = run("clean");
    const out = JSON.parse(stdout);
    assert.ok(out.cleaned.includes("s1"));

    const { stdout: after } = run("--session", "s1", "status");
    assert.match(after, /no sessions/);
  });
});

// ==========================================
// Log reading
// ==========================================

describe("logs", () => {
  it("search finds text in logs", () => {
    const f = serverFixture(0);
    run("run", "node", f);
    sleep(1000);

    const { stdout } = run("search", "listening");
    assert.match(stdout, /listening/);
  });

  it("search returns context lines", () => {
    const f = logFixture([
      "line1",
      "ERROR something broke",
      "  at Object.<anonymous>",
      "  at Module._compile",
      "  at node:internal",
    ]);
    run("run", "node", f);
    sleep(1000);

    const { stdout } = run("search", "ERROR");
    assert.match(stdout, /ERROR something broke/);
    assert.match(stdout, /at Object/);
    assert.match(stdout, /at Module/);
  });

  it("tail returns last N lines", () => {
    const f = logFixture(Array.from({ length: 20 }, (_, i) => `line${i + 1}`));
    run("run", "node", f);
    sleep(1000);

    const { stdout } = run("tail", "3");
    const lines = stdout.trim().split("\n");
    assert.equal(lines.length, 3);
    assert.match(lines[2], /line20/);
  });

  it("head returns first N lines", () => {
    const f = logFixture(Array.from({ length: 20 }, (_, i) => `line${i + 1}`));
    run("run", "node", f);
    sleep(1000);

    const { stdout } = run("head", "3");
    const lines = stdout.trim().split("\n");
    assert.equal(lines.length, 3);
    assert.match(lines[0], /line1/);
  });

  it("logs dumps all output", () => {
    const f = logFixture(["hello from logs"]);
    run("run", "node", f);
    sleep(1000);

    const { stdout } = run("logs");
    assert.match(stdout, /hello from logs/);
  });
});

// ==========================================
// Marks
// ==========================================

describe("marks", () => {
  it("mark sets a checkpoint and search respects it", () => {
    const f = serverFixture(9874);
    run("--session", "marktest", "run", "node", f);
    sleep(1500);

    // search finds startup message
    const { stdout: before } = run("--session", "marktest", "search", "listening");
    assert.match(before, /listening/);

    // set mark
    const { stdout: markOut } = run("--session", "marktest", "mark", "fixed old bug");
    const m = JSON.parse(markOut);
    assert.equal(m.mark, "fixed old bug");
    assert.ok(m.byte > 0);

    // search after mark finds nothing (no new log output after mark)
    const { stdout: after } = run("--session", "marktest", "search", "listening");
    assert.equal(after, "");

    // --all bypasses marks
    const { stdout: all } = run("--session", "marktest", "--all", "search", "listening");
    assert.match(all, /listening/);
  });

  it("marks lists all checkpoints", () => {
    const f = logFixture(["data"]);
    run("--session", "marktest", "run", "node", f);
    sleep(1000);

    run("--session", "marktest", "mark", "first");
    run("--session", "marktest", "mark", "second");

    const { stdout } = run("--session", "marktest", "marks");
    const lines = stdout.trim().split("\n");
    assert.equal(lines.length, 2);
    assert.match(lines[0], /first/);
    assert.match(lines[1], /second/);
  });
});

// ==========================================
// Wait
// ==========================================

describe("wait", () => {
  it("wait --port succeeds when port is accepting connections", () => {
    const f = serverFixture(9872);
    run("--session", "waitport", "run", "node", f);
    sleep(1000);

    const { stdout, status } = run("--session", "waitport", "wait", "--port", "9872", "--timeout", "10000");
    assert.equal(status, 0);
    const out = JSON.parse(stdout);
    assert.equal(out.ready, true);
    assert.equal(out.port, 9872);
  });

  it("wait --text succeeds when text appears in logs", () => {
    const f = serverFixture(9873);
    run("--session", "waittext", "run", "node", f);

    const { stdout, status } = run("--session", "waittext", "wait", "--text", "listening", "--timeout", "10000");
    assert.equal(status, 0);
    const out = JSON.parse(stdout);
    assert.equal(out.ready, true);
    assert.equal(out.match, "listening");
  });

  it("wait exits with error when process dies", () => {
    run("--session", "waitdead", "run", "node", "-e", "process.exit(1)");
    sleep(500);

    const { stderr, status } = run("--session", "waitdead", "wait", "--port", "9999", "--timeout", "5000");
    assert.equal(status, 1);
    assert.match(stderr, /process died|no active session/);
  });

  it("wait times out when port never opens", () => {
    const f = logFixture(["started but no server"]);
    run("--session", "waittimeout", "run", "node", f);
    sleep(500);

    const { stderr, status } = run("--session", "waittimeout", "wait", "--port", "9999", "--timeout", "2000");
    assert.equal(status, 1);
    assert.match(stderr, /timeout/);
  });

  it("wait requires --port or --text", () => {
    const f = logFixture(["data"]);
    run("--session", "waitport", "run", "node", f);
    sleep(500);

    const { stderr, status } = run("--session", "waitport", "wait", "--timeout", "1000");
    assert.equal(status, 1);
    assert.match(stderr, /--port.*--text/);
  });
});
