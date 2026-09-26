import React from "react";
import Button from "./Button";

export default function EmptyState({
  icon = "📦",
  title,
  description,
  action,
  onAction,
}) {
  return (
    <div className="empty-state py-12">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description max-w-md">{description}</p>}
      {action && onAction && (
        <Button onClick={onAction} variant="primary">
          {action}
        </Button>
      )}
    </div>
  );
}
