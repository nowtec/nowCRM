FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ----------------------
# Build stage
# ----------------------
FROM base AS build
WORKDIR /usr/src/app

# Copy only dependency manifests first (for caching)
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY tsconfig.base.json ./
COPY tsconfig.json ./

# Copy only required packages and apps
COPY libs ./libs
COPY apps/{{APP_NAME}} ./apps/{{APP_NAME}}

# Install dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the selected app
RUN pnpm run -r build

# Deploy only {{APP_NAME}} app
RUN pnpm deploy --filter={{APP_NAME_KEBAB}} --prod /prod/{{APP_NAME}}

# ----------------------
# Runtime stage
# ----------------------
FROM base AS runner
COPY --from=build /prod/{{APP_NAME}} /prod/{{APP_NAME}}

WORKDIR /prod/{{APP_NAME}}

EXPOSE 3010
CMD ["pnpm", "start"]
