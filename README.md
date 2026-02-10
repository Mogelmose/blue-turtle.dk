# Blue Turtle Web App

Vibecoded Website for the Turtle Boys. This is a full-stack web application built with Next.js, using Prisma for database management and NextAuth.js for authentication.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

**Docker + docker compose** (recommended for running the full stack).
**Bun** (required for local dev outside Docker).

## Run With Docker (recommended)

### Compose files

- `docker-compose.yml` is the base stack and uses internal networks.
- `docker-compose.prod.yml` only defines external networks for live deployment.
- `docker-compose.dev.yml` only exposes the DB port for local `bun run dev`.

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
- `NEXTAUTH_SECRET` (generate with `bunx auth secret` or `openssl rand -base64 32`)
- `NEXTAUTH_URL` (usually `http://localhost:3000`)
- `HOST_UPLOAD_ROOT` (optional, defaults to `./.data/uploads`)

3. Create a seed script from the template:

```bash
cp prisma/template_seed.js prisma/seed.js
```

Edit `prisma/seed.js` with your users, albums, and `passwordEnvVar` values.
If you seed cover images or avatars, put the files in `prisma/seed-assets`
and keep their filenames matched to the `coverAsset`/`avatarAsset` entries.
The seed script copies them into the upload root using the same folder layout
as runtime uploads.

4. Add seed values to `.env`:

- `PASSWORD_*` entries that match the `passwordEnvVar` values in `prisma/seed.js`
Optional:
- `SEED_OVERWRITE_ASSETS=true` in seed.js to overwrite existing seeded images

5. Build and start the stack:

```bash
Use buildkit to only keep the final images and base images from the build process

**Linux/macOS**
DOCKER_BUILDKIT=1 docker compose build web migrate

**Powershell**
$env:DOCKER_BUILDKIT=1; docker compose build web migrate

docker compose --profile migrate run --rm migrate
docker compose up -d
```

Run the migrate step whenever you add new migrations. It no longer runs automatically on container startup.

6. Seed the database once

```bash
docker compose exec web node prisma/seed.js
```

The app should now be running at <http://localhost:3000>

### Production (external networks)

The live deployment uses external networks so their interface names stay stable for firewall rules.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

This expects the external networks to already exist:
- `app_network`
- `proxy_network`

### Subsequent starts

On later runs, you do not need to seed again:

```bash
docker compose up -d
```

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
- `DEV_UPLOAD_ROOT` (recommended, e.g. `./.data/uploads`)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

3. Start Postgres only (with a host port):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
```

Tip: if you want a shorter command, set `COMPOSE_FILE=docker compose.yml:docker compose.dev.yml` in your shell and then use `docker compose up -d db`.

4. Install deps and apply migrations:

```bash
bun install
bunx prisma migrate deploy
```

5. (Optional) Seed the database:

```bash
bun prisma/seed.js
```

6. Run the dev server:

```bash
bun run dev
```

Note: For Docker production runs, `DATABASE_URL` should point to `db` instead of `localhost`. This is already set in `docker-compose.yml` for `web` and `migrate`.

## Background Jobs (Docker)

The web container starts a lightweight job runner (in the same container) for:

- HEIC/HEIF conversion caching
- Video poster generation (for previews)
- EXIF metadata extraction

It starts automatically with the web server. To disable it, set `RUN_WORKER=false` in your environment. If disabled, conversions will only happen on-demand.
## Upload Root Variables

Set only one of these depending on how you run the app:
- `HOST_UPLOAD_ROOT` when running the webapp in Docker (maps host uploads to `/uploads`).
- `DEV_UPLOAD_ROOT` when running the webapp locally (where the app reads/writes uploads).

Note: the Docker container defaults to `/uploads`, so you can omit `DEV_UPLOAD_ROOT` there.
For local dev, keep `DEV_UPLOAD_ROOT` set so seeded and uploaded images resolve correctly.
