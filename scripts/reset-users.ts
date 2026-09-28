import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n⚠  Soft reset — clearing user data...\n");

  // Delete in dependency order (children first)
  const auditLogs = await prisma.auditLog.deleteMany();
  console.log(`  Audit logs: ${auditLogs.count}`);

  const reviews = await prisma.reviewHistory.deleteMany();
  console.log(`  Review history: ${reviews.count}`);

  const notifications = await prisma.notification.deleteMany();
  console.log(`  Notifications: ${notifications.count}`);

  const aiResponses = await prisma.aIResponse.deleteMany();
  console.log(`  AI responses: ${aiResponses.count}`);

  const conversations = await prisma.conversation.deleteMany();
  console.log(`  Conversations: ${conversations.count}`);

  const embeddings = await prisma.embedding.deleteMany();
  console.log(`  Embeddings: ${embeddings.count}`);

  const transcripts = await prisma.transcript.deleteMany();
  console.log(`  Transcripts: ${transcripts.count}`);

  const media = await prisma.mediaAsset.deleteMany();
  console.log(`  Media assets: ${media.count}`);

  const provenance = await prisma.provenance.deleteMany();
  console.log(`  Provenance: ${provenance.count}`);

  const versions = await prisma.versionHistory.deleteMany();
  console.log(`  Version history: ${versions.count}`);

  const records = await prisma.culturalRecord.deleteMany();
  console.log(`  Cultural records: ${records.count}`);

  const dictEntries = await prisma.dictionaryEntry.deleteMany();
  console.log(`  Dictionary entries: ${dictEntries.count}`);

  const analytics = await prisma.analyticsEvent.deleteMany();
  console.log(`  Analytics events: ${analytics.count}`);

  const trainingExamples = await prisma.trainingExample.deleteMany();
  console.log(`  Training examples: ${trainingExamples.count}`);

  const trainingDatasets = await prisma.trainingDataset.deleteMany();
  console.log(`  Training datasets: ${trainingDatasets.count}`);

  const consentRecords = await prisma.consentRecord.deleteMany();
  console.log(`  Consent records: ${consentRecords.count}`);

  const userRoles = await prisma.userLanguageRole.deleteMany();
  console.log(`  User language roles: ${userRoles.count}`);

  const sessions = await prisma.session.deleteMany();
  console.log(`  Sessions: ${sessions.count}`);

  const accounts = await prisma.account.deleteMany();
  console.log(`  Accounts: ${accounts.count}`);

  const users = await prisma.user.deleteMany();
  console.log(`  Users: ${users.count}`);

  const backups = await prisma.backup.deleteMany();
  console.log(`  Backups: ${backups.count}`);

  console.log("\n✅ Soft reset complete.");
  console.log("Kept: languages, modules, translations, field definitions, roles.\n");
  console.log("Go to http://localhost:3000/admin-register to create a fresh super admin.\n");
}

main()
  .catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());