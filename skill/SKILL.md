---
name: agent-dev
description: Dev server process manager for AI agents. Use when the user needs to start, stop, restart, or manage a development server running in the background. Triggers include requests to "start the dev server", "run the dev server", "stop the server", "restart the server", "check if the server is running", "search the server logs", or any task requiring a background dev server process.
allowed-tools: Bash(agent-dev:*)
---

# Dev Server Management with agent-dev

A lightweight CLI for managing dev server processes as background daemons. Spawns processes detached, captures stdout/stderr to searchable logs, and tracks sessions via PID files in `~/.agent-dev/`.

## Core Workflow

1. **Start**: `agent-dev run <command> [args...]` — daemonize the process, get a session ID
2. **Check**: `agent-dev status` — see if it's running
3. **Search**: `agent-dev search <terms>` — grep the logs
4. **Restart**: `agent-dev restart` — stop and re-run with the same command
5. **Stop**: `agent-dev stop` — kill the session and clean up

All output is JSON for easy parsing.

## Commands

```bash
# Start a dev server in the background
agent-dev run npm run dev
agent-dev run python3 -m http.server 8080
agent-dev run next dev --port 3000

# Check running session
agent-dev status
# {"session":"a1b2c3d4","pid":12345,"running":true,"cmd":"npm run dev","cwd":"/path/to/project","started":"2026-05-01T..."}

# Search server logs for errors, URLs, or any text
agent-dev search "error"
agent-dev search "listening on"
agent-dev search "EADDRINUSE"

# Restart with the same command (stop + run)
agent-dev restart

# Stop the running server
agent-dev stop
```

## Common Patterns

### Start and verify

```bash
agent-dev run npm run dev
sleep 2
agent-dev search "ready"
```

### Check for errors after start

```bash
agent-dev run next dev
sleep 3
agent-dev search "error"
agent-dev search "warning"
```

### Restart after code changes

```bash
agent-dev restart
sleep 2
agent-dev status
```

## Notes

- Only one active session at a time. Stop the current one before starting another.
- Logs are captured to `~/.agent-dev/sessions/<id>/out.log`.
- The process runs fully detached — it survives the parent shell exiting.
- `restart` re-uses the original command and working directory.
- `stop` sends SIGTERM first, then SIGKILL after 500ms if needed.
