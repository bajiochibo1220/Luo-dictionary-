import { InterfaceText } from "@/components/shared/interface-language";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { BackupActions } from "@/components/admin/backup-actions";
import { BackupTable } from "@/components/admin/backup-table";

export default async function BackupPage() {
  const session = await auth();
  if (!session?.user?.isMasterSuperAdmin) redirect("/super-admin/dashboard");
  const backups = await prisma.backup.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const formatted = backups.map((b) => ({
    id: b.id,
    filename: b.filename,
    sizeBytes: Number(b.sizeBytes),
    type: b.type,
    checksum: b.checksum,
    createdAt: b.createdAt.toISOString(),
  }));

  const totalSize = formatted.reduce((sum, b) => sum + b.sizeBytes, 0);
  const totalMB = (totalSize / (1024 * 1024)).toFixed(2);

  return (
    <div>
      <header className="workspace-heading mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-1"><InterfaceText source="Database Backups" /></h1>
          <p className="text-sm text-stone-500">
            {formatted.length} <InterfaceText source={formatted.length === 1 ? "backup" : "backups"} />{" "}
            · {totalMB}<InterfaceText source=" MB total" /></p>
        </div>
        <BackupActions />
      </header>

      <div className="bg-linear-to-br from-amber-50 to-stone-50 rounded-xl border border-amber-100 p-6 mb-8">
        <h2 className="text-xs uppercase tracking-wider text-amber-700 mb-2"><InterfaceText source="How It Works" /></h2>
        <ul className="text-sm text-stone-700 space-y-1">
          <li><InterfaceText source="Cloudinary file bytes require a separate storage backup. These snapshots contain account credentials and must be kept private." /></li>
          <li>
            • <strong><InterfaceText source="Backup Now" /></strong><InterfaceText source=" exports all database tables to a JSON file" /></li>
          <li><InterfaceText source="• Files are saved in " /><code><InterfaceText source="data/exports/backups/" /></code></li>
          <li><InterfaceText source="• Each backup includes a SHA-256 checksum for integrity" /></li>
          <li><InterfaceText source="• Download any backup or delete old ones from this page" /></li>
        </ul>
      </div>

      <BackupTable backups={formatted} />
    </div>
  );
}