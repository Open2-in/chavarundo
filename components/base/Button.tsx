import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "cyan" | "yellow" | "red" | "green" | "outline" | "ghost" | "cancel";
  size?: "xs" | "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
}

export default function Button({
  children,
  variant = "cyan",
  size = "md",
  fullWidth = false,
  loading = false,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const baseStyles = "font-mono font-bold uppercase tracking-widest transition-all select-none flex items-center justify-center gap-2";

  const sizeStyles = {
    xs: "py-1 px-2.5 text-[9px]",
    sm: "py-1.5 px-3 text-[10px]",
    md: "py-2.5 px-4 text-[11px]",
    lg: "py-3 px-5 text-xs tracking-[0.15em]",
  };

  const variantStyles = {
    cyan: "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.4)] border border-cyan-500 rounded-xl",
    yellow: "bg-[#ff9900] hover:bg-[#ffaa22] text-black border border-[#ff9900] shadow-[0_0_10px_rgba(255,153,0,0.4)] rounded-xl",
    red: "bg-[#ff003c] hover:bg-[#ff2255] text-white border border-[#ff003c] shadow-[0_0_10px_rgba(255,0,60,0.4)] rounded-xl",
    green: "bg-green-500 hover:bg-green-400 text-black border border-green-500 shadow-[0_0_15px_rgba(74,222,128,0.3)] rounded-xl",
    outline: "bg-transparent hover:bg-blue-100/10 dark:hover:bg-cyan-500/10 border border-blue-500/50 dark:border-cyan-500/50 text-blue-700 dark:text-cyan-400 rounded-xl",
    ghost: "bg-transparent text-neutral-400 hover:text-blue-600 dark:hover:text-cyan-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent rounded-xl",
    cancel: "text-[9px] text-neutral-400 hover:text-red-400 transition-colors uppercase border-0 p-0 hover:bg-transparent normal-case font-normal",
  };

  const widthStyle = fullWidth ? "w-full" : "";
  const disabledStyle = (disabled || loading) ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

  // Customize standard loader spinner
  const spinner = (
    <svg className="animate-spin h-3 w-3 text-current" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  if (variant === "cancel") {
    return (
      <button
        type={type}
        disabled={disabled || loading}
        className={`${variantStyles.cancel} ${className} ${disabledStyle}`}
        {...props}
      >
        [ {loading ? "..." : children} ]
      </button>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${disabledStyle} ${className}`}
      {...props}
    >
      {loading && spinner}
      {children}
    </button>
  );
}
