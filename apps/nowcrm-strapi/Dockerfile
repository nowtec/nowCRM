FROM node:22-alpine AS builder

RUN apk add --no-cache \
  build-base \
  gcc \
  autoconf \
  automake \
  zlib-dev \
  libpng-dev \
  nasm \
  vips-dev

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /opt/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm config set fetch-retry-maxtimeout 600000 \
  && pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
RUN pnpm run build

FROM node:22-alpine AS runner

RUN apk add --no-cache vips

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

ENV NODE_ENV=production

WORKDIR /opt/app

COPY --from=builder --chown=node:node /opt/app ./

RUN chown node:node /opt/app

USER node

EXPOSE 1337

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:1337/_health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "run", "start"]
