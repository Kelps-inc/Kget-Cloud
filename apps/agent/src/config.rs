use anyhow::Result;
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentConfig {
    pub api_url: String,
    pub agent_id: Option<String>,
    pub token: String,
    pub workspace_dir: String,
    pub download_dir: String,
    pub log_level: String,
}

impl Default for AgentConfig {
    fn default() -> Self {
        let home = dirs_home();
        Self {
            api_url: "https://api.kgetcloud.com".into(),
            agent_id: None,
            token: String::new(),
            workspace_dir: format!("{}/.kget-agent", home),
            download_dir: format!("{}/KGetDownloads", home),
            log_level: "info".into(),
        }
    }
}

pub fn config_path() -> PathBuf {
    ProjectDirs::from("com", "kget", "kget-agent")
        .map(|dirs| dirs.config_dir().join("config.toml"))
        .unwrap_or_else(|| PathBuf::from("config.toml"))
}

pub fn save_config(token: &str, api_url: &str) -> Result<()> {
    let config = AgentConfig {
        token: token.to_string(),
        api_url: api_url.to_string(),
        ..AgentConfig::default()
    };

    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&path, toml::to_string_pretty(&config)?)?;
    println!("Config saved to {}", path.display());
    Ok(())
}

pub fn load_config() -> Result<AgentConfig> {
    let path = config_path();
    let contents = fs::read_to_string(&path)?;
    Ok(toml::from_str(&contents)?)
}

fn dirs_home() -> String {
    std::env::var("HOME").unwrap_or_else(|_| ".".into())
}
