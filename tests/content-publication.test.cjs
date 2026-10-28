const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');

function fixture() {
  const source = { id: 'upload', title: 'Uploaded story', languageId: 1, moduleId: 2,
    status: 'submitted', data: { story: 'Original text', sourcePermission: 'confirmed' },
    tags: [], summary: null, contributorId: 'uploader', consentScope: 'public_excerpt',
    restrictionLevel: 'public', embargoUntil: null, publicationOfId: null,
    module: { code: 'folktales' },
    translations: [{ languageId: 3, title: 'Original English', data: { story: 'English' }, summary: null }],
    media: [{ id: 'source-media', recordId: 'upload', languageId: 1, type: 'audio', publicId: 'storage/audio', assetId: 'unique-asset', nrfUri: 'unique-uri', caption: 'Original caption', consentScope: 'public_excerpt', restrictionLevel: 'public' }],
    transcripts: [{ id: 'source-transcript', recordId: 'upload', languageId: 1, text: 'Original transcript', sourceId: 'unique-source', timestamps: null, consentScope: 'public_excerpt', restrictionLevel: 'public' }],
  };
  const state = { publication: null, translations: [], media: [], transcripts: [], history: [], audits: [], removedEmbeddings: false };
  const children = name => ({
    deleteMany: async () => { state[name] = []; },
    createMany: async ({ data }) => { state[name].push(...structuredClone(data)); },
    create: async ({ data }) => { state[name].push(structuredClone(data)); },
  });
  const tx = {
    $queryRaw: async () => [],
    culturalRecord: {
      findUnique: async ({ where }) => where.id === source.id ? source : state.publication,
      findUniqueOrThrow: async () => source,
      upsert: async ({ create, update }) => { state.publication = structuredClone(state.publication ? { ...state.publication, ...update } : create); return state.publication; },
      update: async ({ where, data }) => Object.assign(where.id === source.id ? source : state.publication, data),
    },
    culturalRecordTranslation: children('translations'), mediaAsset: children('media'), transcript: children('transcripts'),
    reviewHistory: { create: async ({ data }) => state.history.push(data) },
    auditLog: { create: async ({ data }) => state.audits.push(data) },
    embedding: { deleteMany: async () => { state.removedEmbeddings = true; } },
  };
  return { source, state, tx };
}

test('early publication freezes the package and final publication replaces it at the same public ID', async () => {
  const { source, state, tx } = fixture();
  const { writePublication, finishPublication } = loader()('src/lib/content-publication.ts');
  const early = await writePublication(tx, source.id, 'reviewer', true);
  assert.equal(source.status, 'submitted');
  assert.equal(early.status, 'published');
  assert.equal(early.isProvisional, true);
  assert.equal(state.media[0].publicId, 'storage/audio');
  assert.equal(state.media[0].assetId, undefined);
  source.title = 'Edited story'; source.data.story = 'Reviewed text';
  source.translations[0].title = 'Reviewed English';
  source.media[0].caption = 'Reviewed caption';
  source.transcripts[0].text = 'Reviewed transcript';
  assert.equal(state.publication.title, 'Uploaded story');
  assert.equal(state.publication.data.story, 'Original text');
  assert.equal(state.translations[0].title, 'Original English');
  assert.equal(state.media[0].caption, 'Original caption');
  assert.equal(state.transcripts[0].text, 'Original transcript');
  const publicId = await finishPublication(tx, source.id, 'publisher', true);
  assert.equal(publicId, early.id);
  assert.equal(state.publication.title, 'Edited story');
  assert.equal(state.publication.data.story, 'Reviewed text');
  assert.equal(state.publication.isProvisional, false);
  assert.equal(source.status, 'published_source');
  assert.equal(state.translations.length, 1);
  assert.equal(state.translations[0].title, 'Reviewed English');
  assert.equal(state.media[0].caption, 'Reviewed caption');
  assert.equal(state.transcripts[0].text, 'Reviewed transcript');
});

