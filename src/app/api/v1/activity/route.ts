import { NextResponse } from "next/server";
import { z } from "zod";
import { readBoundedJson } from "@/lib/bounded-json";
import { getCurrentAccount } from "@/lib/account-data";
import { appApiHeaders } from "@/lib/app-api-headers";
import { nativeApiHeaders, nativePreflight, sameOriginBrowserPost } from "@/lib/native-api-headers";
import { assertAccountRateLimit } from "@/lib/account-security";
import { trackEvent } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { publicRecordWhere } from "@/lib/governance";
const Input=z.object({eventType:z.enum(["view","search","audio_play","video_play"]),languageId:z.number().int().positive(),recordId:z.string().uuid().optional(),query:z.string().trim().max(100).optional()}).strict();
export const dynamic="force-dynamic";
export const OPTIONS=nativePreflight;
export async function POST(request:Request){
  const headers={...appApiHeaders(request.headers.get("Origin")),...nativeApiHeaders(request)};
  try{
    if(!request.headers.has("Authorization")&&!sameOriginBrowserPost(request)&&!(headers["Access-Control-Allow-Origin"]&&!request.headers.has("Cookie")&&request.headers.get("Content-Type")?.split(";")[0]==="application/json"))return NextResponse.json({success:false},{status:403,headers});
    const account=await getCurrentAccount(request);if(!account&&request.headers.has("Authorization"))return NextResponse.json({success:false},{status:401,headers});
    const input=Input.parse(await readBoundedJson(request,1500));
    await assertAccountRateLimit(account?.id||"anonymous","activity",account?120:600,60000);
    if(!await prisma.language.findFirst({where:{id:input.languageId,isActive:true},select:{id:true}}))return NextResponse.json({success:true},{status:202,headers});
    let entityType:string|null=null;
    if(input.recordId){const where={id:input.recordId,languageId:input.languageId,...publicRecordWhere()};const cultural=await prisma.culturalRecord.findFirst({where,select:{id:true}});const dictionary=cultural?null:await prisma.dictionaryEntry.findFirst({where,select:{id:true}});if(!cultural&&!dictionary)return NextResponse.json({success:true},{status:202,headers});entityType=cultural?"cultural_record":"dictionary";}
    const country=process.env.VERCEL==="1"?request.headers.get("x-vercel-ip-country"):null;
    const agent=request.headers.get("user-agent")||"";const device=/iPad|Tablet/i.test(agent)?"tablet":/Mobile|Android|iPhone/i.test(agent)?"mobile":"desktop";
    const query=input.query&&!/@|\d{7,}/.test(input.query)?input.query:undefined;
    await trackEvent({eventType:input.eventType,languageId:input.languageId,userId:account?.id,entityType,entityId:input.recordId,metadata:{device,...(country&&/^[A-Z]{2}$/.test(country)?{country}:{}),...(query?{query}:{})}});
    return NextResponse.json({success:true},{status:202,headers});
  }catch{return NextResponse.json({success:false},{status:400,headers});}
}
