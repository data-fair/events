# Development notes for events

## Typing

Types are mostly managed from JSON schemas (for example @api/types/subscription/schema.js), prepared using `npm run build-types` and imported from #types which is an alias for @api/types/index.ts.

## Quality checks

1. Linter: `npm run lint-fix`
2. Type checking: `npm run check-types`
3. Docker build passing: `docker build -t events .`

## Dev environment

Development processes (dev-api, dev-ui, docker compose services) are managed by the user, not by you. **Never attempt to start, stop, restart, or kill any dev process or container.**

### Checking status

Run `bash dev/status.sh` to see which services are up or down. This probes all known endpoints and reports their status. Always use this when:
- A test fails with a connection error
- You suspect a service might be down
- Before reporting an environment issue to the user

### Consulting logs

Log files are in `dev/logs/`:
- `dev/logs/dev-api.log` — API server (nodemon). Check this for startup failures or runtime errors.
- `dev/logs/dev-ui.log` — UI dev server (vite).
- `dev/logs/docker-compose.log` — All docker compose services (nginx, simple-directory, mongo).

Use `tail -n 50 dev/logs/<file>` to see recent output, or `grep -i error dev/logs/<file>` to find errors.

### When something is down

If a service is down, do not try to fix the infrastructure. Instead:
1. Run `bash dev/status.sh` to identify what's down.
2. Check relevant logs in `dev/logs/` for errors.
3. Report the problem clearly to the user with the status output and any relevant log lines.

Port assignments are in `.env`. Do not modify them.

## Testing

Run tests: `npm run test`
Run specific tests: `npm run test tests/events.api.spec.ts`

If a test fails with a connection error, run `bash dev/status.sh` to diagnose, then stop and ask the user for help.

Test users are defined in @dev/resources/users.json and organizations in @dev/resources/organizations.json. Modify these as little as possible, but if you do you need to force reload of the simple-directory container `docker compose restart simple-directory`.

Scope tests use the non-human identity `test1-scope-nhi` (admin of `test1`, declared in @dev/resources/users.json) through `nhiSession(scope?)` in @tests/support/nhi.ts: it returns cookie and bearer clients for a session limited to the requested scope. It needs the simple-directory `master` image (scoped NHI token exchange, `MANAGE_NHIS`).

Tests are separated in playwright projects: unit (pure functions), api (stateful API endpoints through HTTP) and e2e (UI with playwright browser instrumentation). When working on the e2e part you can use subagents `playwright-test-generator` and `playwright-test-healer`.

In case of failures you might find error contexts in @test-results.

### Debugging e2e failures

When e2e tests fail, follow this order:
1. Use the Playwright MCP tools (`browser_open`, `browser_navigate`, `browser_snapshot`, `browser_console_messages`) to inspect failing pages — do NOT write custom Playwright scripts
2. Check `test-results/` for traces and screenshots
3. Only then dig into component code

## Scopes

events is scope-aware (`session.init(..., { scopeAware: true })`): a session whose token carries a `scope` claim can only be read on routes that checked a scope, otherwise it gets 403. Scoped sessions are not specific to non-human identities: today they come from the NHI token exchange, later also from human users authorizing OAuth client applications. Sessions without a `scope` claim and internal secret calls are not affected.

- The vocabulary (`notifications`, `events`, `webhooks` families, declared with `defineScopes` from `@data-fair/lib-common-types/scopes.js`, which adds the global `all:read` / `all:write` / `all:admin`) and the operation table live in @api/src/shared/scopes.ts.
- Every new route that reads the session gets a row in `scopedOperations` and `requireOperationScope('<operationId>')` as its first handler. Without one it stays refused to scoped sessions, as push registrations and admin routes are on purpose.
- A new websocket channel needs a case in `channelScopes`, otherwise scoped sessions cannot subscribe to it.
- `GET /api/api-docs.json` (@api/contract/api-docs.ts, built from the same table) is the document data-fair merges into the platform document: keep it independent of the request origin (data-fair fetches it over the private url) and keep each accepted scope as its own `security` alternative. Edit the table, not the document.
- Tests: @tests/scopes.unit.spec.ts and @tests/scopes.api.spec.ts, with `nhiSession` (see Testing).

## Code patterns

When working on this project, read the following files on a need-to-know basis to understand conventions:

- API route pattern: @api/src/subscriptions/router.ts
- Vue page pattern: @ui/src/pages/
- Unit test pattern: @tests/subscriptions.unit.spec.ts
- API test pattern: @tests/subscriptions.api.spec.ts
- E2E test pattern: @tests/subscriptions.e2e.spec.ts
- Type generation from JSON schemas: @api/types/subscription/schema.js
