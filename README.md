# agent-dev

Dev server process manager for AI agents. Backgrounds your dev server as a daemon, tracks sessions via PID files, and captures logs for searchable output.

## Install

```bash
npm install -g agent-dev
```

Or from source:

```bash
git clone https://github.com/Create-Inc/agent-dev.git
cd agent-dev
npm install && npm run link
```

## Usage

```bash
# Start a dev server in the background
agent-dev run npm run dev
agent-dev run next dev --port 3000
agent-dev run python3 -m http.server 8080

# Named sessions
agent-dev --session myapp run npm run dev
agent-dev --session myapp status
agent-dev --session myapp stop

# With portless (https://myapp.localhost)
agent-dev --session myapp --portless run npm run dev

# Check status
agent-dev status

# Search logs
agent-dev search "ready"
agent-dev search "error"

# Show log file path
agent-dev logs

# Restart with the same command
agent-dev restart

# Stop
agent-dev stop
```

All output is JSON:

```json
{"session":"myapp","pid":12345,"cmd":"npm run dev","name":"myapp","url":"https://myapp.localhost"}
```

## Flags

| Flag | Env | Description |
|------|-----|-------------|
| `--session <name>` | `AGENT_DEV_SESSION` | Name the session (default: random id) |
| `--portless` | `AGENT_DEV_PORTLESS=1` | Route through [portless](https://github.com/vercel-labs/portless) (`https://<name>.localhost`) |
| | `AGENT_DEV_LOG_DIR` | Custom state/log directory (default: `~/.agent-dev`) |

## Portless

When `--portless` is set, the command is wrapped with `portless <session-name> <cmd>`, giving your dev server a stable HTTPS `.localhost` URL instead of a raw port number. Requires [portless](https://github.com/vercel-labs/portless) to be installed.

```bash
agent-dev --session api --portless run npm run dev
# => https://api.localhost

agent-dev --session dashboard --portless run next dev
# => https://dashboard.localhost
```

## How it works

- `run` spawns the command as a detached daemon and returns a session ID
- Stdout/stderr are captured to `~/.agent-dev/sessions/<id>/out.log`
- Session metadata (command, pid, cwd) is stored in `~/.agent-dev/sessions/<id>/meta.json`
- `restart` re-runs the original command from the original working directory, preserving portless and session name
- `stop` sends SIGTERM, then SIGKILL after 500ms if needed
- `logs` prints the path to the log file for the active session

## Claude Code skill

Drop the skill file into `~/.agents/skills/agent-dev/SKILL.md` to make it available as a Claude Code skill. See [skill/SKILL.md](skill/SKILL.md) for the skill definition.
