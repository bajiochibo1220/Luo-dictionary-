import { parseAppApiOrigin } from "@/lib/app-client";

// Both interfaces use the same versioned endpoints. Native requests never
// depend on the browser's login cookie or attach their token to other hosts.
export function createChatTransport(options: { origin: string; accessToken?: () => string | null | Promise<string | null>; fetch?: typeof fetch }) {
  const origin = parseAppApiOrigin(options.origin);
  const transport = options.fetch ?? fetch;
  return async (path: string, init: RequestInit = {}) => {
    const parsed = new URL(path, origin);
    if (parsed.origin !== origin || parsed.hash) throw new Error("Invalid chat destination.");
    let endpoint;
    if (parsed.pathname === "/api/ai/chat") endpoint = "/api/v1/chat";
    else if (parsed.pathname === "/api/conversations") endpoint = "/api/v1/account/conversations";
    else if (/^\/api\/conversations\/[A-Za-z0-9_-]{1,128}$/.test(parsed.pathname)) endpoint = parsed.pathname.replace("/api/conversations/", "/api/v1/account/conversations/");
    else throw new Error("Invalid chat destination.");
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.delete("Authorization");
    const token = await options.accessToken?.();
    init.signal?.throwIfAborted();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await transport(new URL(endpoint + parsed.search, origin), {
      ...init, headers, cache: "no-store", credentials: options.accessToken ? "omit" : "same-origin",
      signal: init.signal ?? AbortSignal.timeout(parsed.pathname === "/api/ai/chat" ? 90000 : 20000),
    });
    const body = await response.json();
    // Media delivery endpoints are relative to the API, not the bundled app.
    if (response.ok && body.success && Array.isArray(body.data?.media)) {
      body.data.media = body.data.media.map((item: { url: string; thumbnailUrl?: string | null }) => ({
        ...item, url: new URL(item.url, origin).href,
        thumbnailUrl: item.thumbnailUrl ? new URL(item.thumbnailUrl, origin).href : null,
      }));
    }
    return Response.json(body, { status: response.status });
  };
}
