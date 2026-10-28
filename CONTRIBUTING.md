# Contribution guidelines

## Prerequisites

  - A Javascript/Typescript IDE with [Vue.js](https://vuejs.org/)  and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) support.
  - A recent [Docker](https://docs.docker.com/engine/install/) installation.
  - [Node.js v22+](https://nodejs.org/)

## Install dependencies

Install npm dependencies for all workspaces, then generate `.env` (ports), the types and the UI build:
```
npm ci
npx --no df-dev setup
```

Pull images at first and then once in a while:

```bash
docker compose --profile '*' pull
```

## Run the development servers

The UI is a [nuxt](https://nuxt.com/) project.

The API is a small [https://expressjs.com](Express) server.

The development servers run in a [zellij](https://zellij.dev/) (>= 0.44) session, see `@data-fair/lib-dev`:

```
npm run dev-zellij
# with optional containers
npm run dev-zellij -- --services maildev
```

To send notifications in the dev environment you can edit en run [send-notifications.ts](dev/scripts/send-notifications.ts):

```
npm run dev-send-notifications
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