test('internal final approval withdraws the early public package and its AI index', async () => {
  const { source, state, tx } = fixture();
  const { writePublication, finishPublication } = loader()('src/lib/content-publication.ts');
  await writePublication(tx, source.id, 'reviewer', true);
  await finishPublication(tx, source.id, 'publisher', false);
  assert.equal(state.publication.status, 'curated');
  assert.equal(state.publication.publishedAt, null);
  assert.equal(state.removedEmbeddings, true);
});

test('normal final publication keeps its existing ID when there was no early publication', async () => {
  const { source, tx } = fixture();
  const { finishPublication } = loader()('src/lib/content-publication.ts');
  assert.equal(await finishPublication(tx, source.id, 'publisher', true), source.id);
});

test('early publication excludes restricted attachments and transcripts', async () => {
  const { source, state, tx } = fixture();
  source.media.push({ ...source.media[0], id: 'private-file', restrictionLevel: 'sacred' });
  source.transcripts.push({ ...source.transcripts[0], id: 'private-text', consentScope: 'research_only' });
  const { writePublication } = loader()('src/lib/content-publication.ts');
  await writePublication(tx, source.id, 'reviewer', true);
  assert.equal(state.media.length, 1);
  assert.equal(state.transcripts.length, 1);
});

function earlyRoute(context, session) {
  return loader({ '@/lib/auth': { auth: async () => session },
    '@/lib/db': { prisma: { $transaction: async callback => callback(context.tx) } },
  })('src/app/api/content/[id]/publish-before-review/route.ts').POST;
}
const actor = (role, languageId = 1) => ({ user: { id: 'reviewer', languageRoles: [{ role, languageId }] } });

test('reviewers, publishers and language admins can release a snapshot without completing review', async () => {
  for (const role of ['content_editor', 'publisher', 'language_admin']) {
    const context = fixture(); context.source.status = 'draft';
    const response = await earlyRoute(context, actor(role))(new Request('http://localhost'), { params: Promise.resolve({ id: 'upload' }) });
    assert.equal(response.status, 200, role);
    assert.equal(context.source.status, 'submitted');
    assert.equal(context.source.validatorId, null);
    assert.equal(context.state.audits[0].action, 'content.published_before_review');
  }
});

test('early release rejects unauthorized actors, self-publication, private data and rejected items', async () => {
  const cases = [
    [null, {}, 401], [actor('uploader'), {}, 403], [actor('content_editor', 9), {}, 403],
    [{ user: { ...actor('content_editor').user, id: 'uploader' } }, {}, 403],
    [actor('publisher'), { consentScope: 'pending' }, 400],
    [actor('publisher'), { restrictionLevel: 'sacred' }, 403],
    [actor('publisher'), { embargoUntil: new Date('2099-01-01') }, 400],
    [actor('publisher'), { data: { sourcePermission: 'needs_review' } }, 400],
    [actor('publisher'), { status: 'rejected' }, 409],
    [actor('publisher'), { status: 'rejection_review' }, 409],
  ];
  for (const [session, changes, expected] of cases) {
    const context = fixture(); Object.assign(context.source, changes);
    const response = await earlyRoute(context, session)(new Request('http://localhost'), { params: Promise.resolve({ id: 'upload' }) });
    assert.equal(response.status, expected, JSON.stringify(changes));
    assert.equal(context.state.publication, null);
  }
});

test('a repeated early-release click cannot expose edits made after initial release', async () => {
  const context = fixture();
  const post = earlyRoute(context, actor('content_editor'));
  const params = { params: Promise.resolve({ id: 'upload' }) };
  assert.equal((await post(new Request('http://localhost'), params)).status, 200);
  context.source.title = 'Unfinished changes';
  assert.equal((await post(new Request('http://localhost'), params)).status, 409);
  assert.equal(context.state.publication.title, 'Uploaded story');
});

