# Web image: Next.js standalone output (2026-10-10-16).
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/chess/package.json packages/chess/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/chess packages/chess
COPY apps/web apps/web
# COMMIT_SHA feeds the footer Source link (AGPL §13, P1-UI-08). The secret is a
# build-time placeholder only: pages render at request time with the real one.
ARG COMMIT_SHA=unknown
ENV COMMIT_SHA=$COMMIT_SHA NEXT_TELEMETRY_DISABLED=1 BETTER_AUTH_SECRET=build-time-placeholder
RUN pnpm --filter @checkmate/web build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
