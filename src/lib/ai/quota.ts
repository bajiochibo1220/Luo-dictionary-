import crypto from "crypto";
import { prisma } from "@/lib/db";

// Database-backed counters work across server processes and restarts. Only trust
// forwarded IPs when the deployment explicitly opts into a trusted proxy.
export async function assertAiQuota(request: Request, userId?: string) {
  const ip = process.env.TRUST_PROXY === "true"
    ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anonymous"
    : "anonymous";
  const identity = crypto.createHash("sha256").update(userId || ip).digest("hex");
  const now = Date.now();
  const positiveLimit = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  };
  const limits = [
    { key: `rate-limit:ai:minute:${identity}`, duration: 60_000, limit: positiveLimit(process.env.AI_REQUESTS_PER_MINUTE, 10) },
    { key: "rate-limit:ai:daily", duration: 86_400_000, limit: positiveLimit(process.env.AI_REQUESTS_PER_DAY, 500) },
  ];
  await prisma.$transaction(async (tx) => {
    // A single lock provides a consistent ordering for both counters.
    await tx.$queryRaw`WITH lock_result AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext('luolingua-ai-quota'))) SELECT 1::int AS locked FROM lock_result`;
    for (const bucket of limits) {
      const previous = await tx.systemSetting.findUnique({ where: { key: bucket.key } });
      let value = { count: 0, resetAt: now + bucket.duration };
      if (previous) {
        try { const parsed = JSON.parse(previous.value); if (parsed.resetAt > now) value = parsed; } catch { /* discard invalid counter */ }
      }
      if (value.count >= bucket.limit) throw Object.assign(new Error("AI request limit reached. Please try again later."), { status: 429, retryAfter: Math.ceil((value.resetAt - now) / 1000) });
      const data = JSON.stringify({ ...value, count: value.count + 1 });
      await tx.systemSetting.upsert({ where: { key: bucket.key }, create: { key: bucket.key, value: data }, update: { value: data } });
    }
  }, { maxWait: 5_000, timeout: 15_000 });
}
