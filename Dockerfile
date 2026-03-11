# --- Build stage ---
FROM node:22-slim AS build

RUN corepack enable pnpm

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
COPY prisma/schema.prisma prisma/

RUN pnpm install --frozen-lockfile

# Copy source and build everything
COPY packages/shared/ packages/shared/
COPY packages/client/ packages/client/
COPY packages/server/ packages/server/

RUN pnpm --filter @kryssanu/client build && \
  pnpm --filter @kryssanu/server build

# --- Production stage ---
FROM node:22-slim

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY prisma/schema.prisma prisma/

RUN pnpm install --frozen-lockfile --prod

# Copy built server
COPY --from=build /app/packages/server/dist packages/server/dist

# Copy shared source (imported at runtime via workspace link)
COPY --from=build /app/packages/shared/src packages/shared/src

# Copy built frontend
COPY --from=build /app/packages/client/dist packages/client/dist

ENV NODE_ENV=production
ENV CLIENT_DIST_PATH=/app/packages/client/dist

EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
