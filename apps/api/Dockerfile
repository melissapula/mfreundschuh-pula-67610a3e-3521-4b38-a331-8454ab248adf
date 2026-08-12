# Build from the workspace root: docker build -f apps/api/Dockerfile .

FROM node:24-bookworm-slim AS builder
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx nx build api --configuration=production
RUN npx nx run api:build-seed

# ---

FROM node:24-bookworm-slim AS runtime
WORKDIR /app

# better-sqlite3 is a native module; if no prebuilt binary matches this
# image's platform/Node version, node-gyp needs these to compile it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /workspace/dist/apps/api ./
COPY --from=builder /workspace/dist/apps/api-seed/main.js ./seed.js
RUN npm ci --omit=dev

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "main.js"]
