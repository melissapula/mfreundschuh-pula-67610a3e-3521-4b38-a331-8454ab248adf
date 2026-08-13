# Build from the workspace root: docker build -f apps/api/Dockerfile .

FROM node:24-bookworm-slim AS builder
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx nx build api --configuration=production
RUN npx nx run api:build-seed

# ---
# Separate stage just to compile native modules (better-sqlite3, bcrypt).
# Nothing from this stage's apt packages ends up in the final image — only
# its already-compiled node_modules gets copied into `runtime` below.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /workspace/dist/apps/api/package.json /workspace/dist/apps/api/package-lock.json ./
RUN npm ci --omit=dev

# ---

FROM node:24-bookworm-slim AS runtime
WORKDIR /app

# gosu: lets the entrypoint drop from root to an unprivileged user after
# fixing up the mounted volume's ownership (see entrypoint.sh). No compiler
# toolchain here — that only ever existed in the discarded `deps` stage.
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nestjs \
  && mkdir -p /data \
  && chown -R nestjs:nodejs /app /data

COPY --from=builder /workspace/dist/apps/api ./
COPY --from=builder /workspace/dist/apps/api-seed/main.js ./seed.js
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown -R nestjs:nodejs /app

ENV NODE_ENV=production
EXPOSE 3000
# Starts as root (required to chown the Fly volume, which is mounted
# root-owned regardless of image config) then execs node as `nestjs` — see
# entrypoint.sh. The app process itself never runs as root.
ENTRYPOINT ["/entrypoint.sh"]
