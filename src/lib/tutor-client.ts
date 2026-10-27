import type { FeatureRequest } from "@/components/shared/learning-hub";
export async function transcribePractice(request:FeatureRequest,languageId:number,recording:Blob){
  if(recording.size>2*1024*1024)throw new Error("Use a practice recording smaller than 2 MB.");
  const encoded=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=()=>reject(new Error("Unable to read the recording."));reader.readAsDataURL(recording);});
  const result=await request("/api/v1/tutor",{method:"POST",body:JSON.stringify({mode:"transcribe_recording",languageId,consent:true,mime:recording.type.split(";")[0]||"audio/webm",audio:encoded})});
  return String(result.text||"");
}
