export type Locale = "pt-BR" | "en" | "es";

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
  "header.outputDir.recent.tooltip": "Pastas de saída recentes",
  "header.add": "Adicionar",
  "header.add.tooltip": "Adicionar arquivos (Ctrl+O)",
  "header.checkUpdates.tooltip": "Verificar atualizações",
  "header.more.tooltip": "Mais ações",
  "header.more.importZip": "Importar .zip",
  "header.more.installedGames": "Mapas já instalados",
  "header.more.compare": "Comparar dois arquivos",
  "app.buildInfo": "v{version} · commit {commit}",

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
  "toast.zipImportEmpty": "Nenhum mapa encontrado dentro do .zip.",
  "toast.zipImportFailed": "Falha ao importar o .zip: {error}",

  "pack.readme.header": "{n} mapa(s) convertido(s):",
  "pack.readme.footer": "Convertido com rhm2sspm — github.com/gerhaarrd/rhm2sspm",

  "compare.title": "Comparar dois arquivos",
  "compare.pickA": "Escolher arquivo A…",
  "compare.pickB": "Escolher arquivo B…",
  "compare.run": "Comparar",
  "compare.comparing": "Comparando…",
  "compare.stats": "{notes} notas ({quantum} fora do grid) · {duration}",
  "compare.identical": "Notas idênticas nos dois arquivos",
  "compare.diff": "{matching} notas em comum · {onlyA} só no A · {onlyB} só no B",

  "installedGames.title": "Mapas já instalados",
  "installedGames.none": "Nenhum jogo suportado detectado nesta máquina.",
  "installedGames.empty": "Nenhum mapa encontrado em {name}.",
  "installedGames.count.one": "1 mapa",
  "installedGames.count.other": "{n} mapas",

  "capoMaps.search": "Buscar por título ou mapper…",
  "capoMaps.loading": "Carregando mapas…",
  "capoMaps.empty": "Nenhum mapa em cache nesse client ainda.",
  "capoMaps.none": "Nenhum mapa bate com essa busca.",
  "capoMaps.selectAll": "Selecionar todos",
  "capoMaps.clearSelection": "Limpar seleção",
  "capoMaps.selectedCount.one": "1 selecionado",
  "capoMaps.selectedCount.other": "{n} selecionados",
  "capoMaps.importing": "Importando…",
  "capoMaps.importButton.one": "Importar 1 mapa",
  "capoMaps.importButton.other": "Importar {n} mapas",
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
  "queueItem.pin": "Fixar no topo",
  "queueItem.unpin": "Desafixar",

  "toolbar.filterPlaceholder": "Filtrar por nome, mapper…",
  "toolbar.results": "{n} resultado(s)",
  "toolbar.sort.name": "Nome",
  "toolbar.sort.duration": "Duração",
  "toolbar.sort.status": "Status",
  "toolbar.sort.difficulty": "Dificuldade",
  "toolbar.sortAsc": "Crescente",
  "toolbar.sortDesc": "Decrescente",
  "toolbar.viewList": "Ver em lista",
  "toolbar.viewGrid": "Ver em grade",

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

  "onboarding.title": "Bem-vindo ao rhm2sspm",
  "onboarding.subtitle": "Conversor de mapas Rhythia/Nova ⇄ Sound Space+. Uns toques rápidos:",
  "onboarding.drop.title": "Arraste e solte",
  "onboarding.drop.body": "Solte arquivos .rhm, .phxm, .npk ou .sspm na janela, ou clique em Adicionar.",
  "onboarding.format.title": "Escolha o formato de saída",
  "onboarding.format.body": "Cada item da fila tem seu próprio seletor de formato — ou converta pros 3 outros de uma vez.",
  "onboarding.edit.title": "Edite antes de converter",
  "onboarding.edit.body": "Ajuste título, mappers, dificuldade ou corrija dessincronia de áudio direto na fila.",
  "onboarding.export.title": "Exporte tudo junto",
  "onboarding.export.body": "Depois de converter, exporte tudo num .zip só, pronto pra compartilhar.",
  "onboarding.dismiss": "Entendi",

  "changelog.title": "O que mudou na {version}",
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
  "header.outputDir.recent.tooltip": "Recent output folders",
  "header.add": "Add",
  "header.add.tooltip": "Add files (Ctrl+O)",
  "header.checkUpdates.tooltip": "Check for updates",
  "header.more.tooltip": "More actions",
  "header.more.importZip": "Import .zip",
  "header.more.installedGames": "Already-installed maps",
  "header.more.compare": "Compare two files",
  "app.buildInfo": "v{version} · commit {commit}",

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
  "toast.zipImportEmpty": "No maps found inside that .zip.",
  "toast.zipImportFailed": "Failed to import the .zip: {error}",

  "pack.readme.header": "{n} converted map(s):",
  "pack.readme.footer": "Converted with rhm2sspm — github.com/gerhaarrd/rhm2sspm",

  "compare.title": "Compare two files",
  "compare.pickA": "Choose file A…",
  "compare.pickB": "Choose file B…",
  "compare.run": "Compare",
  "compare.comparing": "Comparing…",
  "compare.stats": "{notes} notes ({quantum} off-grid) · {duration}",
  "compare.identical": "Notes are identical in both files",
  "compare.diff": "{matching} notes in common · {onlyA} only in A · {onlyB} only in B",

  "installedGames.title": "Already-installed maps",
  "installedGames.none": "No supported game detected on this machine.",
  "installedGames.empty": "No maps found in {name}.",
  "installedGames.count.one": "1 map",
  "installedGames.count.other": "{n} maps",

  "capoMaps.search": "Search by title or mapper…",
  "capoMaps.loading": "Loading maps…",
  "capoMaps.empty": "No maps cached by that client yet.",
  "capoMaps.none": "No maps match that search.",
  "capoMaps.selectAll": "Select all",
  "capoMaps.clearSelection": "Clear selection",
  "capoMaps.selectedCount.one": "1 selected",
  "capoMaps.selectedCount.other": "{n} selected",
  "capoMaps.importing": "Importing…",
  "capoMaps.importButton.one": "Import 1 map",
  "capoMaps.importButton.other": "Import {n} maps",
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
  "queueItem.pin": "Pin to top",
  "queueItem.unpin": "Unpin",

  "toolbar.filterPlaceholder": "Filter by name, mapper…",
  "toolbar.results": "{n} result(s)",
  "toolbar.sort.name": "Name",
  "toolbar.sort.duration": "Duration",
  "toolbar.sort.status": "Status",
  "toolbar.sort.difficulty": "Difficulty",
  "toolbar.sortAsc": "Ascending",
  "toolbar.sortDesc": "Descending",
  "toolbar.viewList": "List view",
  "toolbar.viewGrid": "Grid view",

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

  "onboarding.title": "Welcome to rhm2sspm",
  "onboarding.subtitle": "Rhythia/Nova ⇄ Sound Space+ map converter. A quick tour:",
  "onboarding.drop.title": "Drag and drop",
  "onboarding.drop.body": "Drop .rhm, .phxm, .npk or .sspm files onto the window, or click Add.",
  "onboarding.format.title": "Pick the output format",
  "onboarding.format.body": "Each queued item has its own format picker — or convert to all 3 others at once.",
  "onboarding.edit.title": "Edit before converting",
  "onboarding.edit.body": "Tweak title, mappers, difficulty, or fix audio desync right from the queue.",
  "onboarding.export.title": "Export everything together",
  "onboarding.export.body": "Once converted, bundle everything into one .zip, ready to share.",
  "onboarding.dismiss": "Got it",

  "changelog.title": "What's new in {version}",
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

