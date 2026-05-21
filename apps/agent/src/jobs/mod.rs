use crate::api::{AgentApi, DownloadJob};
use crate::config::AgentConfig;
use crate::download::download_engine::{DownloadEngine, DownloadRequest, DownloadResult};
use crate::download::kget_download_engine::KgetDownloadEngine;
use crate::download::local_file_collector::LocalFileCollector;
use anyhow::{anyhow, bail, Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use url::Url;

pub async fn run_loop(config: AgentConfig) -> Result<()> {
    validate_config(&config)?;
    fs::create_dir_all(&config.workspace_dir)?;
    fs::create_dir_all(&config.download_dir)?;

    let api = AgentApi::new(config.api_url.clone(), config.token.clone())?;
    let config = Arc::new(config);

    api.heartbeat().await?;
    tracing::info!("agent heartbeat accepted; polling for jobs");

    loop {
        if let Err(error) = api.heartbeat().await {
            tracing::warn!(%error, "heartbeat failed");
        }

        match api.pending_jobs().await {
            Ok(jobs) => {
                for job in jobs {
                    if let Err(error) = run_one_job(api.clone(), config.clone(), job).await {
                        tracing::warn!(%error, "job execution failed");
                    }
                }
            }
            Err(error) => tracing::warn!(%error, "failed to fetch pending jobs"),
        }

        sleep(Duration::from_secs(config.poll_interval_seconds)).await;
    }
}

async fn run_one_job(api: AgentApi, config: Arc<AgentConfig>, job: DownloadJob) -> Result<()> {
    let claimed = api.claim_job(&job.id).await?;
    let job_id = claimed.id.clone();
    let started = std::time::Instant::now();

    if let Err(error) = execute_claimed_job(api.clone(), config, claimed).await {
        let message = error.to_string();
        tracing::error!(job_id, error = %message, "job failed");
        let _ = api.fail(&job_id, &message).await;
        return Err(error);
    }

    tracing::info!(
        job_id,
        duration_ms = started.elapsed().as_millis(),
        "job completed"
    );
    Ok(())
}

async fn execute_claimed_job(
    api: AgentApi,
    config: Arc<AgentConfig>,
    job: DownloadJob,
) -> Result<()> {
    api.log(&job.id, "info", "Agent started collection").await?;

    let source_value = job
        .source
        .config_json
        .get("url")
        .and_then(|value| value.as_str())
        .ok_or_else(|| anyhow!("source URL/path is missing"))?;
    let original_name = original_name_for_source(source_value, &job.source.name);
    let output_path = safe_output_path(&config.download_dir, &job.id, &original_name)?;

    let result = match job.source.source_type.as_str() {
        "agent_url" => download_url(&api, &job, &config, source_value, output_path).await?,
        "local_folder" => collect_local_file(&config, source_value, output_path).await?,
        other => bail!("unsupported agent source type: {other}"),
    };

    if result.size_bytes > config.max_file_bytes {
        bail!(
            "downloaded file exceeds max_file_bytes ({} > {})",
            result.size_bytes,
            config.max_file_bytes
        );
    }

    let mime_type = mime_guess::from_path(&result.path)
        .first_or_octet_stream()
        .essence_str()
        .to_string();

    api.progress(&job.id, 100.0).await?;
    api.complete(
        &job.id,
        original_name,
        mime_type,
        &result.path,
        result.sha256,
        result.size_bytes,
    )
    .await?;
    api.log(&job.id, "info", "Agent completed collection")
        .await?;
    Ok(())
}

async fn download_url(
    api: &AgentApi,
    job: &DownloadJob,
    config: &AgentConfig,
    source_url: &str,
    output_path: PathBuf,
) -> Result<DownloadResult> {
    let parsed = Url::parse(source_url).context("invalid source URL")?;
    match parsed.scheme() {
        "http" | "https" => {}
        scheme => bail!("unsupported URL scheme for agent download: {scheme}"),
    }

    api.log(&job.id, "info", &format!("Downloading {source_url}"))
        .await?;

    let request = DownloadRequest {
        url: source_url.to_string(),
        output_path,
        expected_sha256: None,
    };

    let job_id = job.id.clone();
    let api_for_progress = api.clone();
    let result = tokio::task::spawn_blocking(move || {
        let engine = KgetDownloadEngine;
        engine.download(request, move |progress| {
            let api = api_for_progress.clone();
            let job_id = job_id.clone();
            tokio::spawn(async move {
                let _ = api.progress(&job_id, progress).await;
            });
        })
    })
    .await
    .context("download task panicked")??;

    if result.size_bytes > config.max_file_bytes {
        bail!(
            "file is too large for this agent ({} bytes). Limit: {} bytes.",
            result.size_bytes,
            config.max_file_bytes
        );
    }

    Ok(result)
}

async fn collect_local_file(
    config: &AgentConfig,
    source_path: &str,
    output_path: PathBuf,
) -> Result<DownloadResult> {
    if !config.allow_local_files {
        bail!("local file collection is disabled in agent config");
    }

    let collector = LocalFileCollector::new(config.allowed_local_roots.clone());
    collector.collect(source_path, output_path, config.max_file_bytes)
}

fn validate_config(config: &AgentConfig) -> Result<()> {
    if config.token.trim().is_empty() {
        bail!("agent token is missing; run `kget-agent login --token <token> --api-url <url>`");
    }
    if config.poll_interval_seconds == 0 {
        bail!("poll_interval_seconds must be greater than zero");
    }
    Ok(())
}

fn safe_output_path(download_dir: &str, job_id: &str, original_name: &str) -> Result<PathBuf> {
    let sanitized = sanitize_file_name(original_name);
    let base = Path::new(download_dir);
    Ok(base.join(format!("{job_id}-{sanitized}")))
}

fn sanitize_file_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_') {
                ch
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = cleaned.trim_matches('.');
    if trimmed.is_empty() {
        "download.bin".to_string()
    } else {
        trimmed.chars().take(160).collect()
    }
}

fn original_name_for_source(source: &str, fallback: &str) -> String {
    if let Ok(url) = Url::parse(source) {
        if let Some(segment) = url
            .path_segments()
            .and_then(|mut segments| segments.next_back())
        {
            if !segment.is_empty() {
                return segment.to_string();
            }
        }
    }

    Path::new(source)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or(fallback)
        .to_string()
}
