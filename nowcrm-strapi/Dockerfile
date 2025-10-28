FROM node:18-alpine

# Sharp dependencies
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev nasm vips-dev bash

WORKDIR /opt/

# Install pnpm and dependencies
RUN npm install -g pnpm

COPY ./package.json ./pnpm-lock.yaml ./
# Ensure better-sqlite3 builds properly:
RUN apk add --no-cache python3 make g++
RUN pnpm install

WORKDIR /opt/app
COPY . .

# Optional: if you use PostgreSQL
RUN pnpm add pg

# Build Strapi (can skip if running in live dev mode)
RUN pnpm build

EXPOSE 1337
CMD ["pnpm", "develop"]
