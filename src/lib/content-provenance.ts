import { z } from "zod";

export const contentProvenanceSchema = z.object({
  sourceType: z.string().trim().min(1).max(80),
  sourceName: z.string().trim().min(1).max(300),
  sourceDate: z.coerce.date().nullable().optional(),
  sourceLocation: z.string().trim().max(300).nullable().optional(),
  collector: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

export function parseContentProvenance(input: unknown) {
  if (input == null) return { success: true as const, data: null };
  const parsed = contentProvenanceSchema.safeParse(input);
  if (!parsed.success) return parsed;
  return {
    success: true as const,
    data: {
      ...parsed.data,
      sourceDate: parsed.data.sourceDate ?? null,
      sourceLocation: parsed.data.sourceLocation || null,
      collector: parsed.data.collector || null,
      notes: parsed.data.notes || null,
    },
  };
}
