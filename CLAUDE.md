# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

KGet Cloud automates recurring file collection from URL sources and transforms PDFs, HTMLs, XMLs, CSVs, and other documents into an AI-searchable knowledge base. It is a multi-tenant SaaS with a Brazilian billing provider (AbacatePay).

## Commands

```bash
# Local infrastructure (PostgreSQL with pgvector + Redis)
docker compose up -d

# Install all workspace dependencies
bun install

# Run all apps in dev mode (via Turborepo)
bun run dev

# Build all packages
bun run build

# Lint (TypeScript type-check via tsc --noEmit)
bun run lint

# Run all tests
bun run test

# Run tests with coverage
bun run test:ci

# Database migrations (dev — creates migration files)
bun run db:migrate

# Database seeding
bun run db:seed

# Run a single test file (in apps/api or apps/web)
cd apps/api && bun test src/path/to/file.test.ts

# Rust agent
cd apps/agent && cargo test
cd apps/agent && cargo clippy -- -D warnings
cd apps/agent && cargo fmt

# Generate Prisma client after schema changes
cd apps/api && bun run db:generate
```

## Monorepo Layout

```
apps/
  api/      NestJS backend — pragmatic DDD, Prisma, BullMQ, Socket.IO
  web/      Next.js 14 dashboard — Tailwind, shadcn/ui, TanStack Query
  agent/    Rust CLI binary — polls API, downloads via kget crate, uploads files
packages/
  shared/   Shared TypeScript types (consumed by api and web)
infra/
  railway/  Per-service Railway JSON deploy configs
docs/       Architecture, agent protocol, workflow docs
```

## API Architecture (DDD)

The API follows a strict layered rule: `presentation → application → domain`; `infrastructure → domain / application`. Domain code is plain TypeScript — no NestJS decorators, no Prisma, no Redis.

**Bounded contexts** (each is a NestJS module under `apps/api/src/modules/`):

| Module          | Responsibility                                                       |
| --------------- | -------------------------------------------------------------------- |
| `identity`      | Registration, login, JWT auth                                        |
| `organizations` | Multi-tenant org management                                          |
| `agents`        | Rust agent registration, tokens, heartbeat, polling                  |
| `collection`    | Sources, download jobs, BullMQ queue, change detection               |
| `knowledge`     | File storage, text extraction, chunking, OpenAI embeddings, RAG chat |
| `logs`          | Job log persistence and Socket.IO streaming                          |

Base classes live in `apps/api/src/shared/`: `Entity<T>` (domain), `ValueObject<T>` (domain), `UseCase<Input, Output>` (application).

## Rust Agent Protocol

The agent binary polls `GET /api/agent/jobs/pending` on an interval and executes the loop: heartbeat → poll → claim → download via `kget` crate → report progress/logs → upload file → complete or fail. All endpoints require `Authorization: Bearer <agent-token>`. See `docs/agent-protocol.md` for the full endpoint list.

## Database

PostgreSQL 16 with the `pgvector` extension (enabled via `prisma/migrations/0001_enable_pgvector`). `DocumentChunk` stores `vector(1536)` embeddings for semantic search. Always use `pgvector/pgvector:pg16` as the Docker image, not plain `postgres`.

## Git Workflow

- **Never commit directly to `main` or `develop`.**
- Branch naming: `feat/KGE-XX-description` or `fix/KGE-XX-description` (Linear issue number required).
- PRs from feature branches go to `develop`; only seniors merge `develop → main`.
- Conventional commits are enforced by commitlint. Format: `type(scope): brief description (KGE-XX)`. Valid types: `feat fix refactor test chore docs perf ci revert`.
- Pre-commit runs lint-staged (ESLint + Prettier on changed files). Pre-push runs `bun run lint && bun run test` locally.

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis for BullMQ
- `JWT_SECRET` — auth signing key
- `STORAGE_PROVIDER` — `local | r2 | s3`
- `OPENAI_API_KEY` — embeddings + RAG chat
- `ABACATEPAY_API_KEY` / `ABACATEPAY_WEBHOOK_SECRET` — billing

