import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type {
  BuildInfo,
  CompareReport,
  ConversionOutcome,
  DetectedGame,
  InstalledMapSummary,
  MapFormat,
  MapPreview,
  MetadataOverrides,
} from "../types";

export function previewMap(path: string, targetFormat: MapFormat): Promise<MapPreview> {
  return invoke("preview_map", { path, targetFormat });
}

export function convertMapFile(
  inputPath: string,
  outputDir: string | null,
  targetFormat: MapFormat,
  overrides: MetadataOverrides | null,
): Promise<ConversionOutcome> {
  return invoke("convert_map_file", { inputPath, outputDir, targetFormat, overrides });
}

/** Expands a mix of file and directory paths into a flat list of `.rhm`/`.phxm`/`.npk`/`.sspm` files. */
export function resolveMapPaths(paths: string[]): Promise<string[]> {
  return invoke("resolve_map_paths", { paths });
}

/** Lazily reads and base64-encodes a map's embedded audio for playback. */
export function getAudioDataUrl(path: string): Promise<string | null> {
  return invoke("get_audio_data_url", { path });
}

/** Files this instance was launched with (double-click / "open with"). */
export function getLaunchFiles(): Promise<string[]> {
  return invoke("get_launch_files");
}

export async function pickMapFiles(): Promise<string[]> {
  const result = await open({
    multiple: true,
    filters: [
      { name: "Mapa Rhythia / Nova / Sound Space+", extensions: ["rhm", "phxm", "npk", "sspm"] },
    ],
  });
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

export async function pickOutputFolder(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false });
  if (!result) return null;
  return Array.isArray(result) ? result[0] : result;
}

export function exportZip(paths: string[], dest: string, readme: string | null = null): Promise<void> {
  return invoke("export_zip", { paths, dest, readme });
}

export async function pickZipDestination(): Promise<string | null> {
  return save({
    defaultPath: "mapas-convertidos.zip",
    filters: [{ name: "Arquivo ZIP", extensions: ["zip"] }],
  });
}

/** Extracts every map file out of a `.zip` (e.g. a downloaded pack) into
 * a temp folder and returns their paths, ready to queue. */
export function extractZipMaps(zipPath: string): Promise<string[]> {
  return invoke("extract_zip_maps", { zipPath });
}

export async function pickZipToImport(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [{ name: "Pacote .zip", extensions: ["zip"] }],
  });
  if (!result) return null;
  return Array.isArray(result) ? result[0] : result;
}

export async function pickSingleMapFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [
      { name: "Mapa Rhythia / Nova / Sound Space+", extensions: ["rhm", "phxm", "npk", "sspm"] },
    ],
  });
  if (!result) return null;
  return Array.isArray(result) ? result[0] : result;
}

export function compareMaps(pathA: string, pathB: string): Promise<CompareReport> {
  return invoke("compare_maps", { pathA, pathB });
}

export function getBuildInfo(): Promise<BuildInfo> {
  return invoke("get_build_info");
}

export function detectInstalledGames(): Promise<DetectedGame[]> {
  return invoke("detect_installed_games");
}

/** Lists every map cached by the Steam ("Capo") build of Rhythia -- cheap
 * metadata only, meant for a picker before anything gets materialized. */
export function listCapoMaps(): Promise<InstalledMapSummary[]> {
  return invoke("list_capo_maps");
}

/** Materializes the given Capo maps (`id`s from listCapoMaps) into real
 * `.rhm` files in a temp folder and returns their paths, ready to queue --
 * that client doesn't keep `.rhm` files, just loose JSON. */
export function importCapoMaps(ids: string[]): Promise<string[]> {
  return invoke("import_capo_maps", { ids });
}

/** Lists every map file already sitting in a detected game folder (e.g.
 * the Godot Rhythia client's `maps/` dir), for the same picker. */
export function listFolderMaps(dir: string): Promise<InstalledMapSummary[]> {
  return invoke("list_folder_maps", { dir });
}

/** Fetches one Capo map's cover thumbnail lazily -- listCapoMaps leaves
 * this out since generating it costs real I/O per map. */
export function getCapoMapCover(id: string): Promise<string | null> {
  return invoke("get_capo_map_cover", { id });
}
