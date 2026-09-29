import React from "react";
import { Brand } from "./AppShell";
import Icon from "./Icon";
export default function AuthLayout({
  title,
  description,
  children
}) {
  return <main className="dg-auth"><section className="dg-auth-story"><Brand to="/login" /><div><p className="dg-eyebrow">A LITTLE CARE GOES A LONG WAY</p><h1>Fresh clothes.<br />A lighter day.</h1><p>Laundry and garment care, with pickup right at your doorstep.</p><div className="dg-auth-art"><Icon name="shirt" size={120} /></div><p className="dg-auth-steps">01 · Book a pickup<br />02 · Leave the care to us<br />03 · Welcome it back</p></div><small>Dhobi Ghat · Your neighbourhood garment care</small></section><section className="dg-auth-form"><div className="dg-auth-mobile"><Brand to="/login" /></div><div className="dg-auth-inner"><p className="dg-eyebrow">WELCOME TO DHOBI GHAT</p><h2>{title}</h2><p className="dg-muted mb-8">{description}</p>{children}</div></section></main>;
}
