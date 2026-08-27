export type ToastKind = "error" | "success" | "info";

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let listeners: Listener[] = [];
let nextId = 1;

function emit() {
  for (const listener of listeners) listener(toasts);
}

function push(kind: ToastKind, text: string, ttlMs = 5000) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, text }];
  emit();
  setTimeout(() => dismiss(id), ttlMs);
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  error: (text: string) => push("error", text),
  success: (text: string) => push("success", text),
  info: (text: string) => push("info", text),
  dismiss,
};

export function subscribeToasts(listener: Listener): () => void {
  listeners = [...listeners, listener];
  listener(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
