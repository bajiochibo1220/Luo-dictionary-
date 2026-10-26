"use client";

import { NavigationLink } from "./navigation-link";
import { type ModuleContentProps } from "@/components/shared/module-content-view";
import { PaginatedLibrary } from "@/components/shared/paginated-library";
import { webFeatureRequest } from "@/lib/web-feature-request";

export type { ContentItem, MediaItem } from "@/lib/app-content";

export function ModuleContent(props: ModuleContentProps) {
  return <PaginatedLibrary initial={props} request={webFeatureRequest} Link={NavigationLink} />;
}
