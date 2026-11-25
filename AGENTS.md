# Development notes for events

## Typing

Types are mostly managed from JSON schemas (for example @api/types/subscription/schema.js), prepared using `npm run build-types` and imported from #types which is an alias for @api/types/index.ts.

## Quality checks

1. Linter: `npm run lint-fix`
2. Type checking: `npm run check-types`
3. Docker build passing: `docker build -t events .`

## Dev environment

Docker runs the containers (nginx, simple-directory, mongo; `maildev` is optional, compose profile `maildev`);
the api and the ui run as node processes.

- `npm run dev` — the containers (`npm run dev-deps`), then the api and the ui in the terminal (Ctrl+C stops
  them), at `http://localhost:5950/events/dev`. Their logs are in `dev/logs/` (`DEV_LOG_DIR`, `DEV_LOG_PREFIX`);
  `npm run dev` accepts docker compose arguments (`-- --profile maildev`).
- `npm run dev-deps` — the containers only, plus `npm run dev-setup`.
- `npm run dev-setup` — idempotent builds (types, ui), no container.
- `npm run dev:api`, `dev:ui` — one process each, with the variables of `.env` exported.
- `npm run stop-dev-deps` — stops the containers.

Default ports (5950-5957) are in `dev/default.env`, copied to `.env` the first time: `.env` overrides it and is
never overwritten. Production names (`MONGO_URL`, `PRIVATE_DIRECTORY_URL`...) override
`api/config/development.mjs`.

- Read the logs before restarting: nodemon (api) and vite (ui) already reload on file changes.
- Do not start, stop or restart the dev processes or containers of the user: ask.
- Never `npm ci` / `npm install` while the env runs.

Design specs and implementation plans are not kept in this repository; durable architecture docs live in `docs/architecture/`.

## Testing

Run tests: `npm run test` (`npm run test-api-fast` stops at the first api failure while iterating)
Run specific tests: `npm run test tests/features/events/events.api.spec.ts`

On a failure the last lines of the api logs are attached to the trace (`npx playwright show-trace test-results/<test>/trace.zip`); per-test durations of the last run are in `dev/logs/test-timings.json`. Keep the 30 s test timeout (hooks included): a heavy spec calls `test.slow()`. e2e sessions come from simple-directory's API (@tests/fixtures/login.ts), not its login form.

If a test fails with a connection error, read the api logs (`dev/logs/api.log` by default) to diagnose, then stop and ask the user for help.

Test accounts live in simple-directory's mongo storage, in the prefixed sub-space `test_events_` (@tests/support/sd-fixtures.ts): @tests/global-setup.ts upserts them before the spec files are loaded (they log in at import time), and @tests/state-setup.ts cleans and seeds them again under the stateful lock (@tests/support/stateful-lock.ts: one api/e2e run at a time). `clean()` and the state setup call `DELETE /api/test-env?prefix=test_events_`, which removes only what the accounts of that prefix own (400 without a valid `test_<suite>_` prefix): other sub-spaces sharing the database are left alone. Every test account uses the password `passwd`; `test_events_superadmin@test.com` is the simple-directory admin.

The repository ships no dev data. To play around manually, seed an account of your own through the same test API (`POST /api/test-env/seed`, as @tests/support/sd-fixtures.ts does), under another prefix than `test_events_`, so that the tests never clean it; `npm run dev-send-notifications -- <organization id>` then sends that organization's notifications.

Scope tests use the non-human identity `test_events_org1_scope_nhi` (admin of `test_events_org1`, declared in @tests/support/sd-fixtures.ts) through `nhiSession(scope?)` in @tests/support/nhi.ts: it returns cookie and bearer clients for a session limited to the requested scope. It needs the simple-directory `master` image (scoped NHI token exchange, `MANAGE_NHIS`).

Specs live in `tests/features/<feature>/` (`<name>.unit|api|e2e.spec.ts`); setups, fixtures and support helpers stay at the root of `tests/`. Tests are separated in playwright projects: unit (pure functions), api (stateful API endpoints through HTTP) and e2e (UI with playwright browser instrumentation). When working on the e2e part you can use subagents `playwright-test-generator` and `playwright-test-healer`.

In case of failures you might find error contexts in @test-results.

