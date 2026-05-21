# Agent Protocol

Runtime endpoints are prefixed with `/api/agent/` and authenticated with `Authorization: Bearer <agent-token>`.
Agent management endpoints are prefixed with `/api/agents/` and authenticated with a user JWT.

## Endpoints

| Method | Path                       | Description                                             |
| ------ | -------------------------- | ------------------------------------------------------- |
| `POST` | `/agents`                  | Create an agent and return its one-time plaintext token |
| `GET`  | `/agents`                  | List agents for the current organization                |
| `POST` | `/agent/heartbeat`         | Send heartbeat and machine metadata                     |
| `GET`  | `/agent/jobs/pending`      | Fetch pending jobs assigned to this agent               |
| `POST` | `/agent/jobs/:id/claim`    | Claim a job                                             |
| `POST` | `/agent/jobs/:id/progress` | Report download progress                                |
| `POST` | `/agent/jobs/:id/logs`     | Append log entries                                      |
| `POST` | `/agent/jobs/:id/complete` | Mark job as completed and upload base64 file content    |
| `POST` | `/agent/jobs/:id/fail`     | Mark job as failed with error message                   |

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

## Local run

Create an agent in the Monitor page, copy the one-time token, then configure and
start the local worker:

```bash
cd apps/agent
cargo run -- login --token <agent-token> --api-url https://kget-cloud-api.vercel.app
cargo run -- start
```

Sources created as `agent_url` are queued for local agents. The agent only
downloads `http` and `https` URLs by default, stores temporary downloads under
`~/KGetDownloads`, reports progress/logs to the API, sends SHA-256 and size
metadata on completion, and lets the API verify those values before storing the
file as evidence.

Local file collection is opt-in. To collect files from disk, edit the generated
config file shown by `kget-agent login`, set `allow_local_files = true`, and add
only the folders the agent may read to `allowed_local_roots`.
