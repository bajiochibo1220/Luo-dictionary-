"use client";
import { EducationHub } from "./education-hub";
import { webFeatureRequest } from "@/lib/web-feature-request";
export function WebEducationHub({ languageId, userId, initialView }: { languageId: number; userId: string; initialView: "courses" | "classes" }) {
  return <EducationHub request={webFeatureRequest} languageId={languageId} userId={userId} initialView={initialView}
    onOpenResource={(id, resourceLanguageId) => { location.href = `/learn?resource=${encodeURIComponent(id)}&languageId=${resourceLanguageId}`; }} />;
}
