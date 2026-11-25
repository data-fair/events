# Contribution guidelines

## Prerequisites

  - A Javascript/Typescript IDE with [Vue.js](https://vuejs.org/)  and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) support.
  - A recent [Docker](https://docs.docker.com/engine/install/) installation.
  - [Node.js v24.22.1+](https://nodejs.org/)

## Quick start

```bash
npm ci
npm run dev
```

Docker is required: nginx, simple-directory and mongo run in containers; the api and the ui run in the terminal
(Ctrl+C stops them, their logs are in `dev/logs/`). The app is available at <http://localhost:5950/events/dev>.

Then, in another terminal:

```bash
npm test
```

Pull images at first and then once in a while:

```bash
docker compose --profile '*' pull
```

## Run the development servers

The UI is a [Vue](https://vuejs.org/) project built with Vite.

The API is a small [Express](https://expressjs.com) server.

The default ports (5950-5957) are in `dev/default.env`, copied to `.env` the first time: `.env` overrides
`dev/default.env` and is never overwritten. `npm run dev-deps` only starts the containers (extra arguments go
to docker compose, e.g. `npm run dev-deps -- --profile maildev`); `npm run dev` accepts the same arguments.

Each dev process has its own npm script and reads its settings from environment variables (every key of
`dev/default.env`): `npm run dev-setup` (idempotent builds, no container), then `npm run dev:api` and
`npm run dev:ui`, each in its own terminal with the variables of `.env` exported. The production names
(`MONGO_URL`, `PRIVATE_DIRECTORY_URL`...) override the development config. `DEV_LOG_DIR` (default `dev/logs`)
and `DEV_LOG_PREFIX` set where `npm run dev` writes the logs of the processes.

The fixed ports mean one environment per machine: stop the containers of one checkout
(`npm run stop-dev-deps`) before starting another.

To send notifications in the dev environment you can edit and run [send-notifications.ts](dev/scripts/send-notifications.ts),
with the organization that sends them and optionally the user shown as their originator:

```
npm run dev-send-notifications -- <organization id> [<user id>]
```

## Working on types

Update the types based on schemas:

```
npm run build-types
```

## Building docker images

Build images:

```
docker build --progress=plain --target=main -t data-fair/events:dev .
```
