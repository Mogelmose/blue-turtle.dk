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
