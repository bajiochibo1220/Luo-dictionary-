export function publicLocation(data: unknown): [number,number] | null {
  if(!data||typeof data!=="object"||Array.isArray(data))return null;
  const value=data as Record<string,unknown>;
  if(!["string","number"].includes(typeof value.public_map_latitude)||!["string","number"].includes(typeof value.public_map_longitude))return null;
  if(value.public_map_permission!=="confirmed"||String(value.public_map_latitude??"").trim()===""||String(value.public_map_longitude??"").trim()==="")return null;
  const lat=Number(value.public_map_latitude),lng=Number(value.public_map_longitude);
  return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?[Number(lat.toFixed(2)),Number(lng.toFixed(2))]:null;
}
