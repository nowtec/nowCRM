FROM node:22-alpine AS common-deps

RUN apk add --no-cache python3 py3-pip git curl

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app

COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./tsconfig.base.json ./tsconfig.json /app/

COPY ./apps/plugins/package.json /app/apps/plugins/
COPY ./libs/services/package.json /app/libs/services/

RUN pnpm install --frozen-lockfile

FROM common-deps AS dev

ENV NODE_ENV=development

COPY ./apps/plugins /app/apps/plugins
COPY ./libs/services /app/libs/services

WORKDIR /app/apps/plugins

EXPOSE 3030

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PLUGINS_PORT||3030)+'/health-check').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "dev"]

FROM common-deps AS builder

COPY ./apps/plugins /app/apps/plugins
COPY ./libs/services /app/libs/services

RUN pnpm --filter @nowcrm/plugins build

RUN pnpm deploy --filter=@nowcrm/plugins --prod /prod/plugins

# tsup emits only JS, so the Python runner scripts are copied explicitly.
RUN mkdir -p /prod/plugins/dist/lib && \
    cp -f /app/apps/plugins/dist/lib/plugin-loader.py /prod/plugins/dist/lib/plugin-loader.py 2>/dev/null || true && \
    cp -f /app/apps/plugins/dist/lib/plugin-runner.py /prod/plugins/dist/lib/plugin-runner.py 2>/dev/null || true

FROM node:22-alpine AS runner

# Required at runtime: the service shells out to npm, python3 -m venv and git.
RUN apk add --no-cache python3 py3-pip git curl

ENV NODE_ENV=production

WORKDIR /prod/plugins

COPY --from=builder --chown=node:node /prod/plugins ./

# Plugins are installed here at runtime, so node must be able to write to it.
RUN mkdir -p /prod/plugins/plugins-internal && chown -R node:node /prod/plugins

USER node

EXPOSE 3030

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PLUGINS_PORT||3030)+'/health-check').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
