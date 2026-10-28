const test = require('node:test'); const assert = require('node:assert/strict');
const React = require('react'); const {renderToStaticMarkup} = require('react-dom/server'); const {loader} = require('./load-ts.cjs');
function render(records, selected = []) {
 const {ContentTable} = loader({
  react: {...React, useState: initial => [Array.isArray(initial) ? selected : initial, () => {}]},
  'next/navigation': {useRouter: () => ({refresh(){}})},
  '@/components/shared/interface-language': {InterfaceText: ({source}) => source, InterfaceInput: props => React.createElement('input', props)},
  '@/components/admin/early-publish-button': {EarlyPublishButton: () => null},
 })('src/components/admin/content-table.tsx');
 return renderToStaticMarkup(React.createElement(ContentTable, {records, canDelete: false, canBulkWorkflow: false}));
}
const record = {id:'a',title:'Upload',status:'under_review',validatorId:'validator',canPublish:true,canEarlyPublish:true,createdAt:'2026-10-28',language:{code:'eng',nativeName:'English'},module:{code:'songs',baseName:'Songs'}};
test('publication controls remain visible to admins without separate workflow or deletion flags', () => {
 const html = render([record]); assert.match(html, /Select reviewed items ready to publish/); assert.match(html, /Select items for publishing before review/); assert.match(html, /Select Upload/);
 const selected = render([record], ['a']); assert.match(selected, /Publish selected before review/); assert.match(selected, />Publish selected</); assert.match(selected, /Clear selection/);
});
test('unauthorized rows do not expose publishing controls', () => {
 const html = render([{...record,canPublish:false,canEarlyPublish:false}]); assert.doesNotMatch(html, /Select reviewed items ready to publish|Select items for publishing before review|Select Upload/);
});

function finalRoute(session) {
 const records = [1, 2].map(languageId => ({id: String(languageId), title:'Reviewed '+languageId, languageId, moduleId:languageId, status:'under_review', validatorId:'validator', contributorId:'uploader', consentScope:'public_excerpt', restrictionLevel:'public', embargoUntil:null, updatedAt:new Date(), data:{sourcePermission:'confirmed'}, language:{code:'eng'}, module:{code:languageId===1?'songs':'artifacts'}, transcripts:[], translations:[]}));
 const writes = []; let transactions = 0;
 const tx = {culturalRecord:{updateMany:async ({where}) => {writes.push(where.id); return {count:1};}}, mediaAsset:{updateMany:async()=>{},findMany:async()=>[]}, consentRecord:{findFirst:async()=>null,create:async()=>({id:'consent'})}, reviewHistory:{create:async()=>{}}};
 const POST=loader({
  '@/lib/auth':{auth:async()=>session}, '@/lib/db':{prisma:{language:{findUnique:async()=>null},culturalRecord:{findMany:async()=>records},$transaction:async cb=>{transactions++;return cb(tx);}}},
  '@/lib/phase-one-content':{hasPublicReleaseSourcePermission:()=>true, validatePhaseOneSubmission:()=>null},
  '@/lib/content-publication':{finishPublication:async(_tx,id)=>id}, '@/lib/audit':{logAction:async()=>{}}, '@/lib/ai/gemini':{hasGemini:async()=>false}, '@/lib/ai/embeddings':{},
 })('src/app/api/content/bulk-publish/route.ts').POST;
 return {post:()=>POST(new Request('http://localhost/api/content/bulk-publish',{method:'POST',body:JSON.stringify({recordIds:['2','1']})})),writes,transactions:()=>transactions};
}
test('reviewed publication supports multiple content areas and languages with permission for every item', async()=>{
 const batch=finalRoute({user:{id:'publisher',languageRoles:[{languageId:1,role:'publisher'},{languageId:2,role:'publisher'}]}});
 const response=await batch.post(); assert.equal(response.status,200); assert.equal((await response.json()).count,2); assert.deepEqual(batch.writes,['1','2']); assert.equal(batch.transactions(),1);
});
test('reviewed batch rejects an unassigned language before any item is published',async()=>{
 const batch=finalRoute({user:{id:'publisher',languageRoles:[{languageId:1,role:'publisher'}]}});
 assert.equal((await batch.post()).status,403); assert.deepEqual(batch.writes,[]); assert.equal(batch.transactions(),0);
});

test('blocked public sharing displays the missing setting and a direct correction link',()=>{
 const html=render([{...record,status:'draft',canEdit:true,earlyPublicationIssues:['Set Source permission to Permission confirmed.']}],['a']);
 assert.match(html,/Public sharing settings need attention/); assert.match(html,/Set Source permission to Permission confirmed/);
 assert.match(html,/#source-and-access/); assert.doesNotMatch(html,/>Publish selected before review</);
});
