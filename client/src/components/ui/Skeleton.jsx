import React from "react";

export default function Skeleton({ variant = "text", count = 1, className = "" }) {
  const variants = {
    text: "h-4 w-full rounded",
    title: "h-6 w-3/4 rounded",
    card: "h-32 w-full rounded-card",
    avatar: "h-12 w-12 rounded-full",
    button: "h-10 w-24 rounded-button",
  };

  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton ${variants[variant]} ${className}`} />
      ))}
    </div>
  );
}
