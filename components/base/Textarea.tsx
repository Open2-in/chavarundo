import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  showCharCount?: boolean;
}

export default function Textarea({
  label,
  error,
  showCharCount = false,
  className = "",
  id,
  maxLength,
  value = "",
  ...props
}: TextareaProps) {
  const currentLength = typeof value === "string" || typeof value === "number" ? String(value).length : 0;

  return (
    <div className="flex flex-col gap-1 text-left w-full font-mono">
      <div className="flex justify-between items-center pl-1 pr-1">
        {label && (
          <label htmlFor={id} className="text-[9px] uppercase font-bold tracking-widest text-gray-600 dark:text-cyan-500/60">
            {label}
          </label>
        )}
        {showCharCount && maxLength && (
          <span className="text-[8px] text-neutral-400">
            {currentLength}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        id={id}
        maxLength={maxLength}
        value={value}
        className={`bg-slate-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 text-gray-900 dark:text-neutral-200 text-[10px] p-2.5 rounded-xl outline-none focus:border-cyan-500 resize-none h-16 w-full leading-normal placeholder:text-gray-500 ${
          error ? "border-red-500 focus:border-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error && <span className="text-[9px] text-red-500 pl-1">{error}</span>}
    </div>
  );
}
