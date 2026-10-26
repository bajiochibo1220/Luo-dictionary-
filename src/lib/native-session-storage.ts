import { z } from "zod";
import { NativeSessionSchema } from "@/lib/native-auth-contract";

export const PendingNativeLoginSchema = z.object({
  verifier: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  state: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expires: z.number().finite(),
}).strict();
export type PendingNativeLogin = z.infer<typeof PendingNativeLoginSchema>;
export const NativeStoredStateSchema = z.object({
  version: z.literal(1), origin: z.string(),
  pending: PendingNativeLoginSchema.nullable(),
  session: NativeSessionSchema.nullable(),
  revocations: z.array(NativeSessionSchema).max(5),
}).strict();
export type NativeStoredState = z.infer<typeof NativeStoredStateSchema>;
// Implementations must use OS-protected storage. There is deliberately no
// localStorage/Preferences fallback for an unavailable native plugin.
export type NativeSecureStorage = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
};
