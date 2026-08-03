FROM node:22-alpine AS common-deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app

COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./tsconfig.base.json ./tsconfig.json /app/

COPY ./apps/{{APP_NAME}}/package.json /app/apps/{{APP_NAME}}/
COPY ./libs/services/package.json /app/libs/services/

RUN pnpm install --frozen-lockfile

FROM common-deps AS builder

COPY ./apps/{{APP_NAME}} /app/apps/{{APP_NAME}}
COPY ./libs/services /app/libs/services

RUN pnpm --filter @nowcrm/{{APP_NAME_KEBAB}} build

RUN pnpm deploy --filter=@nowcrm/{{APP_NAME_KEBAB}} --prod /prod/{{APP_NAME}}

FROM node:22-alpine AS runner

ENV NODE_ENV=production

WORKDIR /prod/{{APP_NAME}}

COPY --from=builder --chown=node:node /prod/{{APP_NAME}} ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.NODE_APP_PORT||3000)+'/health-check').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
