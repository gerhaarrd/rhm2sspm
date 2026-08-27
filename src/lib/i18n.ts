export type Locale = "pt-BR" | "en";

type Vars = Record<string, string | number>;
interface PluralForms {
  one: string;
  other: string;
}

const LOCALE_KEY = "rhm2sspm.locale";

const pt: Record<string, string> = {
  "app.subtitle": "Rhythia ⇄ Sound Space+",
  "app.title": "rhm2sspm — Rhythia ⇄ Sound Space+",

  "theme.dark": "Escuro",
  "theme.light": "Claro",
  "theme.system": "Sistema",
  "theme.tooltip": "Tema: {mode} (clique para trocar)",

  "locale.tooltip": "Idioma: {locale} (clique para trocar)",

  "header.history": "Histórico",
  "header.history.tooltip": "Histórico de conversões",
  "header.outputDir.default": "Mesma pasta do arquivo",
  "header.outputDir.tooltip": "Salvar ao lado de cada arquivo original",
  "header.add": "Adicionar",
  "header.add.tooltip": "Adicionar arquivos (Ctrl+O)",
  "header.checkUpdates.tooltip": "Verificar atualizações",

  "dropzone.title": "Arraste seus mapas .rhm, .phxm, .npk ou .sspm aqui",
  "dropzone.subtitle": "converte Rhythia/Nova ⇄ Sound Space+ automaticamente",
  "dropzone.browse": "Escolher arquivos…",

  "dragOverlay.drop": "Solte para adicionar",

  "footer.batchEdit": "Editar em lote",
  "footer.batchEdit.tooltip": "Editar o título de vários mapas de uma vez (buscar e substituir)",
  "footer.exportZip": "Exportar .zip",
  "footer.exportZip.loading": "Exportando…",
  "footer.exportZip.tooltip": "Exportar todos os convertidos em um .zip",
  "footer.convert": "Converter {n}",
  "footer.convert.loading": "Convertendo…",
  "footer.convert.done": "Tudo convertido",
  "footer.convert.tooltip": "Converter tudo (Ctrl+Enter)",

  "toast.dropFailed": "Não foi possível ler os arquivos/pastas soltos: {error}",
  "toast.duplicateFile": "{file} já foi convertido antes (em {date})",
  "toast.conversionDone.one": "Conversão concluída.",
  "toast.conversionDone.other": "{n} mapas convertidos com sucesso.",
  "toast.allFormatsDone": "Convertido pros {n} outros formatos.",
  "toast.allFormatsPartial": "{ok}/{total} formatos convertidos, o resto falhou.",
  "toast.allFormatsFailed": "Falha ao converter pros outros formatos.",
  "toast.batchEditApplied.one": "1 título atualizado.",
  "toast.batchEditApplied.other": "{n} títulos atualizados.",
  "toast.zipExported.one": "ZIP exportado com {n} mapa.",
  "toast.zipExported.other": "ZIP exportado com {n} mapas.",
  "toast.zipExportFailed": "Não foi possível exportar o ZIP: {error}",
  "toast.audioMissing": "Este mapa não tem áudio embutido.",
  "toast.audioLoadFailed": "Não foi possível carregar o áudio: {error}",
  "toast.updateNotConfigured": "Atualizações automáticas ainda não configuradas.",
  "toast.updateUpToDate": "Você já está na versão mais recente.",
  "toast.updateAvailable": "Nova versão disponível: {version}",
  "toast.updateInstallFailed": "Não foi possível instalar a atualização: {error}",

  "queueItem.playPreview": "Tocar prévia do áudio",
  "queueItem.pausePreview": "Pausar prévia",
  "queueItem.notes": "{n} notas",
  "queueItem.offGrid": "{n} fora do grid",
  "queueItem.timingPoints": "{n} timing points",
  "queueItem.warnings.one": "{n} aviso",
  "queueItem.warnings.other": "{n} avisos",
  "queueItem.edited": "editado",
  "queueItem.revealFolder": "Abrir pasta de destino",
  "queueItem.retry": "Tentar converter novamente",
  "queueItem.editMetadata": "Editar metadados",
  "queueItem.remove": "Remover da fila",
  "queueItem.targetFormat.tooltip": "Formato de saída",
  "queueItem.convertAllFormats.tooltip": "Converter pros outros 3 formatos também",

  "toolbar.filterPlaceholder": "Filtrar por nome, mapper…",
  "toolbar.results": "{n} resultado(s)",
  "toolbar.sort.name": "Nome",
  "toolbar.sort.duration": "Duração",
  "toolbar.sort.status": "Status",
  "toolbar.sort.difficulty": "Dificuldade",
  "toolbar.sortAsc": "Crescente",
  "toolbar.sortDesc": "Decrescente",

  "history.title": "Histórico de conversões",
  "history.empty": "Nada convertido ainda nesta máquina.",
  "history.requeue": "Reconverter",
  "history.openFolder": "Abrir pasta",
  "history.clear": "Limpar histórico",

  "editor.title": "Editar metadados",
  "editor.mapTitle": "Título do mapa",
  "editor.songName": "Nome da música",
  "editor.mappers": "Mappers (separados por vírgula)",
  "editor.difficulty": "Dificuldade",
  "editor.customDifficultyName": "Nome customizado",
  "editor.customDifficultyName.placeholder": "opcional",
  "editor.timeOffsetMs": "Deslocar notas (ms, corrige dessincronia)",
  "editor.cancel": "Cancelar",

  "batchEdit.title": "Editar título em lote",
  "batchEdit.description": "Aplica a {n} mapas pendentes na fila.",
  "batchEdit.find": "Buscar",
  "batchEdit.find.placeholder": "ex: ft. ",
  "batchEdit.replace": "Substituir por",
  "batchEdit.replace.placeholder": "(deixe vazio pra remover)",
  "batchEdit.matchCount.empty": "Digite um texto pra buscar",
  "batchEdit.matchCount.one": "1 mapa será alterado",
  "batchEdit.matchCount.other": "{n} mapas serão alterados",
  "batchEdit.apply": "Aplicar",
  "editor.save": "Salvar",

  "difficulty.0": "Fácil",
  "difficulty.1": "Médio",
  "difficulty.2": "Difícil",
  "difficulty.3": "Lógica",
  "difficulty.4": "Tasukete",
  "difficulty.fallback": "Nível {n}",

  "stats.map.one": "{n} mapa",
  "stats.map.other": "{n} mapas",
  "stats.converted.one": "{n} convertido",
  "stats.converted.other": "{n} convertidos",
  "stats.notesProcessed": "{n} notas processadas",
  "stats.offGridPreserved": "{n} fora do grid preservadas",
  "stats.generated": "{size} gerados",
  "stats.offGridDetected": "{n} notas fora do grid detectadas",
};

