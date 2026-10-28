/** Public previews always go through current consent and publication checks. */
export function mediaThumbnail(id: string, type: string): string | null {
  const base = `/api/media/${encodeURIComponent(id)}/file`;
  return type === "image" ? `${base}?width=640` : type === "video" ? `${base}?poster=1&width=640` : null;
}

export function responsiveMediaSources(src: string): { srcSet?: string } {
  // Do not rewrite external links, data URLs, or native blob previews.
  if (!/^\/api\/media\/[^/?]+\/file(?:\?|$)/.test(src)) return {};
  const [path, query] = src.split("?");
  const params = new URLSearchParams(query);
  if (params.has("download")) return {};
  return { srcSet: [320, 640, 960, 1280].map(width => {
    const sized = new URLSearchParams(params);
    sized.set("width", String(width));
    return `${path}?${sized} ${width}w`;
  }).join(", ") };
}
