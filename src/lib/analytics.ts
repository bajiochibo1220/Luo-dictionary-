import { prisma } from "@/lib/db";

type TrackEventInput = {
  eventType: string;
  languageId?: number | null;
  userId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function trackEvent(input: TrackEventInput) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: input.eventType,
        languageId: input.languageId ?? null,
        userId: input.userId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[analytics] track failed:", err);
  }
}