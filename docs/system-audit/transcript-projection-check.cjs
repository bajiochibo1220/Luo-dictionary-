const {loader}=require('../../tests/load-ts.cjs');
const publicFields={consentScope:'public_excerpt',restrictionLevel:'public',embargoUntil:null};
const transcript={id:'synthetic-transcript',languageId:1,recordId:'synthetic-record',text:'Synthetic public excerpt',languageCode:'luo',timestamps:null,isAligned:false,...publicFields,speaker:'SYNTHETIC_PRIVATE_SPEAKER',sourceUri:'/private/source',sourceReference:'SYNTHETIC_INTERNAL_REFERENCE',location:'SYNTHETIC_EXACT_LOCATION',record:{id:'synthetic-record',languageId:1,status:'published',contributorId:'synthetic-owner',...publicFields}};
let actor=null;
const load=loader({'@/lib/auth':{auth:async()=>actor},'@/lib/db':{prisma:{transcript:{findUnique:async()=>transcript}}}});
(async()=>{
 const route=load('src/app/api/transcripts/[id]/route.ts');
 for(const label of ['guest','ordinary_registered_user']){
  actor=label==='guest'?null:{user:{id:'synthetic-reader',isSuperAdmin:false,languageRoles:[]}};
  const response=await route.GET(new Request('http://localhost/api/transcripts/synthetic-transcript'),{params:Promise.resolve({id:'synthetic-transcript'})});
  const body=await response.json();
  console.log(JSON.stringify({actor:label,status:response.status,returnedFields:Object.keys(body.data||{}),exposesSpeaker:!!body.data?.speaker,exposesLocation:!!body.data?.location,exposesSourceReference:!!body.data?.sourceReference,exposesParentRecord:!!body.data?.record}));
 }
})().catch(()=>{console.log('DIAGNOSTIC_FAILED');process.exitCode=1});
