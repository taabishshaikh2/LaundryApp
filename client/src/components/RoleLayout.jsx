import React from "react";
import { useAuth } from "../context/AuthContext";
import { Brand } from "./AppShell";
export default function RoleLayout({
  title,
  subtitle,
  children
}) {
  const {
    user,
    logout
  } = useAuth();
  return <div className="dg-role"><header className="dg-role-header"><Brand to={user?.role === "RIDER" ? "/rider" : "/partner"} /><button className="dg-button dg-secondary" onClick={logout}>Sign out</button></header><main className="dg-role-main"><div className="dg-page-heading"><div><p className="dg-eyebrow">YOUR WORKSPACE · {user?.name}</p><h1>{title}</h1><p className="dg-muted">{subtitle}</p></div></div>{children}</main></div>;
}