function batchEarlyRoute(contexts, session = actor('publisher')) {
  let active, transactions = 0, rolledBack = false;
  const tx = new Proxy({}, { get: (_target, key) => key === '$queryRaw' ? async (_sql, id) => { active = contexts.find(c => c.source.id === id); return []; } : active?.tx[key] });
  const post = loader({ '@/lib/auth': { auth: async () => session }, '@/lib/db': { prisma: { $transaction: async callback => {
    transactions++;
    const snapshots = contexts.map(c => ({ source: structuredClone(c.source), state: structuredClone(c.state) }));
    try { return await callback(tx); } catch (error) { rolledBack = true; contexts.forEach((c, i) => { Object.assign(c.source, snapshots[i].source); Object.assign(c.state, snapshots[i].state); }); throw error; }
  } } } })('src/app/api/content/bulk-publish-before-review/route.ts').POST;
  return { post: (ids, confirmPublicSharing, overrideAccessRestrictions) => post(new Request('http://localhost/api/content/bulk-publish-before-review', { method: 'POST', body: JSON.stringify({ recordIds: ids, confirmPublicSharing, overrideAccessRestrictions }) })), stats: () => ({ transactions, rolledBack }) };
}
test('a single early-publication batch releases multiple uploads across stages and content areas', async () => {
  const a = fixture(), b = fixture(); a.source.id = 'a'; a.source.status = 'draft'; b.source.id = 'b'; b.source.status = 'needs_edit'; b.source.moduleId = 3;
  const batch = batchEarlyRoute([a, b]); const response = await batch.post(['b', 'a']);
  assert.equal(response.status, 200); assert.equal((await response.json()).count, 2);
  assert.equal(batch.stats().transactions, 1); assert.equal(a.source.status, 'submitted'); assert.equal(b.source.status, 'needs_edit');
  assert.equal(a.state.publication.isProvisional, true); assert.equal(b.state.publication.isProvisional, true);
  assert.equal(a.state.audits.length, 1); assert.equal(b.state.audits.length, 1);
});
test('an invalid second upload aborts the batch transaction without leaving the first published', async () => {
  const a = fixture(), b = fixture(); a.source.id = 'a'; b.source.id = 'b'; b.source.consentScope = 'pending';
  const batch = batchEarlyRoute([a, b]); assert.equal((await batch.post(['a', 'b'])).status, 400);
  assert.equal(batch.stats().rolledBack, true); assert.equal(a.state.publication, null); assert.equal(a.state.audits.length, 0);
});
test('bulk early publication rejects duplicate, empty, oversized and unauthenticated selections before starting a transaction', async () => {
  const batch = batchEarlyRoute([]);
  for (const ids of [[], ['a', 'a'], [''], Array.from({length:101}, (_,i) => String(i))]) assert.equal((await batch.post(ids)).status, 400);
  assert.equal(batch.stats().transactions, 0);
  const guest = batchEarlyRoute([], null); assert.equal((await guest.post(['a'])).status, 401); assert.equal(guest.stats().transactions, 0);
});

test('early release names the blocked upload and only the settings that need correction', async () => {
  const context = fixture(); context.source.title = 'Community story'; context.source.consentScope = 'pending';
  const response = await earlyRoute(context, actor('publisher'))(new Request('http://localhost'), { params: Promise.resolve({id:'upload'}) });
  assert.equal(response.status,400); const body=await response.json();
  assert.match(body.error,/Community story/); assert.match(body.error,/Consent scope/); assert.doesNotMatch(body.error,/Restriction level|set Source permission/);
  assert.equal(context.state.publication,null);
});
test('public release readiness lists pending permission, private access and an active embargo separately',()=>{
  const {publicReleaseIssues}=loader()('src/lib/public-release-readiness.ts'); const context=fixture();
  assert.deepEqual(publicReleaseIssues(context.source),[]);
  Object.assign(context.source,{title:' ',consentScope:'pending',restrictionLevel:'internal',embargoUntil:new Date('2099-01-01'),data:{}});
  const issues=publicReleaseIssues(context.source); assert.equal(issues.length,5);
  assert.match(issues.join(' '),/Add a title|Consent scope|Restriction level|2099-01-01|Source permission/);
});

