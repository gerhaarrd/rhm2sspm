/** What changed per version, shown once in a popup when the app detects
 * it's running a newer version than last time (e.g. right after an
 * auto-update finishes and relaunches). Add an entry here when cutting
 * a new release; versions without one just skip the popup silently. */
export const CHANGELOG: Record<string, { pt: string[]; en: string[]; es: string[] }> = {
  "0.1.2": {
    pt: [
      "Detecta o Rhythia instalado via Steam e deixa escolher quais mapas importar, com capa e prévia",
      "O mesmo seletor agora vale pra qualquer Rhythia detectado, não só o do Steam",
      "Corrigido: os menus do cabeçalho (importar .zip, mapas instalados, comparar) às vezes não respondiam ao clique",
      "Corrigido: capa em WebP não aparecia e sumia ao converter pra .phxm/.npk",
      "Corrigido: o comparador de arquivos acusava diferença em notas duplicadas que na verdade estavam idênticas",
    ],
    en: [
      "Detects Rhythia installed via Steam and lets you pick which maps to import, with cover art and preview",
      "The same picker now works for any detected Rhythia, not just the Steam one",
      "Fixed: header menus (import .zip, installed maps, compare) sometimes not responding to clicks",
      "Fixed: WebP cover art wasn't showing and got dropped when converting to .phxm/.npk",
      "Fixed: the file comparison tool flagged duplicate notes as mismatches when they were actually identical",
    ],
    es: [
      "Detecta Rhythia instalado por Steam y permite elegir qué mapas importar, con portada y vista previa",
      "El mismo selector ahora funciona para cualquier Rhythia detectado, no solo el de Steam",
      "Corregido: los menús del encabezado (importar .zip, mapas instalados, comparar) a veces no respondían al clic",
      "Corregido: la portada en WebP no se mostraba y se perdía al convertir a .phxm/.npk",
      "Corregido: el comparador de archivos marcaba notas duplicadas como diferencias cuando en realidad eran idénticas",
    ],
  },
  "0.1.1": {
    pt: [
      "Suporte a .phxm (Rhythia) e .npk (Nova), nos dois sentidos",
      "Escolha o formato de saída por item, ou converta pros 4 formatos de uma vez",
      "Editor de metadados ganhou deslocamento de notas (ms) pra corrigir dessincronia",
      "Edição de título em lote (buscar e substituir)",
      "Abrir um mapa direto pelo explorador de arquivos já enfileira no app",
      "Auto-update ativado de verdade",
    ],
    en: [
      "Added .phxm (Rhythia) and .npk (Nova) support, both directions",
      "Pick the output format per item, or convert to all 4 formats at once",
      "Metadata editor gained a note time-offset field to fix audio desync",
      "Batch title find-and-replace",
      "Opening a map from the file explorer now queues it straight into the app",
      "Auto-update is now actually live",
    ],
    es: [
      "Soporte para .phxm (Rhythia) y .npk (Nova), en ambos sentidos",
      "Elige el formato de salida por elemento, o conviértelo a los 4 formatos a la vez",
      "El editor de metadatos ganó un campo de desplazamiento de notas (ms) para corregir la desincronización",
      "Edición de título en lote (buscar y reemplazar)",
      "Abrir un mapa desde el explorador de archivos ahora lo pone directo en la cola",
      "El auto-update ya está activo de verdad",
    ],
  },
};
