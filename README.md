# Dashi

Dashi, from this `agent-dashboard` repository, is a dashboard for coding-agent work across
repositories: the Claude Code and Codex sessions running now and the tokens they spend, the
issues and their pull requests with check gates, screenshots and videos, and buttons to merge,
close, and start a session from the phone, on your laptop or in Claude's cloud. Credentials are
saved from the UI and stored encrypted, and the shared agent instructions come from
[agent-base](https://github.com/cnotv/agent-base).

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
4. **Repository permissions**: read-only for Actions, Checks, Commit statuses and Issues; **read
   and write** for Contents and Pull requests, which the Merge and Close buttons need (Metadata
   is added on its own). Leave those two read-only to keep the dashboard unable to change
   anything; the buttons then show GitHub's refusal.
5. **Only on this account**, then create it. Copy the **Client ID** and generate a **client
   secret**.
6. **Install App** on your account, for the repositories in `config/repos.json`. The board can
   only read repositories the App is installed on.

Then set `AGENT_DASHBOARD_GITHUB_APP_CLIENT_ID`, `AGENT_DASHBOARD_GITHUB_APP_CLIENT_SECRET`
(or `_FILE`) and `AGENT_DASHBOARD_ALLOWED_USERS`, the comma-separated GitHub logins that may
sign in. The names carry the `AGENT_DASHBOARD_` prefix because GitHub refuses repository
variables and secrets that start with `GITHUB_`. Locally, sign-in is optional and a **Sign in
with GitHub** button appears in the sidebar.

Sessions are kept in the server's memory only, so no GitHub token is ever written to disk. A
restart or a deploy signs everyone out, and signing in again is one click, which GitHub
completes without asking twice.

## Deploy to the cloud

`docker-compose.cloud.yml` runs the dashboard and publishes it on one port, `4317` by
default, on a private address. HTTPS comes from the reverse proxy already on the server,
which forwards the domain to that port; the deployment itself takes no other port, and never
80 or 443. In cloud mode every `/api` route except health and sign-in answers 401 without a
session, only requests for the domain's host name are answered at all, and the app sets its
own security headers (HSTS, `nosniff`, `X-Frame-Options: DENY`) whatever proxy is in front.

The `Deploy` workflow copies the sources to a server over SSH and builds the image there, as
generative-art's deploy does, on every push to `main` once the checks pass. It stays idle
until `AGENT_DASHBOARD_DOMAIN` is set. What it needs:

- **The server**: Docker with the compose plugin, a DNS `A` record for the domain pointing at
  it, and a reverse proxy with a certificate for the domain, forwarding to the published port
  and passing the `Host` header through unchanged (the default in Nginx Proxy Manager, Caddy
  and Traefik).
- **Where the proxy reaches the dashboard**: a proxy running on the host itself uses
  `http://127.0.0.1:4317`, the default. A proxy running in Docker (Nginx Proxy Manager, for
  one) cannot see the host's `127.0.0.1`; set `AGENT_DASHBOARD_PUBLISH_ADDRESS` to the Docker
  bridge address, usually `172.17.0.1` (`ip -4 addr show docker0`), and forward to
  `http://172.17.0.1:4317`. Either way the port is not reachable from the internet.
- **A port that is free**: `4317` unless `AGENT_DASHBOARD_PUBLISH_PORT` says otherwise; check
  with `ss -tlnp` on the server before the first deploy.
- **Repository variables** (Settings, Secrets and variables, Actions, Variables):

  | Variable                               | Value                                                                 |
  | -------------------------------------- | --------------------------------------------------------------------- |
  | `AGENT_DASHBOARD_DOMAIN`               | the host name only, for example `dash.example.com`                    |
  | `AGENT_DASHBOARD_GITHUB_APP_CLIENT_ID` | from the GitHub App                                                   |
  | `AGENT_DASHBOARD_ALLOWED_USERS`        | for example `cnotv`                                                   |
  | `AGENT_DASHBOARD_PUBLISH_ADDRESS`      | optional, defaults to `127.0.0.1`; `172.17.0.1` for a proxy in Docker |
  | `AGENT_DASHBOARD_PUBLISH_PORT`         | optional, defaults to `4317`                                          |
  | `DEPLOY_DIRECTORY`                     | optional, defaults to `agent-dashboard` in the SSH user's home        |

- **Repository secrets**:

  | Secret                                     | Value                                                        |
  | ------------------------------------------ | ------------------------------------------------------------ |
  | `HETZNER_HOST`                             | the server's address                                         |
  | `HETZNER_USERNAME`                         | the SSH user, who can run `docker`                           |
  | `HETZNER_SSH_KEY`                          | a private key that user accepts                              |
  | `HETZNER_PORT`                             | optional, defaults to 22                                     |
  | `AGENT_DASHBOARD_GITHUB_APP_CLIENT_SECRET` | from the GitHub App                                          |
  | `AGENT_DASHBOARD_MASTER_KEY`               | optional; leave it out to unlock the vault with a passphrase |

The workflow writes these into `.env` in the deploy directory, readable by the SSH user only.
Without a master key the vault asks for its passphrase after every deploy; that only holds up
features that use a stored API key, since GitHub access comes from the sign-in.

## Credentials

Signed in with GitHub, the board reads GitHub as you. Without sign-in, open **Credentials**
and add a GitHub token (fine-grained, read access to issues, checks and actions on the
repositories in `config/repos.json`, and write access to contents and pull requests for Merge
and Close). API keys for
Anthropic, OpenAI and OpenRouter are stored the same way, for sessions that are not on a
subscription, and so is a Netlify personal access token for the board's Netlify button.

Each credential's dialog links to the page where that token or key is created.

Values are encrypted with AES-256-GCM before they reach the SQLite database, each bound to its
own name. The browser can add, replace, test and remove a value, but never reads one back; it
sees the last four characters only. The key comes from one of two places:

| Mode        | How                                                                                                   | When to use                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Passphrase  | Leave `AGENT_DASHBOARD_MASTER_KEY` unset; set a passphrase in the UI and enter it after every restart | Anything reachable from another machine: a stolen disk reveals nothing |
| Environment | `AGENT_DASHBOARD_MASTER_KEY=$(openssl rand -base64 32)`, or `AGENT_DASHBOARD_MASTER_KEY_FILE`         | A machine you already trust, or a server you redeploy often            |

## Sessions and usage

**Sessions** (the default page) charts every session whose hooks report here: when it was
working, waiting for you or idle, and a table with its branch, issue and tokens. **Usage**
adds up tokens across all repositories, then by repository, pull request or branch, day and
model. It counts tokens only; subscription sessions have no per-token price to show.

Both are fed by the machines running Claude Code, not read from them:

1. In **Credentials, Connect Claude Code**, create a token for the machine and merge the
   snippet it shows into that machine's `~/.claude/settings.json`. It enables the `workflow`
   plugin from agent-base, whose hook posts each session event to `/api/events`, sets the
   hook's `AGENT_DASHBOARD_URL` and `AGENT_DASHBOARD_TOKEN`, and turns on Claude Code's
   OpenTelemetry metrics, exported to `/api/telemetry/v1/metrics`. It has to be the user
   settings file: Claude Code ignores telemetry settings in a repository's
   `.claude/settings.json`.
2. Start a new session; one already open keeps its old settings. The token's **Last report**
   shows when the machine last reached the dashboard. If it stays at **Never**, install the
   plugin by hand (`claude plugin marketplace add cnotv/agent-base`, then
   `claude plugin install workflow@cnotv`) and start another session.

The token is shown once and stored as a hash. It can only send events and metrics, never
read anything, and **Revoke** cuts one machine off. A session silent for six hours counts as
inactive, since a closed terminal never reports that it ended.

## Board cards

Each open pull request gets one card, listing every issue it closes (by a `Closes #n` line or
by its `<type>/<n>-description` branch). An issue without a pull request has a card of its own.

The card ends in one row of icons, each named in its tooltip: the checks, a red warning when
the branch has a merge conflict, the deploy preview, the screenshot and video, then Merge and
Close. Checks show as a ring with one coloured arc per state (red failed, amber running, green
passed, grey skipped or neutral) and the passed count; hovering it lists every check with its
state and a link to its run. The globe opens the Netlify deploy preview once Netlify reports
one.

## Netlify

The button at the top of the board is green, and opens the site in Netlify, when a Netlify
site builds the selected repository. Otherwise **Enable Netlify** creates one after a
confirmation. The site builds the default branch, posts a deploy preview on each pull request,
and takes its build command and folder from the repository's `netlify.toml`.

It needs a Netlify personal access token under **Credentials**. Netlify's API cannot list its
GitHub App installations, so the new site is linked through the installation that another
Netlify site of the same GitHub owner already uses. The first repository of an owner is linked
once in Netlify itself; the button works for the rest.

## Start a session from the board

Every card has a **Start** button (the play icon), so work can be started from the phone. Pick a
workflow from agent-base's `start` router (suggested from the issue's labels), add a note if the
issue leaves something out, and pick where it runs:

