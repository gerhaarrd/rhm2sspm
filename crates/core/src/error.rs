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

    #[error("not a valid .phxm file (not a zip archive): {0}")]
    InvalidPhxmContainer(zip::result::ZipError),

    #[error(".phxm archive is missing its required '{0}' entry")]
    MissingPhxmEntry(&'static str),

    #[error("failed to parse metadata.json inside .phxm: {0}")]
    InvalidPhxmMetadata(serde_json::Error),

    #[error("not a valid .phxm file: {0}")]
    InvalidPhxm(String),

    #[error("not a valid .npk file (not a zip archive): {0}")]
    InvalidNpkContainer(zip::result::ZipError),

    #[error(".npk archive is missing its required '{0}' entry")]
    MissingNpkEntry(&'static str),

    #[error("failed to parse {0} inside .npk: {1}")]
    InvalidNpkJson(&'static str, serde_json::Error),
}

pub type Result<T> = std::result::Result<T, ConvertError>;