function pendingPermissionFixture() {
  const c=fixture(); c.source.status='under_review'; c.source.consentScope='pending'; c.source.restrictionLevel='internal'; c.source.data.sourcePermission='needs_review';
  c.source.media[0].consentScope='pending'; c.source.media[0].restrictionLevel='internal';
  c.approvals=[];
  c.tx.mediaAsset.updateMany=async()=>{for(const m of c.source.media) if(['pending','public_excerpt'].includes(m.consentScope) && ['internal','public'].includes(m.restrictionLevel) && (!m.embargoUntil||m.embargoUntil<=new Date())) Object.assign(m,{consentScope:'public_excerpt',restrictionLevel:'public'});};
  c.tx.mediaAsset.findMany=async()=>c.source.media.filter(m=>m.consentScope==='public_excerpt'&&m.restrictionLevel==='public').map(m=>({id:m.id}));
  c.tx.consentRecord={create:async({data})=>{c.approvals.push(data);return {id:'consent'};}};
  c.tx.consentRecordAsset={createMany:async()=>{}};
  return c;
}
test('explicit public-sharing approval releases pending uploads of every content type while their review continues',async()=>{
 for(const code of ['oral_histories','proverbs','riddles','songs','artifacts','folktales','research','dictionary']) {
  const c=pendingPermissionFixture();c.source.module.code=code;
  const res=await earlyRoute(c,actor('publisher'))(new Request('http://localhost',{method:'POST',body:JSON.stringify({confirmPublicSharing:true})}),{params:Promise.resolve({id:'upload'})});
  assert.equal(res.status,200,code);assert.equal(c.source.status,'under_review');assert.equal(c.state.publication.isProvisional,true);
  assert.equal(c.source.consentScope,'public_excerpt');assert.equal(c.source.restrictionLevel,'public');assert.equal(c.source.data.sourcePermission,'confirmed');
  assert.equal(c.state.media.length,1);assert.equal(c.approvals[0].reviewedById,'reviewer');assert.equal(c.state.audits[0].action,'content.public_sharing_confirmed');
 }
});
test('public-sharing approval preserves explicit restrictions, denial and active embargoes',async()=>{
 for(const changes of [{consentScope:'research_only'},{consentScope:'community_only'},{restrictionLevel:'sacred'},{restrictionLevel:'restricted'},{embargoUntil:new Date('2099-01-01')},{data:{sourcePermission:'not_granted'}}]) {
  const c=pendingPermissionFixture();Object.assign(c.source,changes);
  const res=await earlyRoute(c,actor('publisher'))(new Request('http://localhost',{method:'POST',body:JSON.stringify({confirmPublicSharing:true})}),{params:Promise.resolve({id:'upload'})});
  assert.ok([400,403].includes(res.status));assert.equal(c.state.publication,null);assert.equal(c.approvals.length,0);
 }
});
test('explicit approval keeps restricted attachments private',async()=>{
 const c=pendingPermissionFixture();c.source.media.push({...c.source.media[0],id:'sacred',restrictionLevel:'sacred'});
 const res=await earlyRoute(c,actor('publisher'))(new Request('http://localhost',{method:'POST',body:JSON.stringify({confirmPublicSharing:true})}),{params:Promise.resolve({id:'upload'})});
 assert.equal(res.status,200);assert.equal(c.source.media[1].restrictionLevel,'sacred');assert.equal(c.state.media.length,1);
});
test('bulk explicit approval covers all selected uploads in a single transaction',async()=>{
 const a=pendingPermissionFixture(),b=pendingPermissionFixture();a.source.id='a';b.source.id='b';b.source.module.code='proverbs';
 const batch=batchEarlyRoute([a,b]);const res=await batch.post(['b','a'],true);
 assert.equal(res.status,200);assert.equal((await res.json()).count,2);assert.equal(batch.stats().transactions,1);
 assert.equal(a.state.publication.isProvisional,true);assert.equal(b.state.publication.isProvisional,true);
});
test('a string approval does not count as explicit consent',async()=>{
 const c=pendingPermissionFixture();const res=await earlyRoute(c,actor('publisher'))(new Request('http://localhost',{method:'POST',body:JSON.stringify({confirmPublicSharing:'true'})}),{params:Promise.resolve({id:'upload'})});
 assert.equal(res.status,400);assert.equal(c.approvals.length,0);assert.equal(c.source.consentScope,'pending');
});

