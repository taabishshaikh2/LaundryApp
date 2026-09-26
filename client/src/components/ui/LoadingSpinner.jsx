import React from "react";

export default function LoadingSpinner({ size = "md", className = "" }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className={`spinner ${sizes[size]} border-brand-600 ${className}`} />
  );
}
