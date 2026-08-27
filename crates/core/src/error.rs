use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConvertError {
    #[error("not a valid .rhm file (not a zip archive): {0}")]
    InvalidRhmContainer(#[from] zip::result::ZipError),

    #[error(".rhm archive is missing its required '{0}' entry")]
    MissingEntry(&'static str),

    #[error("failed to parse map JSON inside .rhm: {0}")]
    InvalidMapJson(#[from] serde_json::Error),

    #[error("not a valid .sspm file: {0}")]
    InvalidSspm(String),

    #[error("unsupported .sspm version: {0} (only v2 is supported)")]
    UnsupportedSspmVersion(u16),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, ConvertError>;