const en: Record<string, string> = {
  "app.subtitle": "Rhythia ⇄ Sound Space+",
  "app.title": "rhm2sspm — Rhythia ⇄ Sound Space+",

  "theme.dark": "Dark",
  "theme.light": "Light",
  "theme.system": "System",
  "theme.tooltip": "Theme: {mode} (click to switch)",

  "locale.tooltip": "Language: {locale} (click to switch)",

  "header.history": "History",
  "header.history.tooltip": "Conversion history",
  "header.outputDir.default": "Same folder as the file",
  "header.outputDir.tooltip": "Save next to each source file",
  "header.add": "Add",
  "header.add.tooltip": "Add files (Ctrl+O)",
  "header.checkUpdates.tooltip": "Check for updates",

  "dropzone.title": "Drop your .rhm, .phxm, .npk or .sspm maps here",
  "dropzone.subtitle": "converts Rhythia/Nova ⇄ Sound Space+ automatically",
  "dropzone.browse": "Choose files…",

  "dragOverlay.drop": "Drop to add",

  "footer.batchEdit": "Batch edit",
  "footer.batchEdit.tooltip": "Edit the title of several maps at once (find and replace)",
  "footer.exportZip": "Export .zip",
  "footer.exportZip.loading": "Exporting…",
  "footer.exportZip.tooltip": "Export everything converted into one .zip",
  "footer.convert": "Convert {n}",
  "footer.convert.loading": "Converting…",
  "footer.convert.done": "All converted",
  "footer.convert.tooltip": "Convert all (Ctrl+Enter)",

  "toast.dropFailed": "Couldn't read the dropped files/folders: {error}",
  "toast.duplicateFile": "{file} was already converted before (on {date})",
  "toast.conversionDone.one": "Conversion complete.",
  "toast.conversionDone.other": "{n} maps converted successfully.",
  "toast.allFormatsDone": "Converted to the other {n} formats.",
  "toast.allFormatsPartial": "{ok}/{total} formats converted, the rest failed.",
  "toast.allFormatsFailed": "Failed to convert to the other formats.",
  "toast.batchEditApplied.one": "1 title updated.",
  "toast.batchEditApplied.other": "{n} titles updated.",
  "toast.zipExported.one": "Exported ZIP with {n} map.",
  "toast.zipExported.other": "Exported ZIP with {n} maps.",
  "toast.zipExportFailed": "Couldn't export the ZIP: {error}",
  "toast.audioMissing": "This map has no embedded audio.",
  "toast.audioLoadFailed": "Couldn't load the audio: {error}",
  "toast.updateNotConfigured": "Auto-update isn't set up yet.",
  "toast.updateUpToDate": "You're already on the latest version.",
  "toast.updateAvailable": "New version available: {version}",
  "toast.updateInstallFailed": "Couldn't install the update: {error}",

  "queueItem.playPreview": "Play audio preview",
  "queueItem.pausePreview": "Pause preview",
  "queueItem.notes": "{n} notes",
  "queueItem.offGrid": "{n} off-grid",
  "queueItem.timingPoints": "{n} timing points",
  "queueItem.warnings.one": "{n} warning",
  "queueItem.warnings.other": "{n} warnings",
  "queueItem.edited": "edited",
  "queueItem.revealFolder": "Open destination folder",
  "queueItem.retry": "Retry conversion",
  "queueItem.editMetadata": "Edit metadata",
  "queueItem.remove": "Remove from queue",
  "queueItem.targetFormat.tooltip": "Output format",
  "queueItem.convertAllFormats.tooltip": "Also convert to the other 3 formats",

  "toolbar.filterPlaceholder": "Filter by name, mapper…",
  "toolbar.results": "{n} result(s)",
  "toolbar.sort.name": "Name",
  "toolbar.sort.duration": "Duration",
  "toolbar.sort.status": "Status",
  "toolbar.sort.difficulty": "Difficulty",
  "toolbar.sortAsc": "Ascending",
  "toolbar.sortDesc": "Descending",

  "history.title": "Conversion history",
  "history.empty": "Nothing converted on this machine yet.",
  "history.requeue": "Reconvert",
  "history.openFolder": "Open folder",
  "history.clear": "Clear history",

  "editor.title": "Edit metadata",
  "editor.mapTitle": "Map title",
  "editor.songName": "Song name",
  "editor.mappers": "Mappers (comma-separated)",
  "editor.difficulty": "Difficulty",
  "editor.customDifficultyName": "Custom name",
  "editor.customDifficultyName.placeholder": "optional",
  "editor.timeOffsetMs": "Shift notes (ms, fixes desync)",
  "editor.cancel": "Cancel",

  "batchEdit.title": "Batch edit title",
  "batchEdit.description": "Applies to {n} pending maps in the queue.",
  "batchEdit.find": "Find",
  "batchEdit.find.placeholder": "e.g. ft. ",
  "batchEdit.replace": "Replace with",
  "batchEdit.replace.placeholder": "(leave empty to remove)",
  "batchEdit.matchCount.empty": "Type something to search for",
  "batchEdit.matchCount.one": "1 map will be changed",
  "batchEdit.matchCount.other": "{n} maps will be changed",
  "batchEdit.apply": "Apply",
  "editor.save": "Save",

  "difficulty.0": "Easy",
  "difficulty.1": "Medium",
  "difficulty.2": "Hard",
  "difficulty.3": "Logic",
  "difficulty.4": "Tasukete",
  "difficulty.fallback": "Level {n}",

  "stats.map.one": "{n} map",
  "stats.map.other": "{n} maps",
  "stats.converted.one": "{n} converted",
  "stats.converted.other": "{n} converted",
  "stats.notesProcessed": "{n} notes processed",
  "stats.offGridPreserved": "{n} off-grid preserved",
  "stats.generated": "{size} generated",
  "stats.offGridDetected": "{n} off-grid notes detected",
};

