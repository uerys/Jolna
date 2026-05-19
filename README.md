# Recovry

Recovry is a physiotherapy rehab platform a capstone for paragon university.

## Requirements

- Node.js 20+ and pnpm
- Docker Desktop for the MySQL container

## Quick Start

1. Start the database.

```bash
pnpm db:up
```

2. Create a `.env` file in the project root with the local values below.

```bash
DATABASE_URL=mysql://root:password@localhost:3306/appdb
JWT_SECRET=replace-with-a-long-random-secret
```

Optional environment variables can be left blank for local development:

```bash
VITE_APP_ID=
OAUTH_SERVER_URL=
OWNER_OPEN_ID=
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
```

3. Apply the database schema.

```bash
pnpm db:push
```

4. Seed the demo records.

```bash
node scripts/seed.mjs
```

5. Start the app.

```bash
pnpm dev
```

The app runs on the localhost URL printed in the terminal, usually `http://localhost:3000`.

## Docker Compose (Backend + DB)

The repository includes a `docker-compose.yml` stack with:

- `backend`: Node.js production container on port `3000`
- `db`: MySQL 8.4 on port `3306`

For local Docker:

```bash
docker compose up -d --build
```

For Portainer Stack deployment, set at least:

- `JWT_SECRET` (required, long random value)
- `MYSQL_ROOT_PASSWORD` (recommended override from default)
- `MYSQL_DATABASE` (optional, defaults to `appdb`)

Then deploy the stack from this repository and expose port `3000` for the app.

## Demo Credentials

The seed script creates the following local accounts, all using the same password:

- `admin@recovry.local`
- `physio@recovry.local`
- `client@recovry.local`

Password: `Password1!`

## Available Scripts

- `pnpm check` runs the TypeScript type check.
- `pnpm test` runs the test suite.
- `pnpm format` formats the codebase.
- `pnpm db:logs` follows the MySQL container logs.
- `pnpm db:down` stops the database container.
- `pnpm db:cli` opens a MySQL shell in the container.

## Seeding

Running `node scripts/seed.mjs` is safe to repeat. It upserts the demo users, exercises, assignments, and feedback logs so you can reseed after a reset without manually clearing the database.

## API Endpoints

- `GET /api/health` checks database connectivity.
- `GET /api/notes` lists notes.
- `POST /api/notes` creates a note with a JSON body such as:

```json
{ "content": "hello" }
```