| Where                              | What happens                                                                                                             | Needs                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Laptop, steered from the phone     | The runner starts `claude --remote-control` in tmux, in a fresh worktree of the repository; open it in the Claude app    | The laptop runner, and tmux 3.2 or later |
| Laptop, unattended                 | The runner starts `claude -p` in a fresh worktree with the permission mode you pick; its hooks report it here             | The laptop runner                       |
| Claude cloud, sent from the laptop | The runner runs `claude --cloud` in its clone and reports the claude.ai link back                                        | The laptop runner, logged in to claude.ai |
| Claude cloud routine               | The dashboard fires the repository's routine through the routines API; works with the laptop off                          | A routine for the repository            |

Each start's session opens with `/workflow:start <workflow> <issue link>`, then the note. **Sessions**
lists the starts, with the session's link or what the runner said.

### The laptop runner

The server cannot reach into the laptop, so the laptop asks. Under **Credentials, Laptop runner**,
create a runner for the machine and paste the commands it shows into Terminal: they download the
runner from `/api/runner/script` and install it as a login agent, so it starts with the Mac and
restarts if it stops (its log is `~/agent-dashboard/runner.log`). It needs Node 22.18 or later,
git and Claude Code, logged in; `brew install tmux` for sessions steered from the phone.

It asks for work every five seconds with its own runner token, which can only take and report
starts, never read anything else. It accepts only a known workflow, target and permission mode
and a repository in `owner/name` form; it clones under `~/agent-dashboard/repos` with your own git
credentials, and every command is an argument list, never a shell string. **Revoke** cuts it off.

