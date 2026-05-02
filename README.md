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

# Check status
agent-dev status

# Search logs
agent-dev search "ready"
agent-dev search "error"

# Restart with the same command
agent-dev restart

# Stop
agent-dev stop
```

All output is JSON:

```json
{"session":"a1b2c3d4","pid":12345,"cmd":"npm run dev"}
```

## How it works

- `run` spawns the command as a detached daemon and returns a session ID
- Stdout/stderr are captured to `~/.agent-dev/sessions/<id>/out.log`
- Session metadata (command, pid, cwd) is stored in `~/.agent-dev/sessions/<id>/meta.json`
- `restart` re-runs the original command from the original working directory
- `stop` sends SIGTERM, then SIGKILL after 500ms if needed

## Claude Code skill

Drop the skill file into `~/.agents/skills/agent-dev/SKILL.md` to make it available as a Claude Code skill. See [SKILL.md](https://github.com/Create-Inc/agent-dev/blob/main/skill/SKILL.md) for the skill definition.
