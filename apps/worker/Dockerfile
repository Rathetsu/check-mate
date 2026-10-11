# Worker image. Also runs migrations (compose `migrate` service). Node 24
# runs the TypeScript sources directly (type stripping), so there's no build step.
FROM node:24-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --frozen-lockfile --prod --filter @checkmate/worker...
COPY packages/core packages/core
COPY apps/worker apps/worker
USER node
CMD ["node", "apps/worker/src/main.ts"]
