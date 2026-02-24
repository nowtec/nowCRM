FROM node:22-alpine AS common-deps

# Install Python, pip, and git for Python plugin support (git needed for git+https:// installations)
RUN apk add --no-cache python3 py3-pip git

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./tsconfig.base.json ./tsconfig.json /app/

COPY ./apps/plugins/package.json /app/apps/plugins/
COPY ./libs/services/package.json /app/libs/services/

RUN pnpm install --frozen-lockfile

FROM common-deps AS builder

COPY ./apps/plugins /app/apps/plugins
COPY ./libs/services /app/libs/services

RUN pnpm --filter @nowcrm/plugins build

RUN pnpm deploy --filter=plugins --prod /prod/plugins

FROM common-deps AS runner

COPY --from=builder /prod/plugins /prod/plugins
WORKDIR /prod/plugins

EXPOSE 3030
CMD ["pnpm", "start"]
