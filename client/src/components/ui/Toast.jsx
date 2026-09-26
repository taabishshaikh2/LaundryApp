import React, { useState, useEffect } from "react";

export default function Toast({ message, variant = "info", onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const variants = {
    success: {
      bg: "bg-green-50 border-green-200",
      icon: "✓",
      iconColor: "text-green-600",
      text: "text-green-800",
    },
    error: {
      bg: "bg-red-50 border-red-200",
      icon: "✕",
      iconColor: "text-red-600",
      text: "text-red-800",
    },
    info: {
      bg: "bg-blue-50 border-blue-200",
      icon: "ℹ",
      iconColor: "text-blue-600",
      text: "text-blue-800",
    },
  };

  const style = variants[variant];

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`
        ${style.bg} border ${isVisible ? "animate-slide-in" : "animate-slide-out"}
        rounded-card p-4 shadow-elevated flex items-start gap-3
      `}
    >
      <span className={`${style.iconColor} font-bold text-lg`}>{style.icon}</span>
      <p className={`${style.text} flex-1 text-sm font-medium`}>{message}</p>
      <button
        onClick={handleClose}
        className={`${style.text} opacity-60 hover:opacity-100 transition-opacity`}
      >
        ✕
      </button>
    </div>
  );
}
