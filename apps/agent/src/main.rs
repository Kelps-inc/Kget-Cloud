#![allow(dead_code)]

mod api;
mod cli;
mod config;
mod download;
mod jobs;
mod logs;
mod storage;
mod system;
mod upload;

use anyhow::Result;
use clap::Parser;
use cli::Cli;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let cli = Cli::parse();
    cli.run().await
}
