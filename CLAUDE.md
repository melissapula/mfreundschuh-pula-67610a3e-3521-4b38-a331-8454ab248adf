<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# TurboVets Assessment — Project Context

Secure Task Management System for the TurboVets full-stack coding challenge.
NX monorepo: NestJS api (`apps/api`), Angular dashboard (`apps/dashboard`),
two shared libs (`libs/data`, `libs/auth`). Full details, architecture
rationale, and access-control design are in `README.md` — read that first for
anything about how the app works. This section is session-to-session status
and open threads only.

## Live deployment

- Dashboard (Cloudflare Pages): https://turbovets-task-dashboard-missa.pages.dev
- API (Fly.io): https://turbovets-task-api-missa.fly.dev/api
- GitHub: https://github.com/melissapula/mfreundschuh-pula-67610a3e-3521-4b38-a331-8454ab248adf
- Demo logins: all four seeded accounts (`owner@acme.test`, `admin@acme.test`,
  `admin.eng@acme.test`, `viewer@acme.test`) share password `Password123!` —
  see README's "Trying the live demo" section for what each role demonstrates.
- Fly.io is on the free trial tier: **hard 5-minute runtime cap per boot**,
  account-level restriction, unrelated to app code. Auto-restarts on the next
  request with a brief cold-start delay. Adding a card to the Fly account
  removes this; that's Missa's call, not something to do unprompted.
- Redeploy commands: `npx nx build api --configuration=production` then
  `flyctl deploy --ha=false` from the workspace root (api); `npx nx build
dashboard --configuration=production` then `npx wrangler pages deploy
dist/apps/dashboard/browser --project-name=turbovets-task-dashboard-missa
--branch=master --commit-dirty=true` (dashboard). `flyctl` isn't on PATH in
  this environment — call it via `"$env:USERPROFILE\.fly\bin\flyctl.exe"` in
  PowerShell, or open a fresh terminal.

## Status as of 2026-08-12

Core build, tests (60 total: 20 libs/auth + 21 api + 19 dashboard), and
deployment are done and verified live. Two security-hardening passes are also
done — see README's "Security hardening" and "Second pass" subsections under
Access Control for the full list of what was fixed (timing attack, rate
limiting, helmet, non-root Docker container, CORS tightening, slimmed Docker
image).

Repo-wide reformat to 4-space indent (`tabWidth: 4` in `.prettierrc`) via
`nx format:write --all`. `package-lock.json` is excluded from Prettier in
`.prettierignore` — npm always writes it 2-space regardless, so reformatting
it was pure ~60k-line churn with no benefit.

