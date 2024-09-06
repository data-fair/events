# Contribution guidelines

## Prerequisites

  - A Javascript/Typescript IDE with [Vue.js](https://vuejs.org/)  and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) support.
  - A recent [Docker](https://docs.docker.com/engine/install/) installation.
  - [Node.js v22+](https://nodejs.org/)

## Install dependencies

Install npm dependencies for all workspaces:
```
npm install
```

Pull images at first and then once in a while:

```bash
ddocker compose pull
```

Then run the containers:

```bash
npm run dev-deps
```

## Work on @data-fair/events/ui

The UI is a [nuxt](https://nuxt.com/) project.

Run a development server (access it here http://localhost:6218/events/):

```
npm run dev-ui
```

## Work on @data-fair/events/api

The API is a small [https://expressjs.com](Express) server.

Run a development server (access it here http://localhost:6218/events/api/):

```
npm run dev-api
```

## Working on types

Update the types based on schemas:

```
npm run build-types
```

## Building docker images

Build images:

```
docker build -f api/Dockerfile -t data-fair/events/api:dev .
docker build -f ui/Dockerfile -t data-fair/events/ui:dev .
```