const DICTS: Record<Locale, Record<string, string>> = { "pt-BR": pt, en };

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

function loadLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_KEY);
    if (raw === "pt-BR" || raw === "en") return raw;
  } catch {
    // fall through to default
  }
  return navigator.language?.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

let currentLocale: Locale = loadLocale();
let listeners: Array<() => void> = [];

function emit() {
  for (const listener of listeners) listener();
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // best-effort
  }
  emit();
}

export function subscribeLocale(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/** Translates a plain (non-pluralized) key. */
export function t(key: string, vars?: Vars): string {
  const template = DICTS[currentLocale][key] ?? DICTS["pt-BR"][key] ?? key;
  return interpolate(template, vars);
}

/** Translates a pluralized key (`{key}.one` / `{key}.other`), picking the
 * form by `count` and always exposing it as `{n}` to the template. */
export function tn(key: string, count: number, vars?: Vars): string {
  const forms: PluralForms = {
    one: DICTS[currentLocale][`${key}.one`] ?? DICTS["pt-BR"][`${key}.one`] ?? key,
    other: DICTS[currentLocale][`${key}.other`] ?? DICTS["pt-BR"][`${key}.other`] ?? key,
  };
  const template = count === 1 ? forms.one : forms.other;
  return interpolate(template, { ...vars, n: count });
}
