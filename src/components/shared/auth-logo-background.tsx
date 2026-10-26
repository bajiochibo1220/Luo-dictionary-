"use client";
import { useEffect, useState } from "react";

export function AuthLogoBackground() {
  const [logo, setLogo] = useState("");
  const [naturalWidth, setNaturalWidth] = useState(0);
  useEffect(() => {
    let active = true;
    fetch("/api/branding").then(response => response.json()).then(result => { if (active) setLogo(result.data?.jooust_logo_url || ""); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <div aria-hidden="true" className="auth-logo-background">
    {logo && <img src={logo} alt="" className="auth-logo-image" onLoad={event => setNaturalWidth(event.currentTarget.naturalWidth)} style={naturalWidth ? { maxWidth: `${Math.min(naturalWidth, 320)}px` } : undefined} />}
  </div>;
}
