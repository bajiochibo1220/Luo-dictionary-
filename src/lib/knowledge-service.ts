import { prisma } from "@/lib/db";
import { publicRecordWhere } from "@/lib/governance";
import { KnowledgeLinks } from "./knowledge-links";
export async function publicKnowledgeGraph(languageId: number, focus?: string) {
  if (!Number.isSafeInteger(languageId) || languageId <= 0 || focus && !/^[0-9a-f-]{36}$/i.test(focus)) throw Object.assign(new Error("Choose a valid community and record."), {status:400});
  const records = await prisma.culturalRecord.findMany({ where: { languageId, ...publicRecordWhere(), ...(focus ? {OR:[{id:focus},{data:{path:["related_records"],array_contains:[{recordId:focus}]}}]} : {}) }, take:100, orderBy:{title:"asc"}, select:{id:true,title:true,data:true,module:{select:{baseName:true}}} });
  const proposed = records.flatMap(record => { const value = record.data as Record<string, unknown> | null; const parsed=KnowledgeLinks.safeParse(value?.related_records || []); return parsed.success ? parsed.data.map(link=>({source:record.id,target:link.recordId,relation:link.relation})) : []; });
  const missing = [...new Set(proposed.map(link=>link.target).filter(id=>!records.some(record=>record.id===id)))].slice(0,500);
  const targets = missing.length ? await prisma.culturalRecord.findMany({ where:{languageId,id:{in:missing},...publicRecordWhere()},take:500,select:{id:true,title:true,module:{select:{baseName:true}}} }) : [];
  const nodes = [...records,...targets].map(record=>({id:record.id,title:record.title,module:record.module.baseName}));
  const ids=new Set(nodes.map(node=>node.id));
  return {nodes,edges:proposed.filter(edge=>ids.has(edge.source)&&ids.has(edge.target)),truncated:records.length===100||missing.length===500};
}
