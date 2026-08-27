import { formatBytes } from "../lib/format";
import { useTranslation } from "../lib/useTranslation";
import type { QueueEntry } from "../types";

export function SessionStats({ entries }: { entries: QueueEntry[] }) {
  const { t, tn } = useTranslation();
  const done = entries.filter((e) => e.status === "done" && e.outcome);
  const quantumQueued = entries.reduce((sum, e) => sum + (e.preview?.quantumNoteCount ?? 0), 0);
  const totalNotes = done.reduce((sum, e) => sum + (e.outcome?.noteCount ?? 0), 0);
  const totalQuantumDone = done.reduce((sum, e) => sum + (e.outcome?.quantumNoteCount ?? 0), 0);
  const totalBytes = done.reduce((sum, e) => sum + (e.outcome?.outputBytes ?? 0), 0);

  const parts = [tn("stats.map", entries.length)];

  if (done.length > 0) {
    parts.push(tn("stats.converted", done.length));
    parts.push(t("stats.notesProcessed", { n: totalNotes }));
    if (totalQuantumDone > 0) parts.push(t("stats.offGridPreserved", { n: totalQuantumDone }));
    parts.push(t("stats.generated", { size: formatBytes(totalBytes) }));
  } else if (quantumQueued > 0) {
    parts.push(t("stats.offGridDetected", { n: quantumQueued }));
  }

  return <span>{parts.join(" · ")}</span>;
}
