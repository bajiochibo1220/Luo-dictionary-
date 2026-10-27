// Optional live smoke test. Sends only this application's public icon and a
// generic test prompt. Never prints credentials, model output or private data.
import "dotenv/config";
import fs from "node:fs/promises";
import { generateMediaAssistance } from "../../src/lib/ai/multimodal";
import { AiProviderError } from "../../src/lib/ai/gemini-text";
import { prisma } from "../../src/lib/db";
async function main() {
  const bytes = await fs.readFile("public/icons/luo-heritage-32.png");
  const started = Date.now();
  try {
    const result = await generateMediaAssistance("Describe the visible shapes in this public application icon in one short sentence. This is an integration test, not a cultural identification task.", {type:"image",mime:"image/png",bytes});
    console.log(JSON.stringify({check:"configured-media-provider",success:!!result.text,latencyMs:Date.now()-started,privateContentSent:false}));
    if(!result.text)process.exitCode=1;
  } catch(error) {
    console.log(JSON.stringify({check:"configured-media-provider",success:false,status:(error as {status?:number}).status || 503,reason:error instanceof AiProviderError ? error.message : "Integration prerequisite unavailable",latencyMs:Date.now()-started,privateContentSent:false}));
    process.exitCode=1;
  } finally {await prisma.$disconnect();}
}
void main();
