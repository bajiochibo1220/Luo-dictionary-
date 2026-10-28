import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const AdminPasswordSchema = z.object({
  password: z.string().min(12).max(128),
  currentPassword: z.string().max(128).optional(),
}).strict();

export async function changeAdminPassword(actorId: string, targetId: string, input: z.infer<typeof AdminPasswordSchema>) {
  const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.$transaction(async tx => {
    // Lock in a consistent order and recheck the master assignment at write time.
    for (const id of [...new Set([actorId, targetId])].sort()) await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { status: true, isMasterSuperAdmin: true, passwordHash: true } });
    if (actor?.status !== "active" || !actor.isMasterSuperAdmin) throw fail(403, "Only the active Master Super Admin can change passwords here.");
    const target = await tx.user.findUnique({ where: { id: targetId }, select: { id: true, status: true, isMasterSuperAdmin: true } });
    if (!target || target.status === "deleted") throw fail(404, "Account not found.");
    if (target.isMasterSuperAdmin && actorId !== targetId) throw fail(403, "A Master Super Admin must change their own password.");
    if (actorId === targetId && actor.passwordHash && (!input.currentPassword || !await bcrypt.compare(input.currentPassword, actor.passwordHash))) throw fail(400, "Enter your current password correctly.");
    await tx.user.update({ where: { id: targetId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
    await tx.session.deleteMany({ where: { userId: targetId } });
    await tx.verificationToken.deleteMany({ where: { OR: [
      { identifier: { contains: `"userId":"${targetId}"` } },
      { identifier: `account-reset:${targetId}` },
      { identifier: { startsWith: `phone-login:${targetId}:` } },
      { identifier: { startsWith: `phone-link:${targetId}:` } },
    ] } });
    await tx.auditLog.create({ data: { userId: actorId, action: "admin.password_changed", entityType: "user", entityId: targetId, newValue: { sessionsRevoked: true, self: actorId === targetId } } });
    return { signInAgain: actorId === targetId };
  }, { timeout: 30_000 });
}
