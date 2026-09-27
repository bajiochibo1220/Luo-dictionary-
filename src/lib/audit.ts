import { prisma } from "@/lib/db";

type LogActionInput = {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function logAction(input: LogActionInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] log failed:", err);
  }
}