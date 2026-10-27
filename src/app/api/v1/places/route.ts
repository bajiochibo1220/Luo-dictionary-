import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicRecordWhere } from "@/lib/governance";
import { publicLocation } from "@/lib/public-location";
import { appApiHeaders } from "@/lib/app-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";
export const dynamic="force-dynamic";
export async function OPTIONS(request:Request){return new NextResponse(null,{status:204,headers:appApiHeaders(request.headers.get("Origin"))});}
export async function GET(request:Request){const headers=appApiHeaders(request.headers.get("Origin"));try{await assertServiceAvailable();const params=new URL(request.url).searchParams,languageId=Number(params.get("languageId")),query=(params.get("q")||"").trim();if(!Number.isSafeInteger(languageId)||languageId<=0||query.length>100)return NextResponse.json({success:false,error:"Choose a valid community and search."},{status:400,headers});const records=await prisma.culturalRecord.findMany({where:{languageId,...publicRecordWhere(),module:{code:{in:["heritage_sites","oral_histories"]}},data:{path:["public_map_permission"],equals:"confirmed"},...(query?{title:{contains:query,mode:"insensitive"}}:{})},take:200,orderBy:{title:"asc"},select:{id:true,title:true,data:true,module:{select:{baseName:true}}}});const places=records.flatMap(record=>{const point=publicLocation(record.data);return point?[{id:record.id,title:record.title,module:record.module.baseName,latitude:point[0],longitude:point[1]}]:[];});return NextResponse.json({success:true,data:{places,bounded:records.length===200}},{headers});}catch{return NextResponse.json({success:false,error:"The map is temporarily unavailable."},{status:503,headers});}}
