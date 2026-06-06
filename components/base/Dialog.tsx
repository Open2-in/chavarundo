import React from "react";
import { X } from "lucide-react";
import Card from "./Card";

export interface DialogProps {
  isOpen: boolean;
  onClose?: () => void;
  step?: string;
  children: React.ReactNode;
  className?: string;
  zIndexBackdrop?: string;
  zIndexContent?: string;
}

export default function Dialog({
  isOpen,
  onClose,
  step,
  children,
  className = "",
  zIndexBackdrop = "z-[2600]",
  zIndexContent = "z-[2601]",
}: DialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 ${zIndexBackdrop} bg-white/60 dark:bg-black/60 backdrop-blur-sm`}
        onClick={onClose}
      />
      {/* Centered Modal Container */}
      <div className={`fixed ${zIndexContent} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(380px,92vw)] pointer-events-auto font-mono`}>
        <Card variant="default" padding="none" className={`p-6 flex flex-col gap-4 ${className}`}>
          {/* Header */}
          {(step || onClose) && (
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              {step && (
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600/70 dark:text-cyan-500/60">
                  {step}
                </span>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-neutral-400 hover:text-black dark:hover:text-white transition-colors ml-auto"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Body Content */}
          {children}
        </Card>
      </div>
    </>
  );
}