function overrideFixture() {
 const c=pendingPermissionFixture();
 c.tx.mediaAsset.findMany=async()=>structuredClone(c.source.media);
 c.tx.transcript.findMany=async()=>structuredClone(c.source.transcripts);
 c.tx.mediaAsset.updateMany=async({data})=>c.source.media.forEach(item=>Object.assign(item,data));
 c.tx.transcript.updateMany=async({data})=>c.source.transcripts.forEach(item=>Object.assign(item,data));
 return c;
}
function overrideRequest(value=true) {return new Request('http://localhost',{method:'POST',body:JSON.stringify({overrideAccessRestrictions:value})});}

test('direct staff publishing overrides all access blockers without claiming source permission',async()=>{
 for(const changes of [{consentScope:'research_only'},{consentScope:'community_only'},{restrictionLevel:'sacred'},{restrictionLevel:'restricted'},{embargoUntil:new Date('2099-01-01')},{data:{sourcePermission:'not_granted'}}]) {
  const c=overrideFixture();Object.assign(c.source,changes);const permission=c.source.data.sourcePermission;
  c.source.media[0].restrictionLevel='sacred';c.source.media[0].embargoUntil=new Date('2099-01-01');
  c.source.transcripts[0].consentScope='research_only';
  const res=await earlyRoute(c,actor('publisher'))(overrideRequest(),{params:Promise.resolve({id:'upload'})});
  assert.equal(res.status,200,JSON.stringify(changes));assert.equal(c.source.status,'under_review');
  assert.equal(c.source.embargoUntil,null);assert.equal(c.source.data.sourcePermission,permission);
  assert.equal(c.state.publication.restrictionLevel,'public');assert.equal(c.state.publication.isProvisional,true);
  assert.equal(c.state.media.length,1);assert.equal(c.state.media[0].embargoUntil,null);assert.equal(c.state.transcripts.length,1);
  assert.equal(c.approvals.length,0,'No fabricated rights-holder consent');
  assert.equal(c.state.audits[0].action,'content.public_access_overridden');assert.equal(c.state.audits[0].oldValue.assets[0].restrictionLevel,'sacred');
 }
});

test('direct publishing supports own staff uploads but still enforces roles and language scope',async()=>{
 for(const [session,status] of [[null,401],[actor('uploader'),403],[actor('publisher',9),403],[{user:{...actor('language_admin').user,id:'uploader'}},200],[{user:{id:'uploader',isMasterSuperAdmin:true,languageRoles:[]}},200]]) {
  const c=overrideFixture();const res=await earlyRoute(c,session)(overrideRequest(),{params:Promise.resolve({id:'upload'})});
  assert.equal(res.status,status);assert.equal(!!c.state.publication,status===200);
 }
 const c=overrideFixture();assert.equal((await earlyRoute(c,actor('publisher'))(overrideRequest('true'),{params:Promise.resolve({id:'upload'})})).status,400);
});

