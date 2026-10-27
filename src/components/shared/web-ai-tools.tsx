"use client";
import { FeatureCommunity } from "./feature-community";
import { AiToolsWorkspace } from "./ai-tools-workspace";
import { webFeatureRequest } from "@/lib/web-feature-request";
export function WebAiTools({ languageId }: { languageId: number }) { return <FeatureCommunity initialId={languageId}>{id=><AiToolsWorkspace key={id} request={webFeatureRequest} languageId={id}/>}</FeatureCommunity>; }
