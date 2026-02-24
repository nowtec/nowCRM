FROM node:22-alpine AS common-deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./tsconfig.base.json ./tsconfig.json /app/
COPY ./apps/plugins/package.json /app/apps/plugins/

RUN pnpm install --frozen-lockfile

FROM common-deps AS builder

COPY ./apps/plugins /app/apps/plugins

RUN pnpm --filter @nowcrm/plugins build
RUN pnpm deploy --filter=plugins --prod /prod/plugins

FROM common-deps AS runner

COPY --from=builder /prod/plugins /prod/plugins
WORKDIR /prod/plugins

EXPOSE 3030
CMD ["pnpm", "start"]
