import { z } from "zod";

export const APP_API_VERSION = 1;
const navigationPath = z.string().startsWith("/");
const mediaUrl = z.string().refine(value => /^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value), "Expected an HTTP(S) URL or app-relative path.");
const language = z.object({
  id: z.number().int().positive(),
  code: z.string().min(1).max(40),
  name: z.string(),
  nativeName: z.string(),
});

// Keep this DTO free of database models, account data and provider secrets.
export const AppBootstrapSchema = z.object({
  apiVersion: z.literal(APP_API_VERSION),
  app: z.object({
    name: z.string(),
    tagline: z.string(),
    version: z.string(),
    icon: navigationPath,
    manifest: navigationPath,
  }),
  selectedLanguage: language,
  languages: z.array(language),
  modules: z.array(z.object({
    code: z.string(),
    title: z.string(),
    baseName: z.string(),
    href: navigationPath,
    contributionHref: navigationPath.nullable(),
  })),
  routes: z.record(navigationPath),
  contentFilters: z.array(z.object({ key: z.string(), label: z.string() })),
  contentViews: z.array(z.object({ key: z.string(), label: z.string(), icon: z.string() })),
});

export type AppBootstrap = z.infer<typeof AppBootstrapSchema>;

export const AppLibrarySchema = z.object({
  title: z.string(), baseName: z.string(),
  languageName: z.string(), languageCode: z.string(), languageId: z.number().int().positive(),
  moduleCode: z.string(), canContribute: z.boolean(),
  items: z.array(z.object({
    id: z.string(), title: z.string(), englishTitle: z.string().nullable().optional(), englishBodyText: z.string().nullable().optional(), summary: z.string().nullable(), englishSummary: z.string().nullable().optional(),
    bodyText: z.string().nullable().optional(),
    kind: z.enum(["cultural", "dictionary"]).optional(),
    moduleCode: z.string().optional(), moduleName: z.string().optional(), createdAt: z.string().datetime().optional(),
    media: z.array(z.object({ id: z.string(), type: z.string(), url: mediaUrl, thumbnailUrl: mediaUrl.nullable().optional(), format: z.string().nullable().optional() })),
  })),
  limits: z.object({ records: z.number().int().positive(), dictionaryEntries: z.number().int().positive() }),
  continuation: z.object({ records: z.string().nullable(), dictionary: z.string().nullable() }).optional(),
});

export type AppLibrary = z.infer<typeof AppLibrarySchema>;