test('bulk direct publishing releases restricted uploads and rolls back on an invalid stage',async()=>{
 const a=overrideFixture(),b=overrideFixture();a.source.id='a';b.source.id='b';b.source.data.sourcePermission='not_granted';b.source.embargoUntil=new Date('2099-01-01');
 const batch=batchEarlyRoute([a,b]);assert.equal((await batch.post(['b','a'],false,true)).status,200);
 assert.equal(a.state.publication.isProvisional,true);assert.equal(b.state.publication.embargoUntil,null);
 const x=overrideFixture(),y=overrideFixture();x.source.id='x';y.source.id='y';y.source.status='rejected';
 const invalid=batchEarlyRoute([x,y]);assert.equal((await invalid.post(['x','y'],false,true)).status,409);
 assert.equal(invalid.stats().rolledBack,true);assert.equal(x.state.publication,null);assert.equal(x.source.restrictionLevel,'internal');
});

test('single and bulk publishing dialogs submit directly without a consent checkbox',async()=>{
 const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
 for(const props of [{recordId:'upload'},{recordIds:['a','b']}]) {
  let stateIndex=0,refreshed=false,closed=false,request;
  const {EarlyPublishButton}=loader({react:{...React,useState:initial=>[stateIndex++===0?true:initial,()=>{}],useEffect:()=>{},useRef:()=>({current:{close:()=>{closed=true;}}})},
   'next/navigation':{useRouter:()=>({refresh:()=>{refreshed=true;}})},sonner:{toast:{success:()=>{}}},
   '@/components/shared/interface-language':{InterfaceText:({source})=>source},
  })('src/components/admin/early-publish-button.tsx');
  const tree=EarlyPublishButton(props);const html=renderToStaticMarkup(tree);
  assert.doesNotMatch(html,/checkbox|rights holder/);assert.match(html,/Publish now/);assert.doesNotMatch(html.match(/<button[^>]*type="submit"[^>]*>/)[0],/\sdisabled(?:=|\s|>)/);
  const previous=global.fetch;global.fetch=async(url,init)=>{request={url,body:JSON.parse(init.body)};return Response.json({success:true,count:props.recordIds?.length??1});};
  try{await tree.props.children[1].props.children.props.onSubmit({preventDefault(){}});}finally{global.fetch=previous;}
  assert.equal(request.body.overrideAccessRestrictions,true);assert.equal(request.body.confirmPublicSharing,undefined);
  assert.equal(request.url,props.recordIds?'/api/content/bulk-publish-before-review':'/api/content/upload/publish-before-review');
  assert.equal(closed,true);assert.equal(refreshed,true);
 }
});

test('a recorded staff release survives edits and supports reviewed replacement without inventing permission',async()=>{
 const c=overrideFixture();c.source.data.sourcePermission='not_granted';
 assert.equal((await earlyRoute(c,actor('publisher'))(overrideRequest(),{params:Promise.resolve({id:'upload'})})).status,200);
 const {hasPublicReleasePermission}=loader()('src/lib/public-release-readiness.ts');
 assert.equal(hasPublicReleasePermission(c.source),true);
 const publicId=c.state.publication.id;c.source.title='Edited and reviewed';c.source.data.story='Reviewed text';
 assert.equal(hasPublicReleasePermission(c.source),true);
 const {finishPublication}=loader()('src/lib/content-publication.ts');
 assert.equal(await finishPublication(c.tx,'upload','publisher',hasPublicReleasePermission(c.source)),publicId);
 assert.equal(c.state.publication.title,'Edited and reviewed');assert.equal(c.state.publication.isProvisional,false);
 assert.equal(c.source.data.sourcePermission,'not_granted');
 c.source.data.sourcePermission='needs_review';assert.equal(hasPublicReleasePermission(c.source),false,'Changed permission evidence requires a new decision');
 assert.equal(hasPublicReleasePermission({data:{sourcePermission:'needs_review'}}),false);
 assert.equal(hasPublicReleasePermission({data:{sourcePermission:'confirmed'}}),true);
});
