"use client";
import { useEffect,useState,type ReactNode } from "react";
import { webFeatureRequest } from "@/lib/web-feature-request";
import { InterfaceOption,InterfaceText } from "./interface-language";
export function FeatureCommunity({initialId,initialCode="luo",children}:{initialId:number;initialCode?:string;children:(id:number,code:string)=>ReactNode}){
  const [languages,setLanguages]=useState<{id:number;code:string;nativeName:string}[]>([{id:initialId,code:initialCode,nativeName:initialCode}]),[selected,setSelected]=useState(initialId);
  useEffect(()=>{let active=true;void webFeatureRequest("/api/languages").then(data=>{if(active&&Array.isArray(data))setLanguages(data.filter(item=>item.code!=="eng"));}).catch(()=>{});return()=>{active=false;};},[]);
  const language=languages.find(item=>item.id===selected);
  return <><label className="mx-auto flex max-w-5xl items-center gap-3 px-5 pt-4"><InterfaceText source="Community"/><select className="min-h-11 rounded-lg border border-stone-400 bg-white p-2 text-stone-900" value={selected} onChange={event=>setSelected(Number(event.target.value))}>{languages.map(item=><InterfaceOption key={item.id} value={item.id}>{item.nativeName}</InterfaceOption>)}</select></label>{children(selected,language?.code||initialCode)}</>;
}
