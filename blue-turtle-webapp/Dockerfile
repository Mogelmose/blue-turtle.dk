FROM oven/bun:slim AS bun-base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libssl3 adduser \
  && rm -rf /var/lib/apt/lists/*

FROM bun-base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM bun-base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
RUN bunx next build

FROM bun-base AS prisma-cli
WORKDIR /prisma-cli
COPY package.json ./
RUN bun -e "import { readFileSync, writeFileSync } from 'fs'; const pkg = JSON.parse(readFileSync('./package.json', 'utf8')); const ver = pkg.devDependencies?.prisma ?? pkg.dependencies?.prisma ?? '6.19.0'; writeFileSync('./package.json', JSON.stringify({ private: true, dependencies: { prisma: ver } }, null, 2));"
RUN bun install --production

FROM node:20-slim AS runtime-deps
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg libde265-0 \
  && echo "deb http://deb.debian.org/debian bookworm-backports main" > /etc/apt/sources.list.d/bookworm-backports.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends -t bookworm-backports libheif1 libheif-examples \
  && rm -rf /usr/local/lib/node_modules/npm \
  /usr/local/bin/npm \
  /usr/local/bin/npx \
  && rm -rf /var/lib/apt/lists/*

FROM bun-base AS migrate
WORKDIR /app
COPY --from=prisma-cli /prisma-cli/node_modules /prisma-cli/node_modules
COPY prisma ./prisma
ENTRYPOINT ["bun", "/prisma-cli/node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM runtime-deps AS runner

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder --chown=node:node /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/src/worker ./src/worker
COPY --from=builder --chown=node:node /app/src/lib/prisma.js ./src/lib/prisma.js
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p /app/.next/cache/images \
  && mkdir -p /uploads \
  && chown -R node:node /uploads \
  && chown -R node:node /app/.next

USER node
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
