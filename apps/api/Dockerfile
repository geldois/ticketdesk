FROM node:26.13.0-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY .npmrc package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/contract/package.json packages/contract/
RUN npm ci --omit=dev --workspace apps/api

COPY apps/api/migrations apps/api/migrations
COPY apps/api/scripts/migrate.ts apps/api/scripts/
COPY apps/api/src/infrastructure/migrations.ts apps/api/src/infrastructure/

USER node
CMD ["node", "apps/api/scripts/migrate.ts"]
