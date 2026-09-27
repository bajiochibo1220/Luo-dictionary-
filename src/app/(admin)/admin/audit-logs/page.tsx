import Link from "next/link";
import { prisma } from "@/lib/db";
import { AuditLogTable } from "@/components/admin/audit-log-table";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { days?: string; action?: string; entityType?: string };
}) {
  const days = Math.max(1, Math.min(365, Number(searchParams.days) || 30));
  const since = new Date();
  since.setDate(since.getDate() - days);

  const where: any = { createdAt: { gte: since } };
  if (searchParams.action) {
    where.action = { contains: searchParams.action, mode: "insensitive" };
  }
  if (searchParams.entityType) {
    where.entityType = searchParams.entityType;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const formatted = logs.map((l) => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    oldValue: l.oldValue,
    newValue: l.newValue,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt.toISOString(),
    user: l.user,
  }));

  return (
    <div>
      <header className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-1">
            Audit Logs
          </h1>
          <p className="text-sm text-stone-500">
            {total} entries · last {days} days
          </p>
        </div>
        <Link
          href={`/api/audit-logs?days=${days}&format=csv`}
          className="px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm font-medium hover:border-amber-400"
        >
          Export CSV
        </Link>
      </header>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`/admin/audit-logs?days=${d}`}
            className={`text-xs px-3 py-1.5 rounded-full ${
              days === d
                ? "bg-amber-600 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
            }`}
          >
            {d}d
          </Link>
        ))}
      </div>

      <AuditLogTable logs={formatted} />
    </div>
  );
}