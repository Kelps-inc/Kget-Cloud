# Architecture

See [README.md](../README.md) for the overview.

## Bounded Contexts

| Module | Responsibility |
|--------|---------------|
| `identity` | User registration, login, JWT auth |
| `organizations` | Multi-tenant org management |
| `agents` | Rust agent registration, tokens, heartbeat, polling |
| `collection` | Sources, download jobs, BullMQ queue, change detection |
| `knowledge` | File storage, text extraction, chunking, embeddings, RAG chat |
| `logs` | Job log persistence and WebSocket streaming |

## DDD Layer Rule

```
presentation → application → domain
infrastructure → domain / application
```

Domain code is plain TypeScript — no NestJS decorators, no Prisma, no Redis.

## Agent Protocol

The Rust agent polls `GET /api/agent/jobs/pending` every N seconds.
See [agent-protocol.md](./agent-protocol.md) for full endpoint list.

## Billing

Payments handled via **AbacatePay** (Brazilian payment provider).
Integration lives in the future `billing` module.
Plans: Starter R$99/mo · Pro R$249/mo · Business R$499/mo.
