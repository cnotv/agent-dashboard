FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @agent-dashboard/web build

# Reinstall with production dependencies of the server only, so the runtime image carries
# no build tooling.
RUN rm -rf node_modules apps/*/node_modules packages/*/node_modules \
  && pnpm install --prod --frozen-lockfile --filter @agent-dashboard/server...

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4317 \
    AGENT_DASHBOARD_HOST=0.0.0.0 \
    AGENT_DASHBOARD_PUBLISHED_ON_LOOPBACK=1 \
    AGENT_DASHBOARD_DATA_DIR=/data

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/config ./config
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./apps/web/dist

# 1000 is the image's `node` user; a numeric id resolves the same on every host.
RUN mkdir -p /data && chown 1000:1000 /data
USER 1000:1000
VOLUME ["/data"]
EXPOSE 4317
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "--disable-warning=ExperimentalWarning", "apps/server/src/ops/healthcheck.ts"]
CMD ["node", "--disable-warning=ExperimentalWarning", "apps/server/src/main.ts"]
