//! A single, shared "any format to any format" dispatch used by both the
//! CLI and the desktop app, so the list of supported formats and how
//! they map to a reader/writer lives in exactly one place.

use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::rhm::Rhm;
use crate::{npk, phxm, reverse, rhm, sspm};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MapFormat {
    Rhm,
    Phxm,
    Npk,
    Sspm,
}

impl MapFormat {
    pub fn ext(self) -> &'static str {
        match self {
            MapFormat::Rhm => "rhm",
            MapFormat::Phxm => "phxm",
            MapFormat::Npk => "npk",
            MapFormat::Sspm => "sspm",
        }
    }

    pub fn from_ext(ext: &str) -> Option<MapFormat> {
        match ext.to_ascii_lowercase().as_str() {
            "rhm" => Some(MapFormat::Rhm),
            "phxm" => Some(MapFormat::Phxm),
            "npk" => Some(MapFormat::Npk),
            "sspm" => Some(MapFormat::Sspm),
            _ => None,
        }
    }

    /// The format conversions default to when the user hasn't picked one
    /// explicitly: `.sspm` for everything, except `.sspm` itself (which
    /// defaults to `.rhm`, its original counterpart before other source
    /// formats existed).
    pub fn default_target(source: MapFormat) -> MapFormat {
        if source == MapFormat::Sspm {
            MapFormat::Rhm
        } else {
            MapFormat::Sspm
        }
    }
}

/// Reads any supported source format into the shared `Rhm` shape.
pub fn read_any(format: MapFormat, bytes: &[u8]) -> Result<Rhm> {
    Ok(match format {
        MapFormat::Rhm => rhm::read(bytes)?,
        MapFormat::Phxm => phxm::read(bytes)?,
        MapFormat::Npk => npk::read(bytes)?,
        MapFormat::Sspm => reverse::sspm_to_rhm(sspm::read(bytes)?),
    })
}

/// Writes the shared `Rhm` shape out as any supported target format.
pub fn write_any(format: MapFormat, rhm: Rhm) -> Result<Vec<u8>> {
    Ok(match format {
        MapFormat::Rhm => rhm::write(&rhm)?,
        MapFormat::Phxm => phxm::write(&rhm)?,
        MapFormat::Npk => npk::write(&rhm)?,
        MapFormat::Sspm => crate::convert::convert_rhm(rhm)?.output,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_target_is_sspm_except_from_sspm() {
        assert_eq!(MapFormat::default_target(MapFormat::Rhm), MapFormat::Sspm);
        assert_eq!(MapFormat::default_target(MapFormat::Phxm), MapFormat::Sspm);
        assert_eq!(MapFormat::default_target(MapFormat::Npk), MapFormat::Sspm);
        assert_eq!(MapFormat::default_target(MapFormat::Sspm), MapFormat::Rhm);
    }

    #[test]
    fn from_ext_is_case_insensitive() {
        assert_eq!(MapFormat::from_ext("RHM"), Some(MapFormat::Rhm));
        assert_eq!(MapFormat::from_ext("PhXm"), Some(MapFormat::Phxm));
        assert_eq!(MapFormat::from_ext("exe"), None);
    }
}
