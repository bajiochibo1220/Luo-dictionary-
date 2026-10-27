import { z } from "zod";
export const KNOWLEDGE_RELATIONS = { related_to: "Related to", describes: "Describes", mentions: "Mentions", uses: "Uses", located_at: "Located at" } as const;
export const KnowledgeLinks = z.array(z.object({ recordId: z.string().uuid(), relation: z.enum(["related_to", "describes", "mentions", "uses", "located_at"]) }).strict()).max(20).refine(links => new Set(links.map(link => `${link.recordId}:${link.relation}`)).size === links.length, "Do not repeat the same relationship.");
export type KnowledgeLink = z.infer<typeof KnowledgeLinks>[number];
