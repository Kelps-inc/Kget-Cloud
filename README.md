# KGet Cloud

> Automate recurring file collection, monitor downloads, and transform PDFs, HTMLs, XMLs, TXT files, CSVs, and manuals into an AI-searchable knowledge base.

## Architecture

```
kget-cloud/
  apps/
    api/       # NestJS backend (pragmatic DDD)
    web/       # Next.js dashboard
    agent/     # Rust agent using the kget crate
  packages/
    shared/    # Shared TypeScript types and schemas
  docs/        # Architecture and product docs
  infra/       # Deploy and infrastructure config
```

## Tech Stack

- **Backend:** NestJS, Prisma, PostgreSQL + pgvector, Redis + BullMQ
- **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **Agent:** Rust, kget crate, tokio, reqwest
- **AI/RAG:** OpenAI embeddings + chat, pgvector semantic search
- **Billing:** AbacatePay
- **Deploy:** Railway (API, web, worker), Cloudflare R2 (storage)

## Getting started

```bash
# Prerequisites: Node 20+, pnpm 9+, Docker, Rust

# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Fill in your values

# 4. Run migrations
pnpm db:migrate

# 5. Start dev servers
pnpm dev
```

## MVP Build Phases

1. **Phase 1** — Auth + manual upload + RAG + chat
2. **Phase 2** — URL sources + download jobs + BullMQ
3. **Phase 3** — Rust agent + polling + kget adapter
4. **Phase 4** — Monitoring, WebSocket logs, alerts

## License

Proprietary — see [LICENSE.md](LICENSE.md)
