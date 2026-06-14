import React from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import Card from "./Card";

export interface SheetProps {
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export default function Sheet({
  onClose,
  title,
  icon,
  headerRight,
  children,
  footer,
  className = "",
}: SheetProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2001]"
        onClick={onClose}
      />

      {/* Side Panel */}
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed top-0 right-0 h-full w-full max-w-sm z-[2002] flex flex-col font-mono"
      >
        <Card variant="sheet" padding="none" className={className}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-cyan-500/30 bg-slate-50 dark:bg-cyan-950/50 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {icon}
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-cyan-400 truncate">
                {title}
              </h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {headerRight}
              <button
                onClick={onClose}
                className="p-1.5 rounded text-gray-700 dark:text-cyan-500 hover:bg-slate-100 dark:hover:bg-cyan-900/40 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 border-t border-gray-200/50 dark:border-cyan-500/20 bg-slate-50 dark:bg-cyan-950/30">
              {footer}
            </div>
          )}
        </Card>
      </motion.div>
    </>
  );
}
