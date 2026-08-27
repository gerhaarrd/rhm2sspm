import type { MapFormat } from "../types";

export const MAP_FORMATS: MapFormat[] = ["rhm", "phxm", "npk", "sspm"];

export function sourceFormatFromPath(path: string): MapFormat {
  const ext = path.split(".").pop()?.toLowerCase();
  return (MAP_FORMATS as string[]).includes(ext ?? "") ? (ext as MapFormat) : "rhm";
}

/** Mirrors `MapFormat::default_target` on the Rust side: `.sspm` for
 * everything, except `.sspm` itself (which defaults back to `.rhm`). */
export function defaultTargetFormat(source: MapFormat): MapFormat {
  return source === "sspm" ? "rhm" : "sspm";
}
