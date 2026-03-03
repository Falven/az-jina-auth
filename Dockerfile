# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24.13.0-slim

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /workspace
RUN corepack enable

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/az-jina-auth/package.json ./apps/az-jina-auth/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --filter ./apps/az-jina-auth... --frozen-lockfile
COPY apps/az-jina-auth/src ./apps/az-jina-auth/src
COPY apps/az-jina-auth/public ./apps/az-jina-auth/public
COPY apps/az-jina-auth/next.config.ts ./apps/az-jina-auth/next.config.ts
COPY apps/az-jina-auth/next-env.d.ts ./apps/az-jina-auth/next-env.d.ts
COPY apps/az-jina-auth/next.openapi.json ./apps/az-jina-auth/next.openapi.json
COPY apps/az-jina-auth/tsconfig.json ./apps/az-jina-auth/tsconfig.json
RUN pnpm --filter ./apps/az-jina-auth run build
RUN pnpm deploy --legacy --filter ./apps/az-jina-auth --prod /prod/az-jina-auth

FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

RUN groupadd --gid 10001 appuser \
  && useradd --uid 10001 --gid 10001 --create-home --shell /usr/sbin/nologin appuser

COPY --from=build --chown=appuser:appuser /prod/az-jina-auth/node_modules ./node_modules
COPY --from=build --chown=appuser:appuser /prod/az-jina-auth/package.json ./package.json
COPY --from=build --chown=appuser:appuser /workspace/apps/az-jina-auth/public ./public
COPY --from=build --chown=appuser:appuser /workspace/apps/az-jina-auth/.next/standalone/apps/az-jina-auth/server.js ./server.js
COPY --from=build --chown=appuser:appuser /workspace/apps/az-jina-auth/.next/standalone/apps/az-jina-auth/.next ./.next
COPY --from=build --chown=appuser:appuser /workspace/apps/az-jina-auth/.next/static ./.next/static

USER appuser

EXPOSE 8080
STOPSIGNAL SIGTERM

CMD ["node", "server.js"]
