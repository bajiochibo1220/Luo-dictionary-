export function apiRequestTimeout(path: string, method = "GET"): number {
  const pathname = new URL(path, "https://client.local").pathname;
  return method.toUpperCase() === "POST" && /^\/api\/v1\/(?:ai-tools|tutor|chat)$/.test(pathname) ? 90_000 : 40_000;
}
