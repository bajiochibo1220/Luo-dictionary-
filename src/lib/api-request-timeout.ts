export function apiRequestTimeout(path: string, method = "GET"): number {
  const pathname = new URL(path, "https://client.local").pathname;
  return method.toUpperCase() === "POST" && /^\/api\/v1\/(?:ai-tools|tutor|chat)$/.test(pathname) ? 90_000 : 40_000;
}

// Navigation cancellation and the network deadline must both remain effective.
export function requestSignal(signal: AbortSignal | null | undefined, milliseconds: number): AbortSignal {
  if (signal?.aborted) return signal;
  const deadline = AbortSignal.timeout(milliseconds);
  if (!signal) return deadline;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([signal, deadline]);
  const controller = new AbortController();
  const abort = () => {
    controller.abort(signal.aborted ? signal.reason : deadline.reason);
    signal.removeEventListener("abort", abort);
    deadline.removeEventListener("abort", abort);
  };
  signal.addEventListener("abort", abort, { once: true });
  deadline.addEventListener("abort", abort, { once: true });
  return controller.signal;
}
