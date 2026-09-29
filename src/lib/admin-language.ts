import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function getSelectedAdminLanguageId(): Promise<number | undefined> {
  const cookieId = Number(cookies().get("admin-language-id")?.value);
  if (Number.isInteger(cookieId) && cookieId > 0) {
    const exists = await prisma.language.findUnique({ where: { id: cookieId }, select: { id: true } });
    if (exists) return exists.id;
  }
  const english = await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });
  return english?.id;
}

export async function getSelectedAdminCultureId(): Promise<number | undefined> {
  const cookieId = Number(cookies().get("admin-culture-id")?.value);
  if (Number.isInteger(cookieId) && cookieId > 0) {
    const exists = await prisma.language.findUnique({ where: { id: cookieId }, select: { id: true } });
    if (exists) return exists.id;
  }
  return undefined;
}
