import React, { useId } from "react";
export default function Input({
  label,
  error,
  id,
  className = "",
  required = false,
  ...props
}) {
  const uid = useId();
  const inputId = id || uid;
  return <div className="dg-field"><label htmlFor={inputId}>{label}{required && <span aria-hidden="true"> *</span>}</label><input id={inputId} required={required} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} className={className} {...props} />{error && <p id={`${inputId}-error`} className="dg-error" role="alert">{error}</p>}</div>;
}
