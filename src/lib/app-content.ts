// Public presentation data shared by web and bundled mobile clients.
export type MediaItem = {
  id: string;
  type: string;
  url: string;
  thumbnailUrl?: string | null;
  format?: string | null;
};

export type ContentItem = {
  id: string;
  title: string;
  kind?: "cultural" | "dictionary";
  summary: string | null;
  bodyText?: string | null;
  englishSummary?: string | null;
  media: MediaItem[];
  moduleCode?: string;
  moduleName?: string;
  createdAt?: string;
};
