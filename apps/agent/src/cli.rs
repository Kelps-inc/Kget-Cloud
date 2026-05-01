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
                // TODO: load config, authenticate, start polling loop
                println!("Agent start loop — not yet implemented. See Linear issue KGE-XX.");
            }
            Commands::Status => {
                println!("Status — not yet implemented.");
            }
            Commands::Logs => {
                println!("Logs — not yet implemented.");
            }
        }
        Ok(())
    }
}
