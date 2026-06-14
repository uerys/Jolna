# JOLNA

JOLNA is a specialized physiotherapy rehab platform supporting three user tiers: admins, physiotherapists, and clients. Created as a Paragon University capstone project, the application is powered by a Node.js backend.

## What The App Does

- Admins manage users roles and permissions.
- Physiotherapists track client progress and review recovery history, assigns post rehab exercises to clients.
- Clients see today’s routine, complete exercises, and log feedback.

## Requirements

- Node.js 20+ and npm
- Docker Desktop for the MySQL container

This repository is set up for `npm` and `package-lock.json`. Use `npm` commands for local development.

## Quick Start

The database is run via a Docker container, while the application runs on your host machine.

### 1. Start the Database
## Docker Compose

The repository includes a `docker-compose.yml` configuration to host the database container:

- `db`: MySQL 8.4 on port `3306`

Start the database container using:
```bash
npm run db:up
```

### 2. Install Dependencies
Install the project dependencies:
```bash
npm install
```

### 3. Create Environment Configuration
Create a `.env` file in the project root:
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

### 4. Apply Database Schema & Migrations
Apply the database schema:
```bash
npm run db:push
```

### 5. Seed the Demo Records
Seed the demo accounts and default exercises:
```bash
node scripts/seed.mjs
```

### 6. Start the App
Start the development server:
```bash
npm run dev
```

The app runs on the localhost URL printed in the terminal, usually `http://localhost:3000`.
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

## Demo Credentials

The seed script creates the following local accounts, all using the same password:

- `admin@jolna.local`
- `physio@jolna.local`
- `client@jolna.local`

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
- If you change the database schema, rerun `npm run db:push` before seeding.
