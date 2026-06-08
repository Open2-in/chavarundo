"use client";

import { useUI } from "@/store/uiStore";
import { X } from "lucide-react";

export default function SeoAboutModal({ children }: { children: React.ReactNode }) {
  const { activePanel, setActivePanel } = useUI();
  const isOpen = activePanel === "about";

  return (
    <div
      className={
        isOpen
          ? "fixed inset-0 z-[2000] overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-center p-4"
          : "hidden"
      }
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-cyan-500/30 rounded-2xl max-w-3xl max-h-[85vh] overflow-y-auto relative p-6 sm:p-8 font-mono shadow-2xl">
        <button
          onClick={() => setActivePanel(null)}
          className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-cyan-400 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-left">
          {children}
        </div>
      </div>
    </div>
  );
}
