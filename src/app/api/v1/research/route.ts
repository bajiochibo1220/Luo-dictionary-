import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/account-data";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";
import { researchLibrary, ResearchError } from "@/lib/research-service";
export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
export async function GET(request: Request) {
 try { await assertServiceAvailable(); const account=await getCurrentAccount(request); return NextResponse.json({success:true,data:await researchLibrary(account,new URL(request.url).searchParams)},{headers:nativeApiHeaders(request)}); }
 catch(error){return NextResponse.json({success:false,error:error instanceof ResearchError?error.message:"Research service unavailable. Please retry."},{status:error instanceof ResearchError?error.status:503,headers:nativeApiHeaders(request)});}
}
