"use client";
import { FeatureCommunity } from "./feature-community";
import { KnowledgeExplorer } from "./knowledge-explorer";
import { webFeatureRequest } from "@/lib/web-feature-request";
export function WebKnowledge({languageId}:{languageId:number}){return <FeatureCommunity initialId={languageId}>{id=><KnowledgeExplorer key={id} request={webFeatureRequest} languageId={id}/>}</FeatureCommunity>;}
