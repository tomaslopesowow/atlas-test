FROM node:22-alpine AS base

FROM base AS builder
WORKDIR /app
ENV CI=true
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBO_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat && \
    corepack enable && \
    pnpm install turbo --global

FROM builder AS pruner
COPY . .
RUN pnpm turbo prune web --docker

FROM builder AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/gsap-bonus.tgz ./gsap-bonus.tgz
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --production=false
COPY --from=pruner /app/out/full/ .
COPY ./apps/web/.env.local ./apps/web/.env.local
RUN pnpm turbo build --filter=web...

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone /app
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.env.local /app/apps/web/.env.local
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public /app/apps/web/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static /app/apps/web/.next/static

CMD ["node", "/app/apps/web/server.js"]
