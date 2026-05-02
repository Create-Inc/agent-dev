---
name: agent-dev
description: Dev server process manager and log monitor for AI agents. Use when the user needs to start, stop, or manage a dev server, OR when the user is QAing/testing and you need to watch server logs for errors. Key use case - poll logs with `agent-dev search` while the user tests so you can immediately diagnose issues as they happen. Triggers include "start the dev server", "watch for errors", "monitor the server", "what does the server say", "check the logs", "debug this", "QA this", or any task where the agent should be aware of server-side behavior.
allowed-tools: Bash(agent-dev:*)
---

# Dev Server Management with agent-dev

A CLI for managing dev server processes as background daemons and searching their logs. The server runs detached, captures all stdout/stderr, and the agent can search or tail logs at any time without being attached to the process.

## Watching Logs During QA

The killer use case: while the user is testing in the browser, poll `agent-dev search` to immediately catch and diagnose server-side errors. The user doesn't need to copy-paste logs or describe the error — you already have it.

```bash
# Poll for errors while the user tests
agent-dev search "error"
agent-dev search "TypeError"
agent-dev search "500"
agent-dev search "ECONNREFUSED"
agent-dev search "unhandled"

# Check the latest output
agent-dev tail 20

# Dump everything
agent-dev logs
```

When the user is QAing, run `agent-dev search "error"` (or similar) periodically. If it returns results, you have the stack trace and can start diagnosing immediately without the user needing to report anything.

## Commands

```bash
# Start a dev server in the background
agent-dev run npm run dev
agent-dev run next dev --port 3000

# Named sessions
agent-dev --session myapp run npm run dev

# With portless (stable HTTPS .localhost URLs)
agent-dev --session myapp --portless run npm run dev
# => https://myapp.localhost

# Check running session
agent-dev status

# Search server logs
agent-dev search "error"
agent-dev search "listening on"
agent-dev --session myapp search "ready"

# View logs
agent-dev logs                  # all output
agent-dev tail [n]              # last n lines (default 50)
agent-dev head [n]              # first n lines (default 50)

# Lifecycle
agent-dev restart               # stop + re-run same command
agent-dev stop
```

## Flags and Environment Variables

| Flag | Env | Description |
|------|-----|-------------|
| `--session <name>` | `AGENT_DEV_SESSION` | Name the session (default: random id) |
| `--portless` | `AGENT_DEV_PORTLESS=1` | Route through portless (`https://<name>.localhost`) |
| | `AGENT_DEV_LOG_DIR` | Custom state/log directory (default: `~/.agent-dev`) |

## Common Patterns

### Start, then monitor while user QAs

```bash
agent-dev --session myapp run npm run dev
sleep 2
agent-dev search "ready"
# ... user is testing ...
agent-dev search "error"
agent-dev tail 20
```

### Diagnose after user reports a problem

```bash
agent-dev search "500"
agent-dev search "TypeError"
agent-dev tail 50
```

### Portless with named sessions

```bash
agent-dev --session api --portless run npm run dev
# Server available at https://api.localhost
```

### Restart after code changes

```bash
agent-dev restart
sleep 2
agent-dev search "ready"
```

## Notes

- Named sessions allow targeting specific servers with `--session`
- Without `--session`, commands target the first active session found
- Logs are captured to `~/.agent-dev/sessions/<id>/out.log`
- The process runs fully detached — it survives the parent shell exiting
- `restart` re-uses the original command, working directory, session name, and portless setting
- `stop` sends SIGTERM first, then SIGKILL after 500ms if needed
