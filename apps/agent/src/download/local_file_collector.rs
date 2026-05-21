use crate::download::download_engine::DownloadResult;
use anyhow::{bail, Context, Result};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

pub struct LocalFileCollector {
    allowed_roots: Vec<String>,
}

impl LocalFileCollector {
    pub fn new(allowed_roots: Vec<String>) -> Self {
        Self { allowed_roots }
    }

    pub fn collect(
        &self,
        source_path: &str,
        output_path: PathBuf,
        max_file_bytes: u64,
    ) -> Result<DownloadResult> {
        let source = Path::new(source_path)
            .canonicalize()
            .with_context(|| format!("failed to resolve local source path: {source_path}"))?;

        if !source.is_file() {
            bail!("local source is not a file: {}", source.display());
        }

        let allowed = self
            .allowed_roots
            .iter()
            .filter_map(|root| Path::new(root).canonicalize().ok())
            .any(|root| source.starts_with(root));

        if !allowed {
            bail!("local source path is outside allowed_local_roots");
        }

        let metadata = fs::metadata(&source)?;
        if metadata.len() > max_file_bytes {
            bail!(
                "local file is too large ({} bytes). Limit: {} bytes.",
                metadata.len(),
                max_file_bytes
            );
        }

        fs::copy(&source, &output_path)?;
        let bytes = fs::read(&output_path)?;
        let sha256 = hex::encode(Sha256::digest(&bytes));

        Ok(DownloadResult {
            path: output_path,
            size_bytes: bytes.len() as u64,
            sha256,
        })
    }
}
