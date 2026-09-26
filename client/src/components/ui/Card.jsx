import React from "react";

export default function Card({
  children,
  variant = "default",
  padding = "default",
  onClick,
  className = "",
}) {
  const variantStyles = {
    default: "card",
    elevated: "card-elevated",
    interactive: "card-interactive",
  };

  const paddingStyles = {
    none: "",
    sm: "p-3",
    default: "p-4",
    lg: "p-6",
  };

  return (
    <div
      onClick={onClick}
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
