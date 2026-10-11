import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const EDITABLE_STATUSES = ["draft", "needs_edit", "rejected", "curated"];

export async function lockEditableRecord(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM cultural_records WHERE id = ${id} FOR UPDATE`;
  const record = await tx.culturalRecord.findUnique({ where: { id } });
  if (!record) throw Object.assign(new Error("Content not found."), { status: 404 });
  if (!EDITABLE_STATUSES.includes(record.status)) throw Object.assign(new Error("This item is locked for review or publication. Ask a reviewer to return it for changes."), { status: 409 });
  return record;
}

export function withApiErrors<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try { return await handler(...args); }
    catch (error: any) {
      const status = error?.status || (error?.name === "ZodError" || error instanceof SyntaxError ? 400 : error?.code === "P2025" ? 404 : error?.code === "P2002" || /already|moved|changed|review stage/i.test(error?.message ?? "") ? 409 : 500);
      return NextResponse.json({ success: false, error: status < 500 || status === 503 ? error.message : "The request could not be completed. Please try again." }, { status });
    }
  }) as T;
}
