# Agent Protocol

All endpoints are prefixed with `/api/agent/` and authenticated with `Authorization: Bearer <agent-token>`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/agents/heartbeat` | Send heartbeat and machine metadata |
| `GET` | `/agent/jobs/pending` | Fetch pending jobs assigned to this agent |
| `POST` | `/agent/jobs/:id/claim` | Claim a job |
| `POST` | `/agent/jobs/:id/progress` | Report download progress |
| `POST` | `/agent/jobs/:id/logs` | Append log entries |
| `POST` | `/agent/jobs/:id/complete` | Mark job as completed with file metadata |
| `POST` | `/agent/jobs/:id/fail` | Mark job as failed with error message |

## Agent Loop

1. Load config
2. Authenticate token
3. Send heartbeat
4. Poll pending jobs
5. Claim job
6. Execute download via `kget` crate
7. Report progress and logs
8. Upload file to API
9. Complete or fail job
10. Repeat
