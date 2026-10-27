"use client";
import { FeatureCommunity } from "./feature-community";
import { PlacesExplorer } from "./places-explorer";
import { webFeatureRequest } from "@/lib/web-feature-request";
export function WebPlaces({languageId}:{languageId:number}){return <FeatureCommunity initialId={languageId}>{id=><PlacesExplorer key={id} request={webFeatureRequest} languageId={id}/>}</FeatureCommunity>;}
