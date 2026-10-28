import { mediaThumbnail } from "@/lib/media-preview";
// Public permission applies to the curated content, not participant identities,
// operational metadata or storage-provider identifiers bundled into ORM rows.
const privateKeys = new Set(["publicmaplatitude","publicmaplongitude","relatedrecords","contributorid", "contributorage", "reviewerid", "validatorid", "createdby", "reviewedby", "sourcereference", "sourceuri", "sourcechecksum", "sourceid", "sourcename", "nrfmetadata", "nrfuri", "consentrecords", "consentlinks", "provenance", "versions", "reviews", "publicid", "resourceType".toLowerCase(), "deliverytype", "checksum", "assetid", "storagekey", "email", "phone", "phonenumber", "participantid", "participantname", "identity", "preciselocation", "latitude", "longitude", "lat", "lng", "lon", "gps", "exactgps", "coordinates", "sourcepermission", "attributionpreference", "sessionid"]);
export function publicFields<T>(value: T, named = false): T {
  if (typeof value === "bigint") return (value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(value) : value.toString()) as T;
  if (Array.isArray(value)) return value.map(item => publicFields(item, named)) as T;
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  const record = value as Record<string, unknown>;
  const allowName = record.attributionPreference === "name" || named;
  const media = typeof record.id === "string" && typeof record.url === "string" && typeof record.type === "string";
  return Object.fromEntries(Object.entries(record).filter(([key]) => {
    const normalized = key.replaceAll("_", "").toLowerCase();
    return !["publicationofid", "publicationof", "publication"].includes(normalized) && !key.startsWith("__") && !privateKeys.has(normalized) && (allowName || !["speaker", "narrator", "speakername", "collector"].includes(normalized));
  }).map(([key, item]) => [key, media && key === "url" ? `/api/media/${encodeURIComponent(String(record.id))}/file` : media && key === "thumbnailUrl" ? mediaThumbnail(String(record.id), String(record.type)) : publicFields(item, allowName)])) as T;
}