GitHub Actions CI (`.github/workflows/ci.yml`) now runs
`nx run-many -t lint --all` and `nx run-many -t test --projects=auth,api,
dashboard` on every push/PR to `master` (`libs/data` has no spec files, so
it's excluded from the test run same as the `test:coverage` npm script).
Turning CI on for the first time surfaced and fixed 15 pre-existing
`dashboard:lint` errors nobody had checked automatically before:
constructor injection → `inject()` across 6 files
(`@angular-eslint/prefer-inject`); `task-form-dialog`'s `@Output() close`
renamed to `closed` (collided with the native DOM `close` event,
`no-output-native`); the `autofocus` attribute replaced with a `ViewChild` +
`ngAfterViewInit()` focus call (`template/no-autofocus`); and an Escape-key
handler added to the dialog so its backdrop-click-to-dismiss has a keyboard
equivalent (`template/click-events-have-key-events`). Converting
`AuthService`/`TasksStore` to `inject()` broke `auth.service.spec.ts` and
`tasks.store.spec.ts`, which had been bypassing Angular DI with
`new AuthService(http)` / `new TasksStore(api)` — both rewritten onto
`TestBed.configureTestingModule()` + `TestBed.inject()`, since `inject()`
requires an active injection context.

## Status as of 2026-08-13

Ran a full-application audit (security + code-quality, both fresh-context
reviews) and fixed everything real it found, across four rounds — later
rounds exist because earlier fixes introduced or missed something, caught
either by a follow-up audit or by actually running the app:

- **Security**: clean, no new findings anywhere in the app. One candidate
  (a hardcoded JWT_SECRET dev fallback in source) was live-tested against
  production with a forged token — correctly rejected, confirming the real
  deployment has its own secret set.
- **Real bugs fixed**: new tasks always got `order: 0` instead of appending
  to the bottom of their column (`tasks.service.ts` now computes the next
  order server-side, scoped by org + status); no error handling on any task
  mutation (`tasks.store.ts`'s `create`/`update`/`remove`/`reorderColumn`
  now surface a `mutationError` signal — deliberately separate from the
  load-gating `error` signal, so a failed mutation doesn't hide an
  already-loaded board — with per-task rollback on `reorderColumn` failure,
  not a whole-array snapshot; a re-audit caught the snapshot silently
  stomping a sibling concurrent call's already-persisted success, then
  caught a narrower intra-call version of the same bug); `TaskCardComponent`'s
  delete-confirm timer wasn't cleared on destroy; missing `@Index()` on
  `organizationId` (both `TaskEntity` and `AuditLogEntity`);
  `AuditLogEntity.actorUserId` was typed non-nullable `uuid` but stored `''`
  for unmatched-email login failures — now nullable, stores `null`.
- **Dialog accessibility** (`task-form-dialog.component.ts`): Escape closing
  mid-IME-composition and discarding unsaved input on both Escape and
  backdrop-click, no focus trap despite `aria-modal="true"`, no focus
  restored to the trigger on close — fixed by adopting Angular CDK's
  `cdkTrapFocus` + `autoCapture` (already a transitive dependency) instead
  of hand-rolled focus management. Escape/backdrop now route through a
  `requestDismiss()` that no-ops on a dirty form; a persistent "Unsaved
  changes" hint in an `aria-live` region, tied directly to `form.dirty`
  (not a timed flash), is the real feedback channel for a blocked dismiss —
  the CSS shake alone was invisible under `prefers-reduced-motion` and
  silent for screen readers.
- **A live regression caught by actually running the app, not just unit
  tests**: adding an `error` `@Input()` to the dialog (to show failed-save
  messages inline, since the board-level banner renders behind the modal)
  meant `ngOnChanges` — which fires for _any_ `@Input` change, not just the
  one being watched for — reset the form and wiped the user's typed input
  the moment a save failed. Caught by killing the local API server and
  submitting for real; fixed with a `changes['task']` guard.
- **`tsconfig.base.json` flipped to `strict: true`** workspace-wide, after
  checking the actual blast radius first: only one call site needed a fix;
  `apps/dashboard` and both libs were already strict-clean.
- **Dev-only `npm audit` findings** (19, all in the nx/webpack toolchain):
  confirmed zero production impact (`--omit=dev` → 0) and left as-is —
  fixing requires a breaking `@nx/webpack` downgrade for no shipped benefit.
- Tests: 60 → 106. Lint clean, both production builds clean, CI green
  throughout.
- **Both apps redeployed** (Fly.io + Cloudflare Pages) and the fixes
  live-verified against production directly — logged in, created a task,
  watched it land at the bottom of the column and the "Unsaved changes"
  hint appear, then cleaned up the test data. `master`, CI, and the live
  demo are all in sync as of this deploy.

Still outstanding: the required hiring-team walkthrough video itself (an
outline exists, not committed to the repo — see memory) and its link in
the README, which still has the submission placeholder.

## Open follow-up: frontend CSP (not shipped)

Adding a `Content-Security-Policy` header to the Cloudflare Pages `_headers`
file reliably broke Tailwind's styling (DOM/text rendered fine, zero styles
applied), across many bisection attempts, without a conclusive root cause.
Notes for picking this back up:

- A lone `Content-Security-Policy: style-src 'self' 'unsafe-inline'` worked
  fine on its own.
- Adding almost any other directive — `default-src 'self'`, `script-src
'self'`, even directives that shouldn't interact with style application at
  all — broke it, which doesn't match documented CSP directive semantics
  (more-specific directives like `style-src` are supposed to fully override
  `default-src` for their category, independent of other directives).
- Complication: the production Cloudflare Pages domain
  (`turbovets-task-dashboard-missa.pages.dev`) intermittently served
  **stale cached content** across test iterations — several "broken" results
  turned out to be old cached responses, not the actual current deployment.
  Always verify against the deployment's own unique preview URL (the
  `https://<hash>.turbovets-task-dashboard-missa.pages.dev` link `wrangler
pages deploy` prints) first, and only trust the production domain's
  behavior after confirming the preview URL is correct — ideally with a
  hard cache bypass (unique query param + `Cache-Control: no-cache`, and
  check via `curl`, not just the browser, since the browser has its own
  cache layer too).
- Currently shipped: 5 headers with no CSP (`X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `Strict-Transport-Security`), all verified live. File:
  `apps/dashboard/public/_headers`.
- The api's own CSP (via `helmet()` in `apps/api/src/main.ts`) is unrelated
  and unaffected — that one works fine, this is a Tailwind/Cloudflare-Pages/
  browser-specific frontend issue.
- Worth trying next: test locally against a plain static file server (no
  Cloudflare Pages in the loop) with the same CSP to isolate whether
  Cloudflare's header delivery is part of the problem; or try Chrome
  DevTools' own Network/Security panel directly (not through browser
  automation) to see the CSP violation reports Chrome should be logging,
  which the automation's console-reading tool never captured despite
  multiple attempts — worth confirming whether that's a tool limitation or a
  genuine absence of violations (which would itself be a clue).
