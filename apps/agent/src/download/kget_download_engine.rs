use anyhow::{anyhow, Result};
use kget::{AdvancedDownloader, Optimizer, ProxyConfig};
use sha2::{Digest, Sha256};
use std::fs;

use super::download_engine::{DownloadEngine, DownloadRequest, DownloadResult};

pub struct KgetDownloadEngine;

impl DownloadEngine for KgetDownloadEngine {
    fn download<F>(&self, request: DownloadRequest, on_progress: F) -> Result<DownloadResult>
    where
        F: Fn(f64) + Send + Sync + 'static,
    {
        let output = request.output_path.to_string_lossy().to_string();

        let mut downloader = AdvancedDownloader::new(
            request.url.clone(),
            output,
            false,
            ProxyConfig::default(),
            Optimizer::new(),
        );

        downloader.set_progress_callback(move |progress| {
            on_progress(progress.into());
        });

        downloader.download().map_err(|error| anyhow!(error))?;

        let bytes = fs::read(&request.output_path)?;
        let size_bytes = bytes.len() as u64;
        let sha256 = hex::encode(Sha256::digest(&bytes));

        if let Some(expected) = &request.expected_sha256 {
            anyhow::ensure!(
                &sha256 == expected,
                "SHA-256 mismatch: expected {expected}, got {sha256}"
            );
        }

        Ok(DownloadResult {
            path: request.output_path,
            size_bytes,
            sha256,
        })
    }
}
