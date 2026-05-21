use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeartbeatPayload {
    pub version: String,
    pub machine_name: Option<String>,
    pub os: String,
}

pub fn heartbeat_payload() -> HeartbeatPayload {
    HeartbeatPayload {
        version: env!("CARGO_PKG_VERSION").to_string(),
        machine_name: hostname::get()
            .ok()
            .and_then(|name| name.into_string().ok()),
        os: std::env::consts::OS.to_string(),
    }
}
