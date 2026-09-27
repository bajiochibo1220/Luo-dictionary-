import { prisma } from "@/lib/db";
import { BackupActions } from "@/components/admin/backup-actions";
import { BackupTable } from "@/components/admin/backup-table";

export default async function BackupPage() {
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
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-1">
            Backup & Restore
          </h1>
          <p className="text-sm text-stone-500">
            {formatted.length} {formatted.length === 1 ? "backup" : "backups"}{" "}
            · {totalMB} MB total
          </p>
        </div>
        <BackupActions />
      </header>

      <div className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-xl border border-amber-100 p-6 mb-8">
        <h2 className="text-xs uppercase tracking-wider text-amber-700 mb-2">
          How It Works
        </h2>
        <ul className="text-sm text-stone-700 space-y-1">
          <li>
            • <strong>Backup Now</strong> exports all database tables to a JSON
            file
          </li>
          <li>• Files are saved in <code>data/exports/backups/</code></li>
          <li>• Each backup includes a SHA-256 checksum for integrity</li>
          <li>• Download any backup or delete old ones from this page</li>
        </ul>
      </div>

      <BackupTable backups={formatted} />
    </div>
  );
}