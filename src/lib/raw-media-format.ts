const rawFormats = new Set(["txt", "pdf", "doc", "docx", "obj", "glb", "gltf", "csv", "json", "jsonl", "zip", "onnx", "pt", "bin", "geojson"]);
export function rawFileExtension(name: string) { const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase(); return name.includes(".") && rawFormats.has(extension) ? extension : "bin"; }
export function verifiedMediaFormat(resource: { format?: string; public_id: string }, resourceType: string) {
  if (resource.format && /^[a-z0-9]{1,12}$/i.test(resource.format)) return resource.format.toLowerCase();
  return resourceType === "raw" ? rawFileExtension(resource.public_id.split("/").pop() || "") : "bin";
}
