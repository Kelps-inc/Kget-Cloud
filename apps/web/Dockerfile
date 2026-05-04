FROM oven/bun:1.3.10-alpine AS build

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

ENV HUSKY=0

RUN bun install --frozen-lockfile

COPY apps/web apps/web
COPY packages/shared packages/shared

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/web

RUN bun run build

FROM oven/bun:1.3.10-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
