import React from "react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  ...props
}) {
  const baseStyles = "btn-base focus-ring";

  const variantStyles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300",
    ghost: "bg-transparent text-brand-600 hover:bg-brand-50 active:bg-brand-100",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 spinner" />
      )}
      {children}
    </button>
  );
}