Webhook targets: `startHookServer(handler)` in @tests/support/hook-server.ts listens on a port picked by the OS (never a fixed port: worktrees running their tests at the same time would receive each other's deliveries); `closedPortUrl` is a target where nothing listens.

Quality gates:

| When | What |
|---|---|
| commit (`.husky/pre-commit`) | `npm run lint` |
| push (`.husky/pre-push` → `dev/pre-push.sh`) | type check, unit tests, the `@smoke` api/e2e tests, and the api/e2e spec files changed since `origin/main` |
| pull request, release tag (`reuse-quality.yml`) | lint, types, UI build, audit, and the whole unit/api/e2e suite |

`@smoke` (`test('...', { tag: '@smoke' }, ...)`) marks a few fast tests over the core flows (event push, subscription and notification, webhook creation, scoped session, subscriptions and notifications pages). Tag a test only if it is fast and covers a path many features depend on. `npm run quality` runs the full gate locally.

### Debugging e2e failures

When e2e tests fail, follow this order:
1. Use the Playwright MCP tools (`browser_navigate`, `browser_snapshot`, `browser_console_messages`) to inspect failing pages — do NOT write custom Playwright scripts
2. Check `test-results/` for traces and screenshots
3. Only then dig into component code

## Scopes

events is scope-aware (`session.init(..., { scopeAware: true })`): a session whose token carries a `scope` claim can only be read on routes that checked a scope, otherwise it gets 403. Scoped sessions are not specific to non-human identities: today they come from the NHI token exchange, later also from human users authorizing OAuth client applications. Sessions without a `scope` claim and internal secret calls are not affected.

- The vocabulary (`notifications`, `events`, `webhooks` families, declared with `defineScopes` from `@data-fair/lib-common-types/scopes.js`, which adds the global `all:read` / `all:write` / `all:admin`) and the operation table live in @api/src/shared/scopes.ts.
- Every new route that reads the session gets a row in `scopedOperations` and `requireOperationScope('<operationId>')` as its first handler. Without one it stays refused to scoped sessions, as push registrations and admin routes are on purpose.
- A new websocket channel needs a case in `channelScopes`, otherwise scoped sessions cannot subscribe to it.
- `GET /api/api-docs.json` (@api/contract/api-docs.ts, built from the same table) is the document data-fair merges into the platform document: keep it independent of the request origin (data-fair fetches it over the private url) and keep each accepted scope as its own `security` alternative. Edit the table, not the document.
- Tests: @tests/features/scopes/scopes.unit.spec.ts and @tests/features/scopes/scopes.api.spec.ts, with `nhiSession` (see Testing).

## Logging

Server code logs through `import log from '@data-fair/lib-node/log.js'` (pino: JSON on stdout in production, pretty in dev); the full API is in the "Logging" section of the `@data-fair/lib-node` README. eslint `no-console` applies to `api/src/**` and `api/index.ts`.

- `log.info|warn|alert|error(msg, { code?, err?, ...fields })`: `code` is a **static string**, ids go in their own fields (`notificationId`, `webhookId`), the error in `err`, never in the message.
- `error` is for internal failures only (counted in `df_logs`, alerting). Client errors, what a remote refuses (a device, a webhook target) and deprecated calls are `warn`; `alert` is not a failure but deserves the same scrutiny.
- The actor (`ip`, `host`, `userId`, `accountKey`…) is never passed by hand. `app.ts` opens `ip` / `host` for every request and `session.middleware()` adds the actor on the routers that read the session. It is not mounted globally: it answers 401 to a broken cookie, which public routes must keep ignoring.
- The account an action is about goes in `owner*` fields (@api/src/shared/log-fields.ts); `accountKey` stays the actor's. The workers have no request context: they name what they work on.
- Never log a device registration (its keys let anyone push to the device), the `header` of a webhook subscription (a secret of the target) nor a full webhook url (log its host).
- `debug` call sites work as before and go through the logger (`DEBUG=ns`), the same rule applies to them.

## Code patterns

When working on this project, read the following files on a need-to-know basis to understand conventions:

- API route pattern: @api/src/subscriptions/router.ts
- Vue page pattern: @ui/src/pages/
- Unit test pattern: @tests/features/subscriptions/subscriptions.unit.spec.ts
- API test pattern: @tests/features/subscriptions/subscriptions.api.spec.ts
- E2E test pattern: @tests/features/subscriptions/subscriptions.e2e.spec.ts
- Type generation from JSON schemas: @api/types/subscription/schema.js
