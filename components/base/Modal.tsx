"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "custom";
  className?: string;
  backdropClose?: boolean;
  showCloseButton?: boolean;
  zIndex?: number;
}

const sizeClasses = {
  sm: "w-[min(380px,94vw)]",
  md: "w-[min(480px,94vw)]",
  lg: "w-[min(640px,94vw)]",
  xl: "w-[min(800px,94vw)]",
  custom: "",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  headerRight,
  footer,
  children,
  size = "md",
  className = "",
  backdropClose = true,
  showCloseButton = true,
  zIndex = 3000,
}: ModalProps) {
  const backdropZIndex = zIndex;
  const contentZIndex = zIndex + 1;

  const handleBackdropClick = () => {
    if (backdropClose && onClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: backdropZIndex }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            onClick={handleBackdropClick}
          />

          {/* Modal Content Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
            style={{ zIndex: contentZIndex }}
            className={`relative max-h-[92vh] bg-white/95 dark:bg-neutral-950/95 border border-cyan-500/30 rounded-3xl font-mono shadow-[0_0_50px_rgba(0,255,255,0.15)] overflow-hidden flex flex-col p-6 text-neutral-900 dark:text-neutral-100 backdrop-blur-xl ${sizeClasses[size]} ${className}`}
          >
            {/* Header */}
            {(title || showCloseButton || headerRight) && (
              <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  {title}
                </div>
                
                <div className="flex items-center gap-4">
                  {headerRight}
                  {showCloseButton && onClose && (
                    <button 
                      onClick={onClose}
                      className="text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-cyan-500/10 pt-4 mt-6 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
