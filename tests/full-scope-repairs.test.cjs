const {test}=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loader}=require('./load-ts.cjs');

test('only Google and email/password providers remain registered',()=>{
 let config;loader({'next-auth':value=>{config=value;return {};},'next-auth/providers/google':value=>({id:'google',...value}),'next-auth/providers/credentials':value=>({id:'credentials',...value})})('src/lib/auth.ts');
 assert.deepEqual(config.providers.map(p=>p.id),['google','credentials']);
});
test('removed phone endpoint never issues or links a code',async()=>{
 const {POST}=loader()('src/app/api/auth/phone/route.ts');
 const result=await POST(new Request('http://localhost:3000/api/auth/phone',{method:'POST'}));
 assert.equal(result.status,410);assert.match((await result.json()).error,/Google or email/);
});
test('shared collection separates sticky search from accessible bottom media controls',()=>{
 const {ModuleContentView}=loader()('src/components/shared/module-content-view.tsx');
 const Link=({href,children,className})=>React.createElement('a',{href,className},children);
 const html=renderToStaticMarkup(React.createElement(ModuleContentView,{title:'Muma',baseName:'Dictionary',languageName:'Dholuo',languageCode:'luo',languageId:1,moduleCode:'dictionary',items:[],Link}));
 for(const label of ['All','Images','Audio','Video','Transcripts'])assert.ok(html.includes('aria-label="'+label+'"'));
 assert.match(html,/data-sticky-controls/);assert.match(html,/data-bottom-controls/);assert.match(html,/library-media-dock/);
});
test('account email accepts admin-saved credentials when environment overrides are absent',async()=>{
 const old={EMAIL_PROVIDER:process.env.EMAIL_PROVIDER,EMAIL_FROM:process.env.EMAIL_FROM,EMAIL_API_KEY:process.env.EMAIL_API_KEY};
 for(const key of Object.keys(old))delete process.env[key];
 try {
  const {getEmailConfiguration}=loader({'./settings':{getSystemSettings:async()=>({smtp_provider:'resend',smtp_from:'sender@example.org',smtp_password:'test-key'})}})('src/lib/email.ts');
  assert.deepEqual(await getEmailConfiguration(),{provider:'resend',from:'sender@example.org',key:'test-key'});
 }finally{for(const [key,value]of Object.entries(old))if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
test('missing email configuration fails before address lookup to avoid account enumeration',async()=>{
 const env=process.env.APP_PUBLIC_URL;process.env.APP_PUBLIC_URL='https://example.org';
 const tx={$queryRaw:async()=>[],systemSetting:{findUnique:async()=>null,upsert:async()=>{}}};
 const {requestAccountEmail}=loader({'@/lib/db':{prisma:{$transaction:async fn=>fn(tx),user:{findFirst:()=>assert.fail('Must not look up address')}}},'@/lib/email':{getEmailConfiguration:async()=>{throw Object.assign(new Error('Missing provider'),{status:503});}}})('src/lib/account-security.ts');
 try{await assert.rejects(requestAccountEmail('unknown@example.org','reset'),e=>e.status===503);}finally{if(env===undefined)delete process.env.APP_PUBLIC_URL;else process.env.APP_PUBLIC_URL=env;}
});
test('delivery failure removes the unusable recovery token',async()=>{
 const env=process.env.APP_PUBLIC_URL;process.env.APP_PUBLIC_URL='https://example.org';let created,removed;
 const tx={$queryRaw:async()=>[],systemSetting:{findUnique:async()=>null,upsert:async()=>{}}};
 const {requestAccountEmail}=loader({'@/lib/db':{prisma:{$transaction:async fn=>fn(tx),user:{findFirst:async()=>({id:'owner',email:'owner@example.org'})},verificationToken:{create:async({data})=>{created=data;},deleteMany:async({where})=>{removed=where.token;}}}},'@/lib/email':{getEmailConfiguration:async()=>({}),sendSystemEmail:async()=>{throw new Error('Rejected');}}})('src/lib/account-security.ts');
 try{await assert.rejects(requestAccountEmail('owner@example.org','reset'),/Rejected/);assert.equal(removed,created.token);assert.match(created.token,/^reset:[0-9a-f]{64}$/);}finally{if(env===undefined)delete process.env.APP_PUBLIC_URL;else process.env.APP_PUBLIC_URL=env;}
});
test('greetings are generated using the actual model and conversation, without retrieval or canned responses',async()=>{
 let prompt;
 const {askQuestion}=loader({'@/lib/settings':{getSystemSetting:async()=>''},'./gemini-text':{getGeminiModelName:async()=> 'test-model',generateGeminiText:async text=>{prompt=text;return {text:'Provider-generated greeting',model:'test-model'};}},'@/lib/db':{prisma:{}},'./embeddings':{embedText:()=>assert.fail('Greeting should not embed')}})('src/lib/ai/rag.ts');
 const result=await askQuestion('hello',undefined,undefined,[{role:'user',content:'I want to learn'}]);
 assert.equal(result.answer,'Provider-generated greeting');assert.match(prompt,/I want to learn/);assert.notEqual(result.model,'friendly-greeting');
});
test('catalog answers use real public records, provider generation and governed media URLs',async()=>{
 let prompt;
 const {askQuestion}=loader({'@/lib/settings':{getSystemSetting:async()=>''},'./gemini-text':{getGeminiModelName:async()=> 'test-model',generateGeminiText:async text=>{prompt=text;return {text:'Generated catalog explanation',model:'test-model'};}},'@/lib/db':{prisma:{module:{findMany:async()=>[{id:1,code:'artifacts',baseName:'Artifacts'}]},culturalRecord:{findMany:async({where})=>{assert.equal(where.status,'published');assert.ok(where.AND.some(rule=>rule.restrictionLevel==='public'));assert.ok(where.AND.some(rule=>rule.consentScope==='public_excerpt'));return [{id:'record',title:'Reviewed object',module:{baseName:'Artifacts'},media:[{id:'asset',type:'image',url:'https://private.invalid/raw',thumbnailUrl:'https://private.invalid/thumb',format:'jpg'}]}];}}}},'./embeddings':{embedText:()=>assert.fail('Catalog should not embed')}})('src/lib/ai/rag.ts');
 const result=await askQuestion('show all artifacts');assert.equal(result.answer,'Generated catalog explanation');assert.match(prompt,/Reviewed object/);assert.equal(result.media[0].url,'/api/media/asset/file');assert.equal(JSON.stringify(result).includes('private.invalid'),false);
});
