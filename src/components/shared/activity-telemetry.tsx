"use client";
import { useEffect } from "react";
import type { FeatureRequest } from "./learning-hub";
export function ActivityTelemetry({request,languageId,route}:{request:FeatureRequest;languageId:number;route:string}){
  useEffect(()=>{
    const record=(event:Event)=>{const detail=(event as CustomEvent).detail;void request("/api/v1/activity",{method:"POST",body:JSON.stringify({...detail,languageId})}).catch(()=>{});};
    window.addEventListener("heritage-activity",record);
    void request("/api/v1/activity",{method:"POST",body:JSON.stringify({eventType:"view",languageId})}).catch(()=>{});
    return()=>window.removeEventListener("heritage-activity",record);
  },[request,languageId,route]);
  return null;
}
