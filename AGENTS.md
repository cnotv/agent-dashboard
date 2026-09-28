# agent-dashboard

One dashboard, run locally or from a single Docker image, for every Claude Code and Codex
session, the issues and pull requests they work on, each pull request's screenshot, video and
check gates, and the agent instructions shared across repositories.

<!-- agent-base:start -->
## Shared agreements

These rules come from `cnotv/agent-base` and apply to every repository that carries this
block. The block is managed: edit it in agent-base, never here, and let the dashboard's
"Sync" open the pull request that updates it. What is specific to this repository lives
outside the block, under **Project facts** and the repository's own sections.

### How work starts

Run the `start` skill first. It classifies the request and names the workflow to follow.
Every workflow that changes the repository opens an issue, a branch and a draft pull request,
in that order, before any code:

1. **The issue.** One that already exists is read, comments included; otherwise it is written
   from the request. If intent, scope or expected behaviour is unclear, ask one focused
   question covering everything missing, wait, and write it from the answer.
2. **The branch**, off main, named `<type>/<issue-number>-<description>`. A fresh branch every
   time, never the current one, never reused.
3. **The draft pull request**, opened at the first commit rather than the last, carrying
   `Closes #<issue-number>` and kept current as the work moves.

`start-issue` covers the first two steps and `open-pr` the third. Tests come first, except for
an exploratory prototype, which still owes them before the pull request is marked ready.

### Working agreements

- **Ask before assuming.** If intent, scope or expected behaviour is unclear, ask one focused
  question covering everything missing, and wait.
- **Give an opinion.** When asked what you think, say what you would do and why. Never stop at
  "it depends".
- **Write it once, at the length it earns.** Prose that repeats the diff or restates something
  already written is noise. Each kind of writing has one home, listed under Project facts.
- **Never loosen a lint rule to pass it**, never use `eslint-disable` in any form, and never
  `--no-verify`. If a hook or a rule fails, it is usually right.
- **No emoji** anywhere — code, comments, UI text, commit messages, documentation — unless
  explicitly requested.
- **Prefer a debugger over logging.** When a fix has failed twice, add logging at the relevant
  paths to see the real runtime values before trying again.

### Code

- **TypeScript only**, no `any`, and never `as SomeType` on unvalidated external data.
- **Functional style.** No classes, no `for` / `while` loops; prefer pure functions and `const`,
  and return new values rather than mutating.
- **Long descriptive names**, small single-purpose functions.
- **Exported types live in a types module** containing only type declarations.
- **Config files hold data, never logic.**
- **Update every call site** when a signature, type or export changes. No overloads, shims or
  deprecated aliases to keep old callers working.
- **Comments explain why, never what.**
- **DRY and KISS.** Extract a pattern the second time it appears; prefer the simplest thing
  that works. Reuse what the repository already has before writing something new.

### Git

- Branches are `<type>/<issue-number>-<description>` (`feat`, `fix`, `docs`, `refactor`,
  `test`, `chore`).
- **Rebase, never merge**: `git fetch origin main && git rebase origin/main`, then
  `git push --force-with-lease`, never `--force`, never `git pull`.
- **Commit subjects never reference an issue number.** Write `<type>: <summary>`; the branch
  carries the number and the pull request body carries `Closes #<issue-number>`.

### Pull request evidence

A pull request that changes anything visible carries one screenshot and one video. The
shared `pr-preview` workflow records both from the running app; put a `Preview route: /path`
line in the body when the change is not on the default route.

### Definition of done

- [ ] The repository's checks listed under Project facts pass, and you saw them pass
- [ ] The repository's own done-checklist under Project facts is walked
- [ ] The issue and the pull request still describe the work accurately
- [ ] Every artifact the issue named exists
<!-- agent-base:end -->

## Rules for this repository

- **Credentials never leave the server in clear.** No route returns a secret value, no log line
  or error carries one (errors go through the redactor), and values reach child processes
  only through their environment, never their arguments or a file.
- **Every request is checked for a loopback Host header, and mutations for a same-origin JSON
  body.** Loopback binding alone does not stop DNS rebinding; keep the guard in front of any
  new route.
- **External data is parsed with zod before use.** GitHub responses, request bodies and
  `config/repos.json` never reach the code as a cast.
- **The UI is React with Radix Themes.** Views compose Radix Themes components (and the Radix
  primitives it re-exports through `radix-ui`); no hand-made buttons, dialogs, badges or form
  controls. Tables are TanStack Table driving `Table` from Radix Themes. No Tailwind: the only
  app CSS is `apps/web/src/styles.css`, written against the Radix Themes tokens.
- Types shared by server and web live in `packages/contracts/src/types.ts`.

## Project facts

- **Install:** `pnpm install`
- **Dev server:** `pnpm dev` — API on `http://localhost:4317`, UI on `http://localhost:5318`
  with `/api` proxied
- **Production:** `pnpm build && pnpm start`, or `docker compose up` (published on 127.0.0.1)
- **Routes:** `/issues`, `/credentials`
- **Checks:** `pnpm lint --max-warnings 0`, `pnpm typecheck`, `pnpm test`
- **Docs home:** `README.md`
- **Preview deploys:** none
- **Scoped rules:** none yet
- **Local skills:** none

### Done checklist

- [ ] A new route is guarded by the Host and origin middleware and has a test
- [ ] A new secret kind is listed in `apps/server/src/secrets/definitions.ts` with a tester
- [ ] A new shared type is in `packages/contracts/src/types.ts`
- [ ] New UI uses Radix Themes components and theme tokens, and was looked at in light, dark
      and phone widths