Without the dashboard, `claude remote-control --spawn worktree` on the laptop is Claude Code's
own way to start sessions from the Claude app; the runner adds the board's issues and workflows.

### Claude cloud routines

For starts with the laptop off, create one routine per repository at
[claude.ai/code/routines](https://claude.ai/code/routines) with that repository selected, give it
the prompt shown under **Credentials, Claude cloud routines** (the routine only sees the fired text
as untrusted until its own prompt says to follow it), add an **API** trigger, and save the
routine's id and token there. The token can fire that routine and nothing else, and is stored in the
vault. Routines allow 30 runs an hour each.

## Merge and close

A board card with a pull request has **Merge** and **Close** buttons, each asking for
confirmation. Merge squash-merges with the pull request's title followed by its number, and
sends the head commit the card shows, so GitHub refuses it if anyone pushed since the board
loaded. Close closes the pull request without merging and leaves the branch. Either way the
board reloads, and a refusal from GitHub (conflicts, required checks or reviews, missing write
permission) is shown as GitHub words it. Merge is off for drafts and conflicting branches.

## Screenshots and videos

A board card with a pull request has an image and a video button at its bottom. The video
opens in a popover and plays on its own. Clicking the screenshot or the video, or its icon
while the preview shows, puts it full screen; on an iPhone the video uses the phone's own
player and the screenshot opens in a new tab. Each comes from the first of:

1. The `pr-preview` artifact of the pull request's head commit, recorded by the shared
   workflow in agent-base. The server downloads it once with the reader's GitHub token (the App
   needs **Actions: read**), keeps it under `<data dir>/pr-media`, and serves it itself.
2. The first image or video in the pull request body. The server sends the browser on to the
   link GitHub signed for that reader, so attachments of private repositories load too; a link
   to any host other than GitHub's is never followed.

A button is greyed out when neither has one.

## Access

Locally, the server only listens on loopback and rejects requests whose `Host` header is not
a loopback name, and mutations from another origin, so a web page elsewhere cannot reach it
through DNS rebinding. The two ingest routes, `/api/events` and `/api/telemetry/v1/metrics`,
take an ingest token instead of a sign-in, in both modes. Cloud mode (`AGENT_DASHBOARD_MODE=cloud`) answers only its own domain,
only over https, and only to a signed-in allowlisted GitHub account; it refuses to start
without all three configured.

## Settings

| Variable                                             | Default                                                   |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `AGENT_DASHBOARD_MODE`                               | `local` (or `cloud`)                                      |
| `PORT`                                               | `4317`                                                    |
| `AGENT_DASHBOARD_HOST`                               | `127.0.0.1`, `0.0.0.0` in cloud mode                      |
| `AGENT_DASHBOARD_PUBLIC_URL`                         | `http://localhost:<PORT>`; required, https, in cloud mode |
| `AGENT_DASHBOARD_GITHUB_APP_CLIENT_ID`               | unset (no sign-in)                                        |
| `AGENT_DASHBOARD_GITHUB_APP_CLIENT_SECRET` / `_FILE` | unset                                                     |
| `AGENT_DASHBOARD_ALLOWED_USERS`                      | unset; required with sign-in                              |
| `AGENT_DASHBOARD_DATA_DIR`                           | `data`                                                    |
| `AGENT_DASHBOARD_REPOS_FILE`                         | `config/repos.json`                                       |
| `AGENT_DASHBOARD_MASTER_KEY` / `_FILE`               | unset (passphrase mode)                                   |
| `VITE_DEMO_MODE` (UI build)                          | unset                                                     |
| `VITE_API_BASE_URL` (UI build)                       | unset (same origin)                                       |

## UI

React 19 with [Radix Themes](https://www.radix-ui.com/themes) (light and dark follow the
system) and [TanStack Table](https://tanstack.com/table) for the sortable tables on Sessions
and Usage. No Tailwind.

## Develop

```sh
pnpm dev                          # API on 4317, UI on 5318
# To sign in through the dev UI, run the API with AGENT_DASHBOARD_PUBLIC_URL=http://localhost:5318
# and register that callback URL on the GitHub App as well.
pnpm lint --max-warnings 0
pnpm typecheck
pnpm test

# The container check CI runs, here for local mode; cloud mode uses docker-compose.cloud.yml
cp .github/ci/local.env .env
docker compose up --build --detach --wait
node --env-file=.env apps/server/src/ops/smoke-test.ts local
```

Agent instructions are in `AGENTS.md`.
