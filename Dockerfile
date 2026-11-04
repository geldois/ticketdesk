FROM node:26.13.0-alpine AS base

ENV NODE_ENV=production
WORKDIR /app

COPY .npmrc package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/contract/package.json packages/contract/
RUN npm ci --omit=dev --workspace apps/api

FROM node:26.13.0-alpine AS web

WORKDIR /app

COPY .npmrc package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/web

COPY apps/web/index.html apps/web/tsconfig.json apps/web/vite.config.ts apps/web/
COPY apps/web/src apps/web/src
RUN npm run build

FROM base AS migrate

COPY apps/api/migrations apps/api/migrations
COPY apps/api/scripts/migrate.ts apps/api/scripts/
COPY apps/api/src/config/errors.ts apps/api/src/config/settings.ts apps/api/src/config/
COPY apps/api/src/infrastructure/migrations.ts apps/api/src/infrastructure/

USER node
CMD ["node", "apps/api/scripts/migrate.ts"]

FROM base AS api

ENV WEB_DIST_DIR=/app/apps/web/dist

COPY packages/contract/src packages/contract/src
COPY apps/api/src apps/api/src
COPY --from=web /app/apps/web/dist apps/web/dist

USER node
CMD ["node", "apps/api/src/main.ts"]
