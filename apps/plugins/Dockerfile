FROM node:22-alpine AS common-deps

# Install Python, pip, git, and curl for Python plugin support
# Alpine's Python venv doesn't include pip by default, but we'll bootstrap it at runtime
RUN apk add --no-cache python3 py3-pip git curl

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

# Ensure Python scripts are copied (pnpm deploy might not include them)
RUN mkdir -p /prod/plugins/dist/lib && \
    cp -f /app/apps/plugins/dist/lib/plugin-loader.py /prod/plugins/dist/lib/plugin-loader.py 2>/dev/null || true && \
    cp -f /app/apps/plugins/dist/lib/plugin-runner.py /prod/plugins/dist/lib/plugin-runner.py 2>/dev/null || true

FROM common-deps AS runner

# Copy the built application
COPY --from=builder /prod/plugins /prod/plugins

WORKDIR /prod/plugins

EXPOSE 3030
CMD ["pnpm", "start"]
