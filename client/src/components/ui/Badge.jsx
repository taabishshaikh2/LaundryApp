import React from "react";

export default function Badge({ variant = "neutral", children }) {
  const variants = {
    success: "badge-success",
    warning: "badge-warning",
    error: "badge-error",
    info: "badge-info",
    neutral: "badge-neutral",
  };

  return <span className={`badge ${variants[variant]}`}>{children}</span>;
}
