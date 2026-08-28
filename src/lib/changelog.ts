/** What changed per version, shown once in a popup when the app detects
 * it's running a newer version than last time (e.g. right after an
 * auto-update finishes and relaunches). Add an entry here when cutting
 * a new release; versions without one just skip the popup silently. */
export const CHANGELOG: Record<string, { pt: string[]; en: string[]; es: string[] }> = {
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
