"use client";
import { useEffect,useState } from "react";
import type { AppAccount } from "@/lib/account-contract";
import { ResearchLibrary } from "./research-library";
import { webFeatureRequest } from "@/lib/web-feature-request";
export function WebResearchLibrary({languageId}:{languageId:number}){const [account,setAccount]=useState<AppAccount|null>(null);useEffect(()=>{let active=true;void webFeatureRequest("/api/v1/account").then(value=>{if(active)setAccount(value);}).catch(()=>{});return()=>{active=false;};},[]);return <ResearchLibrary request={webFeatureRequest} transport={fetch} languageId={languageId} account={account}/>;}
