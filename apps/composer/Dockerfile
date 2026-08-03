FROM node:22-alpine AS common-deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app

COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./tsconfig.base.json ./tsconfig.json /app/

COPY ./apps/composer/package.json /app/apps/composer/
COPY ./libs/services/package.json /app/libs/services/

RUN pnpm install --frozen-lockfile

FROM common-deps AS dev

ENV NODE_ENV=development

COPY ./apps/composer /app/apps/composer
COPY ./libs/services /app/libs/services

WORKDIR /app/apps/composer

EXPOSE 3020

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.COMPOSER_PORT||3020)+'/health-check').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "dev"]

FROM common-deps AS builder

COPY ./apps/composer /app/apps/composer
COPY ./libs/services /app/libs/services

RUN pnpm --filter @nowcrm/composer build

RUN pnpm deploy --filter=@nowcrm/composer --prod /prod/composer

FROM node:22-alpine AS runner

ENV NODE_ENV=production

WORKDIR /prod/composer

COPY --from=builder --chown=node:node /prod/composer ./

USER node

EXPOSE 3020

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.COMPOSER_PORT||3020)+'/health-check').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
