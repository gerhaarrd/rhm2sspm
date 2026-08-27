import { useEffect, useState } from "react";
import { subscribeToasts, toast, type ToastMessage } from "../lib/toast";
import { IconAlert, IconCheck, IconX } from "./Icons";

const STYLES: Record<ToastMessage["kind"], string> = {
  error: "bg-rose-500/10 ring-rose-500/30 text-rose-200",
  success: "bg-emerald-500/10 ring-emerald-500/30 text-emerald-200",
  info: "bg-blue-500/10 ring-blue-500/30 text-blue-200",
};

function ToastIcon({ kind }: { kind: ToastMessage["kind"] }) {
  if (kind === "error") return <IconAlert className="h-4 w-4 shrink-0" />;
  if (kind === "success") return <IconCheck className="h-4 w-4 shrink-0" />;
  return <IconAlert className="h-4 w-4 shrink-0" />;
}

export function Toaster() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => subscribeToasts(setMessages), []);

  if (messages.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm shadow-lg ring-1 backdrop-blur-sm ${STYLES[message.kind]}`}
        >
          <ToastIcon kind={message.kind} />
          <span className="min-w-0 flex-1 break-words">{message.text}</span>
          <button
            type="button"
            onClick={() => toast.dismiss(message.id)}
            className="shrink-0 opacity-60 transition hover:opacity-100"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
