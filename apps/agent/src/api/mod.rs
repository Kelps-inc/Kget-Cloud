use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;

#[derive(Clone)]
pub struct AgentApi {
    client: Client,
    api_url: String,
    token: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Source {
    pub id: String,
    #[serde(rename = "type")]
    pub source_type: String,
    pub name: String,
    pub config_json: Value,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DownloadJob {
    pub id: String,
    pub source_id: String,
    pub status: String,
    pub source: Source,
}

#[derive(Debug, Serialize)]
struct ProgressPayload {
    progress: f64,
}

#[derive(Debug, Serialize)]
struct LogPayload<'a> {
    level: &'a str,
    message: &'a str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CompletePayload {
    original_name: String,
    mime_type: String,
    sha256: String,
    size_bytes: u64,
    base64: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FailPayload<'a> {
    error_message: &'a str,
}

impl AgentApi {
    pub fn new(api_url: String, token: String) -> Result<Self> {
        let api_url = api_url.trim_end_matches('/').to_string();
        let client = Client::builder()
            .user_agent(format!("kget-agent/{}", env!("CARGO_PKG_VERSION")))
            .build()
            .context("failed to build HTTP client")?;
        Ok(Self {
            client,
            api_url,
            token,
        })
    }

    pub async fn heartbeat(&self) -> Result<()> {
        self.post_json("agent/heartbeat", &crate::system::heartbeat_payload())
            .await?;
        Ok(())
    }

    pub async fn pending_jobs(&self) -> Result<Vec<DownloadJob>> {
        self.client
            .get(self.url("agent/jobs/pending"))
            .bearer_auth(&self.token)
            .send()
            .await?
            .error_for_status()?
            .json::<Vec<DownloadJob>>()
            .await
            .context("failed to decode pending jobs")
    }

    pub async fn claim_job(&self, job_id: &str) -> Result<DownloadJob> {
        self.client
            .post(self.url(&format!("agent/jobs/{job_id}/claim")))
            .bearer_auth(&self.token)
            .send()
            .await?
            .error_for_status()?
            .json::<DownloadJob>()
            .await
            .context("failed to decode claimed job")
    }

    pub async fn progress(&self, job_id: &str, progress: f64) -> Result<()> {
        self.post_json(
            &format!("agent/jobs/{job_id}/progress"),
            &ProgressPayload { progress },
        )
        .await?;
        Ok(())
    }

    pub async fn log(&self, job_id: &str, level: &str, message: &str) -> Result<()> {
        self.post_json(
            &format!("agent/jobs/{job_id}/logs"),
            &LogPayload { level, message },
        )
        .await?;
        Ok(())
    }

    pub async fn complete(
        &self,
        job_id: &str,
        original_name: String,
        mime_type: String,
        path: &Path,
        sha256: String,
        size_bytes: u64,
    ) -> Result<()> {
        use base64::Engine;

        let bytes = tokio::fs::read(path).await?;
        let base64 = base64::engine::general_purpose::STANDARD.encode(bytes);
        self.post_json(
            &format!("agent/jobs/{job_id}/complete"),
            &CompletePayload {
                original_name,
                mime_type,
                sha256,
                size_bytes,
                base64,
            },
        )
        .await?;
        Ok(())
    }

    pub async fn fail(&self, job_id: &str, error_message: &str) -> Result<()> {
        self.post_json(
            &format!("agent/jobs/{job_id}/fail"),
            &FailPayload { error_message },
        )
        .await?;
        Ok(())
    }

    async fn post_json<T: Serialize + ?Sized>(&self, path: &str, payload: &T) -> Result<Value> {
        self.client
            .post(self.url(path))
            .bearer_auth(&self.token)
            .json(payload)
            .send()
            .await?
            .error_for_status()?
            .json::<Value>()
            .await
            .context("failed to decode API response")
    }

    fn url(&self, path: &str) -> String {
        format!("{}/api/{}", self.api_url, path.trim_start_matches('/'))
    }
}
