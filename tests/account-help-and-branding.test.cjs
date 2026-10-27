const {test}=require('node:test');const assert=require('node:assert/strict');
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
const {loader}=require('./load-ts.cjs');
const {accountHelpGuides,accountHelpHref}=loader()('src/lib/account-help.ts');
const account=(roles=[],flags={})=>({id:'fixture',isSuperAdmin:false,isMasterSuperAdmin:false,profileTypes:[],languageRoles:roles.map(role=>({role,languageId:1,languageCode:'luo',languageName:'Dholuo'})),...flags});
const Link=({href,children,...props})=>React.createElement('a',{href,...props},children);

test('public help contains only the public manual, including for self-selected administrative interests',()=>{
  for(const user of[null,account(),account([], {profileTypes:['content_editor','super_admin','researcher']})])assert.deepEqual(accountHelpGuides(user).map(guide=>guide.id),['public']);
  assert.equal(accountHelpHref(null),'/help');
});
test('each assigned role gets its own guide and multi-role accounts see only their assigned guides',()=>{
  for(const role of['uploader','content_editor','publisher','language_admin','teacher','researcher','elder'])assert.deepEqual(accountHelpGuides(account([role])).map(guide=>guide.id),[role]);
  assert.deepEqual(accountHelpGuides(account(['uploader','content_editor','uploader'])).map(guide=>guide.id),['uploader','content_editor']);
  assert.deepEqual(accountHelpGuides(account(['cultural_expert'])).map(guide=>guide.id),['content_editor']);
  assert.deepEqual(accountHelpGuides(account(['unknown'])).map(guide=>guide.id),['public']);
});
test('master and super guides respect distinct backup and editorial duties',()=>{
  assert.deepEqual(accountHelpGuides(account([],{isMasterSuperAdmin:true})).map(guide=>guide.id),['master_super_admin']);
  const superGuide=accountHelpGuides(account(['content_editor'],{isSuperAdmin:true}));
  assert.deepEqual(superGuide.map(guide=>guide.id),['super_admin','content_editor']);
  assert.match(JSON.stringify(superGuide[0]),/Ask the Master Super Admin/);
  assert.equal(accountHelpHref(account([],{isMasterSuperAdmin:true})),'/super-admin/help');
  assert.equal(accountHelpHref(account(['publisher'])),'/admin/help');
  assert.equal(accountHelpHref(account(['researcher'])),'/help');
});
test('help rendering exposes the account guide and keeps native staff actions inside the workspace',()=>{
  const {AccountHelp}=loader()('src/components/shared/account-help.tsx');
  const publicHtml=renderToStaticMarkup(React.createElement(AccountHelp,{account:account(),Link}));
  assert.match(publicHtml,/data-help-guide="public"/);assert.doesNotMatch(publicHtml,/Master Super Admin guide|Publisher guide|Content editor guide/);
  const nativeHtml=renderToStaticMarkup(React.createElement(AccountHelp,{account:account(['content_editor']),Link,workspaceHref:'/workspace'}));
  assert.match(nativeHtml,/data-help-guide="content_editor"/);assert.match(nativeHtml,/href="\/workspace"/);assert.doesNotMatch(nativeHtml,/href="\/admin\//);
});
test('canonical application routes preserve expected destinations and reject invalid navigation',()=>{
  const {applicationScreenHref}=loader()('src/lib/app-navigation.ts');
  for(const href of['/help','/tutor','/places','/knowledge','/workspace','/research','/learn?section=game','/dashboard?module=proverbs','/my-submissions','/contribute/folktales'])assert.equal(applicationScreenHref(href),href);
  assert.equal(applicationScreenHref('/super-admin/help'),'/help');assert.equal(applicationScreenHref('/admin/help'),'/help');
  assert.equal(applicationScreenHref('/application'),'/dashboard');assert.equal(applicationScreenHref('/profile'),'/settings');
  for(const href of['/dashboard-wrong','/contributewrong','https://example.test/help','//example.test/help','javascript:alert(1)','/unknown','/dashboard/../super-admin/dashboard'])assert.equal(applicationScreenHref(href),null);
});
test('ordinary super admins are not shown master-only backup navigation',()=>{
  const {AdminSidebar}=loader({'./navigation-link':{NavigationLink:Link},'next/navigation':{usePathname:()=>'/super-admin/dashboard'}})('src/components/layout/admin-sidebar.tsx');
  const standard=renderToStaticMarkup(React.createElement(AdminSidebar,{isSuperAdmin:true,roles:[]}));
  assert.match(standard,/href="\/super-admin\/help"/);assert.doesNotMatch(standard,/href="\/super-admin\/backup"/);
  const master=renderToStaticMarkup(React.createElement(AdminSidebar,{isSuperAdmin:false,isMasterSuperAdmin:true,roles:[]}));assert.match(master,/href="\/super-admin\/backup"/);
});
test('NRF logo uploads are rejected before any upload or settings mutation',async()=>{
  const {POST}=loader({'@/lib/auth':{auth:async()=>({user:{id:'master',isMasterSuperAdmin:true}})},'@/lib/cloudinary':{uploadToCloudinary:()=>assert.fail('NRF upload must not run')},'@/lib/settings':{},'@/lib/audit':{}})('src/app/api/super-admin/branding/route.ts');
  const form=new FormData();form.set('partner','nrf');form.set('file',new File(['fixture'],'nrf.png',{type:'image/png'}));
  assert.equal((await POST(new Request('https://app.test/api/super-admin/branding',{method:'POST',body:form}))).status,400);
});
test('master-only flag can select the admin interface language without an extra super flag',async()=>{
  const {POST}=loader({'@/lib/auth':{auth:async()=>({user:{id:'master',isMasterSuperAdmin:true}})},'@/lib/db':{prisma:{language:{findUnique:async()=>({id:1})}}}})('src/app/api/admin/language/route.ts');
  const result=await POST(new Request('https://app.test/api/admin/language',{method:'POST',body:JSON.stringify({languageId:1}),headers:{'Content-Type':'application/json'}}));
  assert.equal(result.status,200);assert.match(result.headers.get('set-cookie'),/admin-language-id=1/);
});
