# agent-dashboard

A dashboard for coding-agent work across repositories: the issues, whether each has a pull
request, and that pull request's check gates — with credentials saved from the UI and stored
encrypted. Sessions (Claude Code, Codex), pull request screenshots and videos, and the shared
agent instructions from [agent-base](https://github.com/cnotv/agent-base) follow in later
milestones.

## Run it

```sh
pnpm install
pnpm build
pnpm start            # http://localhost:4317
```

Or with Docker, published on 127.0.0.1 only:

```sh
docker compose up --build
```

Repositories shown on the board come from `config/repos.json`.

### Static UI only (Netlify)

`netlify.toml` builds just the UI. With `VITE_DEMO_MODE=1` (the Netlify default here) it runs
on bundled sample data with a banner, and nothing typed into it leaves the page: that is the
per-pull-request preview. To use a static UI with a real server instead, build it with
`VITE_API_BASE_URL=https://your-dashboard-server` and without demo mode; the server side of
that (accepting the UI's origin, sign-in) arrives with cloud mode.

## Credentials

Open **Credentials** and add a GitHub token (fine-grained, read access to issues, pull
requests, checks and actions on the repositories in `config/repos.json`). API keys for
Anthropic, OpenAI and OpenRouter are stored the same way, for sessions that are not on a
subscription.

Values are encrypted with AES-256-GCM before they reach the SQLite database, each bound to its
own name. The browser can add, replace, test and remove a value, but never reads one back; it
sees the last four characters only. The key comes from one of two places:

| Mode        | How                                                                                                   | When to use                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Passphrase  | Leave `AGENT_DASHBOARD_MASTER_KEY` unset; set a passphrase in the UI and enter it after every restart | Anything reachable from another machine: a stolen disk reveals nothing |
| Environment | `AGENT_DASHBOARD_MASTER_KEY=$(openssl rand -base64 32)`, or `AGENT_DASHBOARD_MASTER_KEY_FILE`         | A local machine you already trust                                      |

## Access

The server only listens on loopback and rejects requests whose `Host` header is not a
loopback name, and mutations from another origin, so a web page elsewhere cannot reach it
through DNS rebinding. Cloud mode (`AGENT_DASHBOARD_MODE=cloud`) stays refused until sign-in
exists.

## Settings

| Variable                               | Default                 |
| -------------------------------------- | ----------------------- |
| `PORT`                                 | `4317`                  |
| `AGENT_DASHBOARD_HOST`                 | `127.0.0.1`             |
| `AGENT_DASHBOARD_DATA_DIR`             | `data`                  |
| `AGENT_DASHBOARD_REPOS_FILE`           | `config/repos.json`     |
| `AGENT_DASHBOARD_MASTER_KEY` / `_FILE` | unset (passphrase mode) |
| `VITE_DEMO_MODE` (UI build)            | unset                   |
| `VITE_API_BASE_URL` (UI build)         | unset (same origin)     |

## UI

React 19 with [Radix Themes](https://www.radix-ui.com/themes) (light and dark follow the
system) and [TanStack Table](https://tanstack.com/table) for sorting, searching, expanding
and paging. No Tailwind.

## Develop

```sh
pnpm dev                          # API on 4317, UI on 5318
pnpm lint --max-warnings 0
pnpm typecheck
pnpm test
```

Agent instructions are in `AGENTS.md`.
