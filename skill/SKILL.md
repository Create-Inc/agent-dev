---
name: agent-dev
description: Dev server process manager and log monitor for AI agents. Use when the user needs to start, stop, or manage a dev server, OR when the user is QAing/testing and you need to watch server logs for errors. Key use case - poll logs with `agent-dev search` while the user tests so you can immediately diagnose issues as they happen. Triggers include "start the dev server", "watch for errors", "monitor the server", "what does the server say", "check the logs", "debug this", "QA this", or any task where the agent should be aware of server-side behavior.
allowed-tools: Bash(agent-dev:*)
---

# Dev Server Management with agent-dev

A CLI for managing dev server processes as background daemons and searching their logs. The server runs detached, captures all stdout/stderr, and the agent can search or tail logs at any time without being attached to the process.

## Watching Logs During QA

The killer use case: while the user is testing in the browser, poll `agent-dev search` to immediately catch and diagnose server-side errors. The user doesn't need to copy-paste logs or describe the error — you already have it.

After making a fix, set a mark so you only see new errors:

```bash
agent-dev mark "fixed auth bug"
# user keeps testing...
agent-dev search "error"          # only shows errors after the mark
agent-dev --all search "error"    # full history if needed
```

## Commands

```bash
# Start a dev server in the background
agent-dev run npm run dev
agent-dev run next dev --port 3000

# Wait for it to be ready (replaces lsof polling)
agent-dev wait --port 3000
agent-dev wait --text "ready"
agent-dev wait --port 3000 --timeout 60000

# Named sessions
agent-dev --session myapp run npm run dev

# With portless (stable HTTPS .localhost URLs)
agent-dev --session myapp --portless run npm run dev

# Check session status (shows dead sessions too)
agent-dev status

# Search server logs (scoped to current repo by default)
agent-dev search "error"
agent-dev search "TypeError"
agent-dev --session myapp search "ready"

# View logs
agent-dev logs                  # all output
agent-dev tail [n]              # last n lines (default 50)
agent-dev head [n]              # first n lines (default 50)

# Marks (checkpoints for search)
agent-dev mark "fixed the bug"  # set checkpoint
agent-dev marks                 # list all marks
# search defaults to after latest mark

# Lifecycle
agent-dev restart               # stop + re-run same command (kills child processes)
agent-dev stop                  # kills entire process group
agent-dev clean                 # remove dead session state
```

## Flags and Environment Variables

| Flag | Env | Description |
|------|-----|-------------|
| `--session <name>` | `AGENT_DEV_SESSION` | Name the session (default: repo-branch hash) |
| `--portless` | `AGENT_DEV_PORTLESS=1` | Route through portless (`https://<name>.localhost`) |
| `--all` | | Ignore repo scope and marks |
| | `AGENT_DEV_LOG_DIR` | Custom state/log directory (default: `~/.agent-dev`) |

## Common Patterns

### Start, wait, then monitor while user QAs

```bash
agent-dev run npm run dev
agent-dev wait --port 3000
# server is ready
agent-dev search "error"
agent-dev tail 20
```

### Fix-mark-search cycle

```bash
# fix the code...
agent-dev mark "fixed null ref"
# user tests again...
agent-dev search "error"          # only new errors
```

### Diagnose a crash (post-mortem)

```bash
agent-dev status                  # shows running: false
agent-dev tail 50                 # see what happened
agent-dev search "EADDRINUSE"     # check for port conflicts
```

### Restart after code changes

```bash
agent-dev restart
agent-dev wait --port 3000
```

## Notes

- Default session ID is `{repo}-{branch}-{hash}` — scoped to current git repo/branch
- Without `--session`, commands target the current repo's session
- `--all` shows sessions from all repos and ignores marks
- Dead sessions are preserved for debugging — use `clean` to remove them
- `stop` and `restart` kill the entire process group (child processes too)
- Logs are captured to `~/.agent-dev/sessions/<id>/out.log`
- `restart` re-uses the original command, working directory, and settings
