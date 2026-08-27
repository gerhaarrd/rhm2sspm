pub mod convert;
pub mod error;
pub mod lint;
pub mod paths;
pub mod reverse;
pub mod rhm;
pub mod sspm;

pub use convert::{convert_rhm, convert_rhm_bytes, ConversionReport};
pub use error::{ConvertError, Result};
pub use lint::lint;
pub use paths::{rhm_file_name, sspm_file_name};
pub use reverse::sspm_to_rhm;

/// Converts `.sspm` v2 bytes to a `.rhm` zip container.
pub fn convert_sspm_bytes(sspm_bytes: &[u8]) -> Result<Vec<u8>> {
    let parsed = sspm::read(sspm_bytes)?;
    let rhm = reverse::sspm_to_rhm(parsed);
    rhm::write(&rhm)
}
