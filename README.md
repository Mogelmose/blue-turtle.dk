# Blue Turtle Web App

Vibecoded Website for the Turtle Boys. This is a full-stack web application built with Next.js, using Prisma for database management and NextAuth.js for authentication.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

**Docker + docker-compose** (recommended for running the full stack).

## Run With Docker (recommended)

### First-time setup

1. Clone the repo and enter the webapp directory:

```bash
git clone https://github.com/Mogelmose/blue-turtle.dk.git
cd blue-turtle.dk/blue-turtle-webapp
```

2. Create runtime env file:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `NEXTAUTH_SECRET` (generate with `npx auth secret` or `openssl rand -base64 32`)
- `NEXTAUTH_URL` (usually `http://localhost:3000`)
- `UPLOADS_HOST_PATH` (optional, defaults to `./.data/uploads`)

3. Create a seed script from the template:

```bash
cp prisma/template_seed.js prisma/seed.js
```

Edit `prisma/seed.js` with your users, albums, and `passwordEnvVar` values.

4. Add seed values to `.env`:

- `DATABASE_URL=postgresql://<user>:<pass>@db:5432/<db>?schema=public`
- `PASSWORD_*` entries that match the `passwordEnvVar` values in `prisma/seed.js`

5. Build and start the stack:

```bash
docker-compose build
docker-compose up -d
```

On first startup, the web container runs `prisma migrate deploy` automatically and creates the schema. On later startups it will only apply new migrations if any exist.

6. Seed the database once (disposable container):

```bash
docker-compose run --rm web node prisma/seed.js
```

The app should now be running at <http://localhost:3000>

### Subsequent starts

On later runs, you do not need to seed again:

```bash
docker-compose up -d
```

If you ever need to re-seed, clear the database or drop the volume and run the seed step again.

## Local Dev (recommended for development)

This setup runs Postgres in Docker and the Next.js app locally with live reload.

1. Clone the repo and enter the webapp directory:

```bash
git clone https://github.com/Mogelmose/blue-turtle.dk.git
cd blue-turtle.dk/blue-turtle-webapp
```

2. Create a local env file:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `DATABASE_URL` to match your active run target - for local dev use "localhost"
- `UPLOAD_ROOT` (optional, e.g. `./.data/uploads`)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

3. Start Postgres only (with a host port):

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
```

Tip: if you want a shorter command, set `COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml` in your shell and then use `docker-compose up -d db`.

4. Install deps and apply migrations:

```bash
npm install
npx prisma migrate deploy
```

5. (Optional) Seed the database:

```bash
node prisma/seed.js
```

6. Run the dev server:

```bash
npm run dev
```

Note: For Docker production runs, `DATABASE_URL` should point to `blue_turtle_db` instead of `localhost`.
