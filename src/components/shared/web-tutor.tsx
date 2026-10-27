"use client";
import { FeatureCommunity } from "./feature-community";
import { TutorWorkspace } from "./tutor-workspace";
import { webFeatureRequest } from "@/lib/web-feature-request";
export function WebTutor({ languageId, languageCode }: { languageId: number; languageCode: string }) { return <FeatureCommunity initialId={languageId} initialCode={languageCode}>{(id,code)=><TutorWorkspace key={id} languageId={id} languageCode={code} request={webFeatureRequest}/>}</FeatureCommunity>; }
