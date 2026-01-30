FROM oven/bun:latest AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libssl3 adduser \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
RUN bunx next build

FROM base AS prisma-cli
WORKDIR /prisma-cli
COPY package.json ./
RUN bun -e "import { readFileSync, writeFileSync } from 'fs'; const pkg = JSON.parse(readFileSync('./package.json', 'utf8')); const ver = pkg.devDependencies?.prisma ?? pkg.dependencies?.prisma ?? '6.19.0'; writeFileSync('./package.json', JSON.stringify({ private: true, dependencies: { prisma: ver } }, null, 2));"
RUN bun install --production

FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder --chown=bun:bun /app/public ./public
COPY --from=builder --chown=bun:bun /app/prisma ./prisma
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
COPY --from=builder --chown=bun:bun /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder --chown=bun:bun /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=bun:bun /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma-cli --chown=bun:bun /prisma-cli/node_modules /prisma-cli/node_modules
COPY --chown=bun:bun docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p /app/.next/cache/images \
  && mkdir -p /uploads \
  && chown -R bun:bun /uploads \
  && chown -R bun:bun /app/.next

USER bun
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
