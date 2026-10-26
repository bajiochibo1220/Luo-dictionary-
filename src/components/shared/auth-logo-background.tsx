"use client";
import { useEffect, useState } from "react";

export function AuthLogoBackground() {
  const [logo, setLogo] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/branding").then(response => response.json()).then(result => { if (active) setLogo(result.data?.jooust_logo_url || ""); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <div aria-hidden="true" className="auth-logo-background" style={logo ? { backgroundImage: `url(${JSON.stringify(logo)})` } : undefined} />;
}
