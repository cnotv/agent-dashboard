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
`VITE_API_BASE_URL=https://your-dashboard-server` and without demo mode; the server does not
accept another origin yet, so the UI it serves itself is the one to use.

## Sign in with GitHub

Signing in does two things: it is the lock on a cloud deployment, and it is how the dashboard
reads GitHub, with your own token, so no GitHub token has to be saved under Credentials. It
uses a GitHub App rather than an OAuth App, because an App's user token can only read what the
App is allowed to on the repositories it is installed on, and it expires after eight hours; an
OAuth App would need the `repo` scope, which can write to every private repository you have.

Create the App once at <https://github.com/settings/apps/new>:

1. **Homepage URL**: your dashboard's address.
2. **Callback URL**: `https://<your domain>/api/auth/github/callback`. Add
   `http://localhost:4317/api/auth/github/callback` as a second one to sign in locally too.
3. Keep **Expire user authorization tokens** on. Leave **Request user authorization during
   installation** off, and untick **Webhook: Active**.
4. **Repository permissions**, all read-only: Actions, Checks, Commit statuses, Contents,
   Issues, Pull requests (Metadata is added on its own).
5. **Only on this account**, then create it. Copy the **Client ID** and generate a **client
   secret**.
6. **Install App** on your account, for the repositories in `config/repos.json`. The board can
   only read repositories the App is installed on.

Then set `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET` (or `_FILE`) and
`AGENT_DASHBOARD_ALLOWED_USERS`, the comma-separated GitHub logins that may sign in. Locally,
sign-in is optional and a **Sign in with GitHub** button appears in the sidebar.

Sessions are kept in the server's memory only, so no GitHub token is ever written to disk. A
restart or a deploy signs everyone out, and signing in again is one click, which GitHub
completes without asking twice.

## Deploy to the cloud

`docker-compose.cloud.yml` runs the dashboard behind [Caddy](https://caddyserver.com), which
serves https and gets the certificate for your domain by itself. In cloud mode every `/api`
route except health and sign-in answers 401 without a session, and only requests for the
domain's host name are answered at all.

The `Deploy` workflow copies the sources to a server over SSH and builds the image there, as
generative-art's deploy does, on every push to `main` once the checks pass. It stays idle
until `AGENT_DASHBOARD_DOMAIN` is set. What it needs:

- **The server**: Docker with the compose plugin, ports 80 and 443 free and open, and a DNS
  `A` record for the domain pointing at it. If something already serves 80 and 443 there, drop
  the `caddy` service and proxy the domain to the `dashboard` container from that server
  instead.
- **Repository variables** (Settings, Secrets and variables, Actions, Variables):

  | Variable                        | Value                                                          |
  | ------------------------------- | -------------------------------------------------------------- |
  | `AGENT_DASHBOARD_DOMAIN`        | the host name only, for example `dash.example.com`             |
  | `GITHUB_APP_CLIENT_ID`          | from the GitHub App                                            |
  | `AGENT_DASHBOARD_ALLOWED_USERS` | for example `cnotv`                                            |
  | `DEPLOY_DIRECTORY`              | optional, defaults to `agent-dashboard` in the SSH user's home |

- **Repository secrets**:

  | Secret                       | Value                                                        |
  | ---------------------------- | ------------------------------------------------------------ |
  | `HETZNER_HOST`               | the server's address                                         |
  | `HETZNER_USERNAME`           | the SSH user, who can run `docker`                           |
  | `HETZNER_SSH_KEY`            | a private key that user accepts                              |
  | `HETZNER_PORT`               | optional, defaults to 22                                     |
  | `GITHUB_APP_CLIENT_SECRET`   | from the GitHub App                                          |
  | `AGENT_DASHBOARD_MASTER_KEY` | optional; leave it out to unlock the vault with a passphrase |

The workflow writes these into `.env` in the deploy directory, readable by the SSH user only.
Without a master key the vault asks for its passphrase after every deploy; that only holds up
features that use a stored API key, since GitHub access comes from the sign-in.

## Credentials

Signed in with GitHub, the board reads GitHub as you. Without sign-in, open **Credentials**
and add a GitHub token (fine-grained, read access to issues, pull requests, checks and actions
on the repositories in `config/repos.json`). API keys for
Anthropic, OpenAI and OpenRouter are stored the same way, for sessions that are not on a
subscription.

Values are encrypted with AES-256-GCM before they reach the SQLite database, each bound to its
own name. The browser can add, replace, test and remove a value, but never reads one back; it
sees the last four characters only. The key comes from one of two places:

| Mode        | How                                                                                                   | When to use                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Passphrase  | Leave `AGENT_DASHBOARD_MASTER_KEY` unset; set a passphrase in the UI and enter it after every restart | Anything reachable from another machine: a stolen disk reveals nothing |
| Environment | `AGENT_DASHBOARD_MASTER_KEY=$(openssl rand -base64 32)`, or `AGENT_DASHBOARD_MASTER_KEY_FILE`         | A machine you already trust, or a server you redeploy often            |

## Access

Locally, the server only listens on loopback and rejects requests whose `Host` header is not
a loopback name, and mutations from another origin, so a web page elsewhere cannot reach it
through DNS rebinding. Cloud mode (`AGENT_DASHBOARD_MODE=cloud`) answers only its own domain,
only over https, and only to a signed-in allowlisted GitHub account; it refuses to start
without all three configured.

## Settings

| Variable                               | Default                                                   |
| -------------------------------------- | --------------------------------------------------------- |
| `AGENT_DASHBOARD_MODE`                 | `local` (or `cloud`)                                      |
| `PORT`                                 | `4317`                                                    |
| `AGENT_DASHBOARD_HOST`                 | `127.0.0.1`, `0.0.0.0` in cloud mode                      |
| `AGENT_DASHBOARD_PUBLIC_URL`           | `http://localhost:<PORT>`; required, https, in cloud mode |
| `GITHUB_APP_CLIENT_ID`                 | unset (no sign-in)                                        |
| `GITHUB_APP_CLIENT_SECRET` / `_FILE`   | unset                                                     |
| `AGENT_DASHBOARD_ALLOWED_USERS`        | unset; required with sign-in                              |
| `AGENT_DASHBOARD_DATA_DIR`             | `data`                                                    |
| `AGENT_DASHBOARD_REPOS_FILE`           | `config/repos.json`                                       |
| `AGENT_DASHBOARD_MASTER_KEY` / `_FILE` | unset (passphrase mode)                                   |
| `VITE_DEMO_MODE` (UI build)            | unset                                                     |
| `VITE_API_BASE_URL` (UI build)         | unset (same origin)                                       |

## UI

React 19 with [Radix Themes](https://www.radix-ui.com/themes) (light and dark follow the
system) and [TanStack Table](https://tanstack.com/table) for sorting, searching, expanding
and paging. No Tailwind.

## Develop

```sh
pnpm dev                          # API on 4317, UI on 5318
# To sign in through the dev UI, run the API with AGENT_DASHBOARD_PUBLIC_URL=http://localhost:5318
# and register that callback URL on the GitHub App as well.
pnpm lint --max-warnings 0
pnpm typecheck
pnpm test
```

Agent instructions are in `AGENTS.md`.
