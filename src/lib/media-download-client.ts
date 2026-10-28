/** Stop chunked responses before they exhaust a phone's memory. */
export async function readMediaBlob(response: Response, maximum = 100 * 1024 * 1024): Promise<Blob> {
  const tooLarge = () => new Error("This file is too large to preview on this device. Open it in the web version or download it separately.");
  if (Number(response.headers.get("content-length") || 0) > maximum) {
    await response.body?.cancel(); throw tooLarge();
  }
  if (!response.body) throw new Error("The file response was empty. Please try again.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maximum) { await reader.cancel(); throw tooLarge(); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  return new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
}
