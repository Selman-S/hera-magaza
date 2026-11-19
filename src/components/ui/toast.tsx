"use client";

import { create } from "zustand";

type Toast = { id: number; message: string; tone: "info" | "success" | "error" };

type ToastStore = {
  toasts: Toast[];
  push: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (message, tone = "info") => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export function toast(message: string, tone?: Toast["tone"]) {
  useToasts.getState().push(message, tone);
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-8"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-xs bg-ink px-4 py-3 text-sm text-bg shadow-[0_8px_30px_rgb(23_22_20/0.18)]"
        >
          {t.tone !== "info" && (
            <span
              aria-hidden
              className={`mt-1.5 size-2 shrink-0 rounded-full ${t.tone === "success" ? "bg-[#8fc5a2]" : "bg-[#f0a091]"}`}
            />
          )}
          <span className="flex-1">{t.message}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Bildirimi kapat" className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
