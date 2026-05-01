use anyhow::Result;
use std::path::PathBuf;

pub struct DownloadRequest {
    pub url: String,
    pub output_path: PathBuf,
    pub expected_sha256: Option<String>,
}

pub struct DownloadResult {
    pub path: PathBuf,
    pub size_bytes: u64,
    pub sha256: String,
}

pub trait DownloadEngine: Send + Sync {
    fn download<F>(&self, request: DownloadRequest, on_progress: F) -> Result<DownloadResult>
    where
        F: Fn(f64) + Send + Sync + 'static;
}
