import { NextResponse } from "next/server";
import { appApiHeaders } from "@/lib/app-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";
import { publicKnowledgeGraph } from "@/lib/knowledge-service";
export const dynamic="force-dynamic";
export async function OPTIONS(request:Request){return new NextResponse(null,{status:204,headers:appApiHeaders(request.headers.get("Origin"))});}
export async function GET(request:Request){const headers=appApiHeaders(request.headers.get("Origin"));try{await assertServiceAvailable();const params=new URL(request.url).searchParams;return NextResponse.json({success:true,data:await publicKnowledgeGraph(Number(params.get("languageId")),params.get("focus")||undefined)},{headers});}catch(error){const status=(error as {status?:number})?.status===400?400:503;return NextResponse.json({success:false,error:status===400?"Choose a valid community and record.":"Connections are temporarily unavailable."},{status,headers});}}
