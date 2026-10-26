import type { AppBootstrap, AppLibrary } from "./app-contract";
import type { AppAccount, ConversationHistory } from "./account-contract";
import type { NativeSessionReason } from "./native-login-client";
export type ApplicationSession = { accountId?: string; expiresAt: string; accessToken?: string; refreshToken?: string };
export type ApplicationAdapters = {
  apiOrigin: string; artwork: string;
  bootstrap: (language: string, signal: AbortSignal) => Promise<AppBootstrap>;
  library: (language: string, module: string, signal: AbortSignal) => Promise<AppLibrary>;
  account: (signal: AbortSignal) => Promise<AppAccount>;
  conversations: (archived: boolean, signal: AbortSignal) => Promise<ConversationHistory>;
  chatRequest: (path: string, init?: RequestInit) => Promise<Response>;
  featureRequest: (path: string, init?: RequestInit) => Promise<any>;
  featureFetch: typeof fetch;
  nativeSession: {
    isNative: boolean;
    subscribe: (callback: (session: ApplicationSession | null, reason: NativeSessionReason) => void) => () => void;
    connect: (onError: (message: string) => void) => Promise<() => void>;
    resume: () => Promise<unknown>;
    start: (intent?: "login" | "register") => Promise<unknown>;
    signOut: () => Promise<unknown>;
  };
};