## Deployment

Deployed on Railway. API and web each have their own `infra/railway/*.railway.json`. Start commands:

- API: `bunx prisma migrate deploy && node dist/main`
- Web: `node apps/web/server.js`

GitHub Actions CI runs lint, type-check, `bun test`, `cargo test + clippy + fmt`, and Railway Docker builds on every PR to `main` or `develop`.

---

## Second Brain (Obsidian Vault)

The project uses an Obsidian vault as external memory for AI agents. It contains stable architectural maps, domain models, technical decisions, and agent rules that should be consulted before implementing non-trivial features.

**Vault path:**

```
/Volumes/Davi SSD 1/SegundoCerebroObsidian/Segundo Cerebro dev
```

**Open in Obsidian:**

```
obsidian://open?vault=Segundo%20Cerebro%20dev
```

### When to Read the Vault

Read the relevant vault notes before:

- Creating a new NestJS module or bounded context
- Changing the agent protocol or download flow
- Making schema changes in Prisma
- Implementing any RAG/knowledge feature
- Taking a technical decision that affects multiple modules

### When to Update the Vault

Update the relevant vault notes after:

- Creating a new module or bounded context
- Changing the agent protocol contract
- Discovering a domain invariant or constraint not yet documented
- Making an architectural decision

### Vault Structure

```
_context/                        Agent entry points (read these first)
  claude-context.md              Context for Claude Code — start here
  Project Index - KGet Cloud.md  Quick map for this project
  Project Index - KGet.md        Quick map for the kget crate (used by apps/agent)

00 - Mapas/                      High-level mind maps per project
01 - Projetos/                   One note per project (narrative overview)
  KGetCloud/
    KGet Cloud.md
    MVP - Roteiro KGet Cloud.md  Phase status and pending work
02 - Arquitetura/                Architecture notes per project / layer
03 - Dominios/                   Domain knowledge (concepts, rules, invariants)
04 - Agentes/                    Agent usage rules and onboarding guides
  Como Usar Este Vault com Agentes.md
  Regras de Implementacao para Agentes.md
05 - Decisoes/                   ADRs only (roadmaps live in 01 - Projetos)
99 - Templates/                  Templates for new architecture/decision notes
07 - Runbooks/                   Operational runbooks (local setup, release)
```

### Recommended Reading Order for KGet Cloud

1. `_context/claude-context.md` — contracts and priorities for Claude Code
2. `_context/Project Index - KGet Cloud.md` — quick map of this project (bounded contexts, commands, agent protocol)
3. `02 - Arquitetura/Arquitetura - KGet Cloud.md` — layered DDD architecture, module responsibilities, data schema
4. `03 - Dominios/Dominio - Coleta e RAG.md` — domain invariants for collection, jobs, embeddings and RAG
5. `01 - Projetos/KGetCloud/MVP - Roteiro KGet Cloud.md` — what is done (Fase 1) and what is pending (Fase 2)
6. `_context/Project Index - KGet.md` — quick map of the kget crate (used by `apps/agent`)
7. `04 - Agentes/Regras de Implementacao para Agentes.md` — implementation checklist

### Key Rules from the Vault

- **Motor Rust, frontends finos**: the `kget` crate owns all download logic. `apps/agent` is a thin shell that delegates to it. Do not re-implement protocol logic inside the agent binary.
- **Structured events over human text**: prefer JSONL/structured events between processes rather than parsing human-readable strings. The `--jsonl` flag on the kget CLI is the current bridge.
- **Vault update policy**: update vault notes when the change is durable — new module, changed contract, discovered domain rule, technical decision. Skip updates for small mechanical changes.
- **Inform in the final response** whether vault notes were updated and which ones, or why an update was not needed.
