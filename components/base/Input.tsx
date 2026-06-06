import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1 text-left w-full font-mono">
      {label && (
        <label htmlFor={id} className="text-[9px] uppercase font-bold tracking-widest text-cyan-500/60 pl-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`text-[10px] text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl outline-none focus:border-cyan-500 transition-colors ${
          error ? "border-red-500 focus:border-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error && <span className="text-[9px] text-red-500 pl-1">{error}</span>}
    </div>
  );
}
