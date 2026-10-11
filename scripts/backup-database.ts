import "dotenv/config";
import { createDatabaseBackup } from "../src/lib/database-backup";
import { prisma } from "../src/lib/db";
createDatabaseBackup().then(backup => console.log(`Database backup created: ${backup.filename}. Media file bytes require a separate storage backup.`)).catch(() => { console.error("Database backup failed."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
