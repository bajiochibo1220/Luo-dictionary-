"use client";
import { SavedItems } from "./saved-items";
import { NavigationLink } from "@/components/layout/navigation-link";
import { webFeatureRequest } from "@/lib/web-feature-request";
export function WebSavedItems() { return <SavedItems request={webFeatureRequest} Link={NavigationLink} />; }
