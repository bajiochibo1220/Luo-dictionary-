"use client";
import { useEffect,useState } from "react";
import type { FeatureRequest } from "./learning-hub";
import { PaginatedLibrary } from "./paginated-library";
import type { ModuleContentProps,AppLink } from "./module-content-view";
import { InterfaceText } from "./interface-language";
const DefaultLink:AppLink=({href,children,...props})=><a href={href} {...props}>{children}</a>;
export function PublicResearch({request,languageId,Link=DefaultLink}:{request:FeatureRequest;languageId:number;Link?:AppLink}){
  const [content,setContent]=useState<ModuleContentProps|null>(null),[error,setError]=useState(""),[retry,setRetry]=useState(0);
  useEffect(()=>{let active=true;setContent(null);setError("");void request("/api/languages").then(async languages=>{const language=languages.find((item:{id:number;code:string})=>item.id===languageId&&item.code!=="eng");if(!language)throw new Error("Choose an active community.");const data=await request(`/api/v1/library?language=${encodeURIComponent(language.code)}&module=research`);if(active)setContent(data);}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Public research is unavailable.");});return()=>{active=false;};},[request,languageId,retry]);
  return <section><div className="p-5"><h1 className="font-serif text-3xl"><InterfaceText source="Public research library"/></h1><p><InterfaceText source="Browse explicitly public publications, reports and datasets. Private research materials and exports require assigned research access."/></p>{error&&<p role="alert">{error}<button className="ml-3 min-h-11 underline" onClick={()=>setRetry(value=>value+1)}><InterfaceText source="Retry"/></button></p>}{!content&&!error&&<p role="status"><InterfaceText source="Loading..."/></p>}</div>{content&&<PaginatedLibrary initial={content} request={request} Link={Link}/>}</section>;
}
