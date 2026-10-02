import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import crypto from "crypto";
import fs from "fs";
import path from "path";

type CorpusSegment = {
  id: string;
  text: string;
  language: string;
  domain: string;
  genre: string;
  county: string;
  site: string;
  session_id: string;
  speaker_role?: string;
  consent_scope: string;
  restriction_level: string;
  source_uri: string;
  source_sha256: string;
  version?: string;
};

const prisma = new PrismaClient();
const countyCodes: Record<string, string> = {
  "Homa Bay": "HBY",
  Kisumu: "KSM",
  Siaya: "SYA",
  Nyanza: "NYA",
  "Cross-county": "XCT",
};

function nrfRecordUri(sessionId: string) {
  return `/JOOUST/NRF/LuoAI_Repository/03_repository_products/records/research_only/${encodeURIComponent(sessionId)}/record-v1.json`;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Usage: npm run corpus:import -- <path-to-corpus_validated.jsonl>");
  }
  const resolvedPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedPath)) throw new Error(`Corpus file not found: ${resolvedPath}`);

  const segments = fs.readFileSync(resolvedPath, "utf8").split(/\r?\n/).filter(Boolean).map((line, index) => {
    let segment: CorpusSegment;
    try { segment = JSON.parse(line) as CorpusSegment; }
    catch { throw new Error(`Invalid JSON on corpus line ${index + 1}`); }
    if (!segment.id || !segment.text || !segment.session_id || !segment.source_uri || !/^[a-f0-9]{64}$/i.test(segment.source_sha256 || "")) {
      throw new Error(`Missing ID, text, session/source reference, or SHA-256 on corpus line ${index + 1}`);
    }
    if (segment.consent_scope !== "research_only" || segment.restriction_level !== "internal") {
      throw new Error(`Unexpected governance values on ${segment.id}; import stopped to avoid widening access`);
    }
    return segment;
  });

  if (!segments.length) throw new Error("The corpus contains no transcript segments");
  const language = await prisma.language.findUnique({ where: { code: "luo" } });
  const module = await prisma.module.findUnique({ where: { code: "oral_histories" } });
  if (!language || !module) throw new Error("Seed the Luo language and oral_histories module before importing");

  const bySession = new Map<string, CorpusSegment[]>();
  for (const segment of segments) {
    const rows = bySession.get(segment.session_id) ?? [];
    rows.push(segment);
    bySession.set(segment.session_id, rows);
  }

  let imported = 0;
  for (const [sessionId, rows] of bySession) {
    const first = rows[0];
    const countyCode = countyCodes[first.county] ?? "UNK";
    const recordUri = nrfRecordUri(sessionId);
    await prisma.$transaction(async (tx) => {
      let record = await tx.culturalRecord.findUnique({ where: { nrfUri: recordUri } });
      if (!record) {
        const recordId = crypto.randomUUID();
        record = await tx.culturalRecord.create({
          data: {
            id: recordId,
            languageId: language.id,
            moduleId: module.id,
            title: `Oral history ${sessionId}`,
            summary: `${first.county} - ${first.domain}`,
            data: { sessionId, sourceUri: first.source_uri, sourceVersion: first.version ?? null, segmentCount: rows.length },
            status: "curated",
            nrfUri: recordUri,
            consentScope: "research_only",
            restrictionLevel: "internal",
            countyCode,
            siteName: first.site,
            sourceReference: first.source_uri,
            sessionId,
            nrfMetadata: {
              domain: first.domain,
              genre: first.genre,
              countyCode,
              siteName: first.site,
              sessionId,
              sourceReference: first.source_uri,
              consentScope: "research_only",
              restrictionLevel: "internal",
              sourceChecksum: first.source_sha256,
            },
          },
        });
        await tx.versionHistory.create({
          data: {
            recordId: record.id,
            version: 1,
            changedBy: null,
            changeReason: "Initial governed transcript-corpus import",
            data: {
              title: record.title,
              data: record.data as any,
              status: record.status,
              consentScope: record.consentScope,
              restrictionLevel: record.restrictionLevel,
              sourceReference: record.sourceReference,
              sessionId,
            } as any,
          },
        });
      }

      const provenanceExists = await tx.provenance.findFirst({
        where: { recordId: record.id, sourceName: first.source_uri, sourceType: "transcript_corpus" },
        select: { id: true },
      });
      if (!provenanceExists) {
        await tx.provenance.create({
          data: {
            recordId: record.id,
            sourceType: "transcript_corpus",
            sourceName: first.source_uri,
            sourceLocation: first.site,
            notes: `Source SHA-256 ${first.source_sha256}; corpus ${first.version ?? "unknown version"}; ${rows.length} segments.`,
          },
        });
      }

      const transcriptValues = rows.map((segment) => Prisma.sql`(
        ${crypto.randomUUID()}, ${language.id}, ${record.id}, ${segment.id},
        ${segment.source_uri}, ${segment.source_sha256.toLowerCase()}, ${sessionId},
        ${segment.text}, ${"luo"}, ${segment.speaker_role ?? null}, ${segment.site},
        ${segment.domain}, ${segment.genre}, ${"research_only"}, ${"internal"},
        ${countyCode}, ${segment.site}, ${1}
      )`);
      for (let offset = 0; offset < transcriptValues.length; offset += 250) {
        const batch = transcriptValues.slice(offset, offset + 250);
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "transcripts" (
            "id", "languageId", "recordId", "sourceId", "sourceUri", "sourceChecksum",
            "sessionId", "text", "languageCode", "speakerRole", "location", "domain",
            "genre", "consentScope", "restrictionLevel", "countyCode", "siteName", "versionNo"
          ) VALUES ${Prisma.join(batch)}
          ON CONFLICT ("sourceId") DO UPDATE SET
            "recordId" = EXCLUDED."recordId",
            "text" = EXCLUDED."text",
            "languageCode" = EXCLUDED."languageCode",
            "speakerRole" = EXCLUDED."speakerRole",
            "location" = EXCLUDED."location",
            "domain" = EXCLUDED."domain",
            "genre" = EXCLUDED."genre",
            "sessionId" = EXCLUDED."sessionId",
            "sourceUri" = EXCLUDED."sourceUri",
            "sourceChecksum" = EXCLUDED."sourceChecksum",
            "consentScope" = EXCLUDED."consentScope",
            "restrictionLevel" = EXCLUDED."restrictionLevel",
            "countyCode" = EXCLUDED."countyCode",
            "siteName" = EXCLUDED."siteName"
        `);
      }
    }, { maxWait: 15_000, timeout: 120_000 });
    imported += rows.length;
    console.log(`${sessionId}: ${rows.length} segments preserved as research_only/internal`);
  }

  console.log(`Import complete: ${bySession.size} sessions, ${imported} segments, ${crypto.createHash("sha256").update(fs.readFileSync(resolvedPath)).digest("hex")} corpus checksum`);
}

main()
  .catch((error) => {
    console.error("Corpus import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
