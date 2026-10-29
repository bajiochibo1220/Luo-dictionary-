"use client";
import { DiscoveryFeed } from "@/components/shared/discovery-feed";
import { webFeatureRequest } from "@/lib/web-feature-request";
import { NavigationLink } from "./navigation-link";

export function PublicDiscovery({ languageCode, languageName }: { languageCode: string; languageName: string }) {
  return <DiscoveryFeed request={webFeatureRequest} languageCode={languageCode} languageName={languageName} signedIn Link={NavigationLink} />;
}