const es: Record<string, string> = {
  "app.subtitle": "Rhythia ⇄ Sound Space+",
  "app.title": "rhm2sspm — Rhythia ⇄ Sound Space+",

  "theme.dark": "Oscuro",
  "theme.light": "Claro",
  "theme.system": "Sistema",
  "theme.tooltip": "Tema: {mode} (clic para cambiar)",

  "locale.tooltip": "Idioma: {locale} (clic para cambiar)",

  "header.history": "Historial",
  "header.history.tooltip": "Historial de conversiones",
  "header.outputDir.default": "Misma carpeta que el archivo",
  "header.outputDir.tooltip": "Guardar junto a cada archivo original",
  "header.outputDir.recent.tooltip": "Carpetas de salida recientes",
  "header.add": "Añadir",
  "header.add.tooltip": "Añadir archivos (Ctrl+O)",
  "header.checkUpdates.tooltip": "Buscar actualizaciones",
  "header.more.tooltip": "Más acciones",
  "header.more.importZip": "Importar .zip",
  "header.more.installedGames": "Mapas ya instalados",
  "header.more.compare": "Comparar dos archivos",
  "app.buildInfo": "v{version} · commit {commit}",

  "dropzone.title": "Suelta tus mapas .rhm, .phxm, .npk o .sspm aquí",
  "dropzone.subtitle": "convierte Rhythia/Nova ⇄ Sound Space+ automáticamente",
  "dropzone.browse": "Elegir archivos…",

  "dragOverlay.drop": "Suelta para añadir",

  "footer.batchEdit": "Edición en lote",
  "footer.batchEdit.tooltip": "Edita el título de varios mapas a la vez (buscar y reemplazar)",
  "footer.exportZip": "Exportar .zip",
  "footer.exportZip.loading": "Exportando…",
  "footer.exportZip.tooltip": "Exportar todo lo convertido en un solo .zip",
  "footer.convert": "Convertir {n}",
  "footer.convert.loading": "Convirtiendo…",
  "footer.convert.done": "Todo convertido",
  "footer.convert.tooltip": "Convertir todo (Ctrl+Enter)",

  "toast.dropFailed": "No se pudieron leer los archivos/carpetas soltados: {error}",
  "toast.duplicateFile": "{file} ya se convirtió antes (el {date})",
  "toast.conversionDone.one": "Conversión completa.",
  "toast.conversionDone.other": "{n} mapas convertidos con éxito.",
  "toast.allFormatsDone": "Convertido a los otros {n} formatos.",
  "toast.allFormatsPartial": "{ok}/{total} formatos convertidos, el resto falló.",
  "toast.allFormatsFailed": "Falló la conversión a los otros formatos.",
  "toast.batchEditApplied.one": "1 título actualizado.",
  "toast.batchEditApplied.other": "{n} títulos actualizados.",
  "toast.zipImportEmpty": "No se encontraron mapas dentro del .zip.",
  "toast.zipImportFailed": "Falló la importación del .zip: {error}",

  "pack.readme.header": "{n} mapa(s) convertido(s):",
  "pack.readme.footer": "Convertido con rhm2sspm — github.com/gerhaarrd/rhm2sspm",

  "compare.title": "Comparar dos archivos",
  "compare.pickA": "Elegir archivo A…",
  "compare.pickB": "Elegir archivo B…",
  "compare.run": "Comparar",
  "compare.comparing": "Comparando…",
  "compare.stats": "{notes} notas ({quantum} fuera de la grilla) · {duration}",
  "compare.identical": "Las notas son idénticas en ambos archivos",
  "compare.diff": "{matching} notas en común · {onlyA} solo en A · {onlyB} solo en B",

  "installedGames.title": "Mapas ya instalados",
  "installedGames.none": "No se detectó ningún juego compatible en esta máquina.",
  "installedGames.empty": "No se encontraron mapas en {name}.",
  "installedGames.count.one": "1 mapa",
  "installedGames.count.other": "{n} mapas",

  "capoMaps.search": "Buscar por título o mapper…",
  "capoMaps.loading": "Cargando mapas…",
  "capoMaps.empty": "Ese cliente todavía no tiene mapas en caché.",
  "capoMaps.none": "Ningún mapa coincide con esa búsqueda.",
  "capoMaps.selectAll": "Seleccionar todos",
  "capoMaps.clearSelection": "Limpiar selección",
  "capoMaps.selectedCount.one": "1 seleccionado",
  "capoMaps.selectedCount.other": "{n} seleccionados",
  "capoMaps.importing": "Importando…",
  "capoMaps.importButton.one": "Importar 1 mapa",
  "capoMaps.importButton.other": "Importar {n} mapas",
  "toast.zipExported.one": "ZIP exportado con {n} mapa.",
  "toast.zipExported.other": "ZIP exportado con {n} mapas.",
  "toast.zipExportFailed": "No se pudo exportar el ZIP: {error}",
  "toast.audioMissing": "Este mapa no tiene audio incluido.",
  "toast.audioLoadFailed": "No se pudo cargar el audio: {error}",
  "toast.updateNotConfigured": "El auto-update todavía no está configurado.",
  "toast.updateUpToDate": "Ya tienes la última versión.",
  "toast.updateAvailable": "Nueva versión disponible: {version}",
  "toast.updateInstallFailed": "No se pudo instalar la actualización: {error}",

  "queueItem.playPreview": "Reproducir vista previa",
  "queueItem.pausePreview": "Pausar vista previa",
  "queueItem.notes": "{n} notas",
  "queueItem.offGrid": "{n} fuera de la grilla",
  "queueItem.timingPoints": "{n} timing points",
  "queueItem.warnings.one": "{n} aviso",
  "queueItem.warnings.other": "{n} avisos",
  "queueItem.edited": "editado",
  "queueItem.revealFolder": "Abrir carpeta de destino",
  "queueItem.retry": "Reintentar conversión",
  "queueItem.editMetadata": "Editar metadatos",
  "queueItem.remove": "Quitar de la cola",
  "queueItem.targetFormat.tooltip": "Formato de salida",
  "queueItem.convertAllFormats.tooltip": "También convertir a los otros 3 formatos",
  "queueItem.pin": "Fijar arriba",
  "queueItem.unpin": "Desfijar",

  "toolbar.filterPlaceholder": "Filtrar por nombre, mapper…",
  "toolbar.results": "{n} resultado(s)",
  "toolbar.sort.name": "Nombre",
  "toolbar.sort.duration": "Duración",
  "toolbar.sort.status": "Estado",
  "toolbar.sort.difficulty": "Dificultad",
  "toolbar.sortAsc": "Ascendente",
  "toolbar.sortDesc": "Descendente",
  "toolbar.viewList": "Vista de lista",
  "toolbar.viewGrid": "Vista de grilla",

  "history.title": "Historial de conversiones",
  "history.empty": "Todavía no se convirtió nada en esta máquina.",
  "history.requeue": "Reconvertir",
  "history.openFolder": "Abrir carpeta",
  "history.clear": "Borrar historial",

  "editor.title": "Editar metadatos",
  "editor.mapTitle": "Título del mapa",
  "editor.songName": "Nombre de la canción",
  "editor.mappers": "Mappers (separados por coma)",
  "editor.difficulty": "Dificultad",
  "editor.customDifficultyName": "Nombre personalizado",
  "editor.customDifficultyName.placeholder": "opcional",
  "editor.timeOffsetMs": "Desplazar notas (ms, corrige la desincronización)",
  "editor.cancel": "Cancelar",

  "batchEdit.title": "Editar título en lote",
  "batchEdit.description": "Se aplica a {n} mapas pendientes en la cola.",
  "batchEdit.find": "Buscar",
  "batchEdit.find.placeholder": "ej: ft. ",
  "batchEdit.replace": "Reemplazar por",
  "batchEdit.replace.placeholder": "(déjalo vacío para quitarlo)",
  "batchEdit.matchCount.empty": "Escribe algo para buscar",
  "batchEdit.matchCount.one": "1 mapa será modificado",
  "batchEdit.matchCount.other": "{n} mapas serán modificados",
  "batchEdit.apply": "Aplicar",

  "onboarding.title": "Bienvenido a rhm2sspm",
  "onboarding.subtitle": "Conversor de mapas Rhythia/Nova ⇄ Sound Space+. Un recorrido rápido:",
  "onboarding.drop.title": "Arrastra y suelta",
  "onboarding.drop.body": "Suelta archivos .rhm, .phxm, .npk o .sspm en la ventana, o haz clic en Añadir.",
  "onboarding.format.title": "Elige el formato de salida",
  "onboarding.format.body": "Cada elemento de la cola tiene su propio selector de formato — o conviértelo a los otros 3 a la vez.",
  "onboarding.edit.title": "Edita antes de convertir",
  "onboarding.edit.body": "Ajusta título, mappers, dificultad, o corrige la desincronización de audio desde la cola.",
  "onboarding.export.title": "Exporta todo junto",
  "onboarding.export.body": "Una vez convertido, empaqueta todo en un solo .zip, listo para compartir.",
  "onboarding.dismiss": "Entendido",

  "changelog.title": "Novedades de la {version}",
  "editor.save": "Guardar",

  "difficulty.0": "Fácil",
  "difficulty.1": "Media",
  "difficulty.2": "Difícil",
  "difficulty.3": "Lógica",
  "difficulty.4": "Tasukete",
  "difficulty.fallback": "Nivel {n}",

  "stats.map.one": "{n} mapa",
  "stats.map.other": "{n} mapas",
  "stats.converted.one": "{n} convertido",
  "stats.converted.other": "{n} convertidos",
  "stats.notesProcessed": "{n} notas procesadas",
  "stats.offGridPreserved": "{n} fuera de grilla preservadas",
  "stats.generated": "{size} generados",
  "stats.offGridDetected": "{n} notas fuera de grilla detectadas",
};

const DICTS: Record<Locale, Record<string, string>> = { "pt-BR": pt, en, es };

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

function loadLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_KEY);
    if (raw === "pt-BR" || raw === "en" || raw === "es") return raw;
  } catch {
    // fall through to default
  }
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("pt")) return "pt-BR";
  if (lang.startsWith("es")) return "es";
  return "en";
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
