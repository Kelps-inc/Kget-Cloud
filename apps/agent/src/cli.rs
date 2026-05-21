use anyhow::Result;
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "kget-agent", version, about = "KGet Cloud Agent")]
pub struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Login {
        #[arg(long)]
        token: String,
        #[arg(long, default_value = "https://api.kgetcloud.com")]
        api_url: String,
    },
    Start,
    Status,
    Logs,
}

impl Cli {
    pub async fn run(self) -> Result<()> {
        match self.command {
            Commands::Login { token, api_url } => {
                crate::config::save_config(&token, &api_url)?;
                println!("Agent configured. Run `kget-agent start` to begin.");
            }
            Commands::Start => {
                tracing::info!("Starting KGet Agent...");
                let config = crate::config::load_config()?;
                crate::jobs::run_loop(config).await?;
            }
            Commands::Status => {
                let config = crate::config::load_config()?;
                println!("API: {}", config.api_url);
                println!("Workspace: {}", config.workspace_dir);
                println!("Downloads: {}", config.download_dir);
                println!("Poll interval: {}s", config.poll_interval_seconds);
                println!("Local files enabled: {}", config.allow_local_files);
            }
            Commands::Logs => {
                println!("Logs — not yet implemented.");
            }
        }
        Ok(())
    }
}
