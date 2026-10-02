"use client";

import { useCallback, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const SESSION_REFRESH_INTERVAL_MS = 3 * 60 * 1000;

export function IdleSessionGuard() {
  const { status } = useSession();

  const refreshSession = useCallback(async () => {
    try {
      await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      // The session will expire naturally if the refresh request cannot complete.
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    let idleTimer: ReturnType<typeof setTimeout>;
    let lastSessionRefresh = Date.now();

    const startIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        void signOut({ redirectTo: "/login" });
      }, IDLE_TIMEOUT_MS);
    };

    const handleActivity = () => {
      startIdleTimer();
      if (Date.now() - lastSessionRefresh >= SESSION_REFRESH_INTERVAL_MS) {
        lastSessionRefresh = Date.now();
        void refreshSession();
      }
    };

    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    window.addEventListener("focus", handleActivity);
    startIdleTimer();
    void refreshSession();

    return () => {
      clearTimeout(idleTimer);
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      window.removeEventListener("focus", handleActivity);
    };
  }, [status, refreshSession]);

  return null;
}
