# KGet Cloud

> Monitor recurring document sources, detect changes, preserve audit evidence, and transform PDFs, HTMLs, XMLs, TXT files, CSVs, and manuals into an AI-searchable knowledge base.

KGet Cloud is not positioned as another file drive. Its SaaS wedge is operational document intelligence: collect recurring files from URLs, local agents, and legacy sources; prove what changed; keep source logs and hashes; then let teams ask questions against the indexed evidence.

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
2. **Phase 2** — URL sources + run-now collection + change detection + audit report
3. **Phase 3** — Rust agent registration + polling protocol + kget adapter
4. **Phase 4** — Scheduling, BullMQ processors, WebSocket logs, alerts, billing

## Demo vertical

The dashboard starts at **Monitor**:

1. Add up to 20 recurring URL sources.
2. Run collection to download the current version.
3. KGet stores the file only when the SHA-256 hash changes.
4. The audit report shows source status, recent jobs, errors, and evidence files.
5. Indexed evidence is available in the document chat with source citations.

## License

Proprietary — see [LICENSE.md](LICENSE.md)
