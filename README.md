# Recovry

Recovry is a specialized physiotherapy rehab platform supporting three user tiers: admins, physiotherapists, and clients. Created as a Paragon University capstone project, the application is powered by a Node.js backend.

## What The App Does

- Admins manage users and assignments.
- Physiotherapists track client progress and review recovery history.
- Clients see today’s routine, complete exercises, and log feedback.

## Requirements

- Node.js 20+ and npm
- Docker Desktop for the MySQL container

This repository is set up for `npm` and `package-lock.json`. Use `npm` commands for local development.

## Quick Start

Choose one workflow and stick to it:

- Docker Compose for the full app + database stack.
- Host-based development if you want to run the app from your machine and only use Docker for MySQL.

Do not run the Docker app container and `npm run dev` on the host at the same time. They both want port `3000`.

### Recommended: Docker Compose

1. Start the full stack.

```bash
docker compose up --build
```

2. Open the app in your browser.

```text
http://localhost:3000
```

3. Sign in with one of the demo accounts after the first seed run.

### Host-based Development

1. Start the database.

```bash
npm run db:up
```

2. Install dependencies.

```bash
npm install
```

3. Create a `.env` file in the project root.

```bash
DATABASE_URL=mysql://root:password@localhost:3306/appdb
JWT_SECRET=replace-with-a-long-random-secret
```

Optional environment variables used by the current app can be left blank for local development:

```bash
VITE_APP_ID=
OAUTH_SERVER_URL=
OWNER_OPEN_ID=
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
```

4. Apply the database schema.

```bash
npm run db:push
```

5. Seed the demo records.

```bash
node scripts/seed.mjs
```

6. Start the app.

```bash
npm run dev
```

The app runs on the localhost URL printed in the terminal, usually `http://localhost:3000`. If port `3000` is already busy, stop the other app first.

## Main Routes

The current client routes are:

- `/` landing page and role-based redirect
- `/login` sign in
- `/register` sign up
- `/admin/users` admin user management
- `/physio` physiotherapist dashboard
- `/physio/clients/:id` physiotherapist client detail view
- `/client/exercises` client daily plan
- `/client/history` client recovery history

## Backend Surface

The backend is exposed through tRPC at `/api/trpc`.

Main router groups currently available:

- `system`
- `auth`
- `admin`
- `physio`
- `clientApp`
- `settings`

There is also a health check route used by the app runtime.

## Docker Compose (Local Dev)

The repository includes a `docker-compose.yml` stack with:

- `app`: Node.js development container on port `3000`
- `db`: MySQL 8.4 on port `3306`

The compose file uses local-dev defaults, so no extra env file is required for the common case. If you want different credentials, edit `docker-compose.yml` before starting the stack.

If you only want the database container for host-based development, you can still use:

```bash
npm run db:up
```

## Demo Credentials

The seed script creates the following local accounts, all using the same password:

- `admin@recovry.local`
- `physio@recovry.local`
- `client@recovry.local`

Password: `Password1!`

## Available Scripts

- `npm run check` runs the TypeScript type check.
- `npm run test` runs the test suite.
- `npm run format` formats the codebase.
- `npm run db:logs` follows the MySQL container logs.
- `npm run db:down` stops the database container.
- `npm run db:cli` opens a MySQL shell in the container.

## Seeding

Running `node scripts/seed.mjs` is safe to repeat. It upserts the demo users, exercises, assignments, and feedback logs so you can reseed after a reset without manually clearing the database.

## Troubleshooting

- If the schema gets out of sync or the seed script complains about missing tables, run `docker compose down -v` to reset the database volume, then repeat the setup steps.
- If you see a port conflict on `3000`, make sure only one app process is running: either the Docker app container or `npm run dev` on the host.
- If you change the database schema, rerun `npm run db:push` before seeding.
