import type { Prisma } from "@prisma/client";

export async function addContentVersion(
  tx: Prisma.TransactionClient,
  input: {
    recordId: string;
    changedBy: string | null;
    changeReason?: string | null;
    snapshot: Prisma.InputJsonValue;
  }
) {
  const previous = await tx.versionHistory.findFirst({
    where: { recordId: input.recordId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return tx.versionHistory.create({
    data: {
      recordId: input.recordId,
      version: (previous?.version ?? 0) + 1,
      data: input.snapshot,
      changedBy: input.changedBy,
      changeReason: input.changeReason ?? null,
    },
  });
}
