import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "cyber" | "default" | "sheet";
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

export default function Card({
  children,
  variant = "cyber",
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  const baseStyles = "backdrop-blur-md font-mono select-none flex flex-col rounded-2xl";

  const paddingStyles = {
    none: "p-0",
    sm: "px-4 py-3",
    md: "px-5 py-4",
    lg: "px-6 py-6",
  };

  const variantStyles = {
    cyber: "bg-white/90 dark:bg-black/90 border border-cyan-600/30 dark:border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.1)] dark:shadow-[0_0_25px_rgba(0,255,255,0.2)]",
    default: "bg-white/95 dark:bg-black/95 border border-teal-500/25 dark:border-cyan-500/40 shadow-[0_0_40px_rgba(0,255,255,0.1)]",
    sheet: "bg-white/95 dark:bg-neutral-950/95 border-l border-cyan-500/15 dark:border-cyan-500/30 shadow-[-4px_0_30px_rgba(0,100,255,0.1)] dark:shadow-[-4px_0_30px_rgba(0,255,255,0.1)] rounded-none h-full",
  };

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
