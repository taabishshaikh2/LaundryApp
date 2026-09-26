import React from "react";

export default function Input({
  label,
  error,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  className = "",
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`
          w-full px-3.5 py-2.5
          border rounded-button
          text-gray-900 placeholder-gray-400
          focus-ring
          transition-smooth
          ${error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white hover:border-gray-400"}
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
