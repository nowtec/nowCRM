# Stage 1: Builder
FROM node:22.8.0-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@latest

COPY . .
RUN pnpm install
RUN pnpm --filter @parse-me/ai-parser build

FROM node:22.8.0-alpine AS final
WORKDIR /app

RUN npm install -g pnpm@latest

# Copy monorepo structure for production install
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/composer/package.json ./apps/composer/

# Copy built dist from builder
COPY --from=builder /app/apps/composer/dist ./dist

# Install production dependencies for the monorepo
RUN pnpm install --prod --filter @parse-me/ai-parser

# Copy node_modules and dist for final runtime
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/index.js"]
