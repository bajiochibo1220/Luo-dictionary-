export async function readBoundedJson(request: Request, maximum: number): Promise<unknown> {
  const tooLarge = () => Object.assign(new Error("Request too large."), { status: 413 });
  if (Number(request.headers.get("Content-Length") || 0) > maximum) throw tooLarge();
  if (!request.body) throw new SyntaxError("Missing JSON body.");
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.byteLength; if (length > maximum) { await reader.cancel(); throw tooLarge(); } chunks.push(chunk.value); } }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let text: string; try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new SyntaxError("Use UTF-8 JSON."); }
  return JSON.parse(text);
}
