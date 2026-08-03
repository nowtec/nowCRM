FROM node:22-alpine AS common-deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app

# Copy only the necessary files for dependency resolution
COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./tsconfig.base.json ./tsconfig.json /app/

COPY ./apps/nowcrm/package.json /app/apps/nowcrm/
COPY ./libs/services/package.json /app/libs/services/

RUN pnpm install --frozen-lockfile

FROM common-deps AS dev

ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY ./apps/nowcrm /app/apps/nowcrm
COPY ./libs/services /app/libs/services

WORKDIR /app/apps/nowcrm

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=10s --start-period=120s --retries=10 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/crm').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "dev"]

FROM common-deps AS builder

# Copy sourcecode after installing dependences to accelerate subsequents builds
COPY ./apps/nowcrm /app/apps/nowcrm
COPY ./libs/services /app/libs/services

RUN pnpm --filter @nowcrm/nowcrm build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/apps/nowcrm/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/nowcrm/.next/static ./apps/nowcrm/.next/static
COPY --from=builder --chown=node:node /app/apps/nowcrm/public ./apps/nowcrm/public

USER node

WORKDIR /app/apps/nowcrm

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/crm').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
