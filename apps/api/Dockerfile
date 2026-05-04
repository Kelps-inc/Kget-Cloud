FROM oven/bun:1.3.10-alpine AS build

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

ENV HUSKY=0

RUN bun install --frozen-lockfile

COPY apps/api apps/api
COPY packages/shared packages/shared

WORKDIR /app/apps/api

RUN bunx prisma generate
RUN bun run build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/main"]
