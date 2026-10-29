const test=require('node:test'),assert=require('node:assert/strict'),React=require('react');
const {loader}=require('./load-ts.cjs');const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(mocks={}){const state=[],effects=[],jobs=[];let cursor=0;const load=loader({react:{...React,useId:()=> 'description-test',useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];},useRef(initial){const i=cursor++;return state[i]??={current:initial};},useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps.some((v,j)=>v!==effects[i].deps[j]))jobs.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};});}},...mocks});return{load,render(fn){cursor=0;const tree=fn();jobs.splice(0).forEach(fn=>fn());return tree;}};}
function find(node,predicate){if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,predicate);if(found)return found;}}
const fakeForm=class {get(key){return {email:' EXAMPLE@example.invalid ',password:'Temporary-password',name:'Temporary learner',languageId:'1',acceptedTerms:'on'}[key];}getAll(){return[];}};
test('login rejects same-tick duplicate sends and releases its lock after rejected credentials',async()=>{
 const old=global.FormData;global.FormData=fakeForm;let calls=0,finish;const h=harness({'next/navigation':{useRouter:()=>({}),useSearchParams:()=>new URLSearchParams()},'next-auth/react':{signIn:async(_provider,options)=>{assert.equal(options.email,'example@example.invalid');calls++;return new Promise(resolve=>{finish=resolve;});}},sonner:{toast:{error(){}}}});
 try{const {LoginForm}=h.load('src/components/forms/login-form.tsx');const render=()=>h.render(()=>LoginForm());const submit=find(render(),n=>n.type==='form').props.onSubmit;
 const first=submit({preventDefault(){},currentTarget:{}});await submit({preventDefault(){},currentTarget:{}});assert.equal(calls,1);finish({ok:false,error:'CredentialsSignin'});await first;
 const second=find(render(),n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:{}});assert.equal(calls,2);finish({ok:false,error:'CredentialsSignin'});await second;
 }finally{global.FormData=old;}
});
test('registration blocks duplicate sends and recovers from a malformed server response',async()=>{
 const old={FormData:global.FormData,fetch:global.fetch};global.FormData=fakeForm;let posts=0,finish;
 global.fetch=async(_url,init)=>{if(!init?.method)return Response.json({data:[{id:1,code:'luo',isActive:true}]});assert.ok(init.signal);posts++;return new Promise(resolve=>{finish=resolve;});};
 const h=harness({'next/navigation':{useRouter:()=>({}),useSearchParams:()=>new URLSearchParams()},sonner:{toast:{error(){}}}});
 try{const {RegisterForm}=h.load('src/components/forms/register-form.tsx');const render=()=>h.render(()=>RegisterForm());let tree=render();await tick();tree=render();find(tree,n=>n.type?.name==='DateOfBirthPicker').props.onChange({day:1,month:1,year:2000});tree=render();
 const submit=find(tree,n=>n.type==='form').props.onSubmit;const first=submit({preventDefault(){},currentTarget:{}});await submit({preventDefault(){},currentTarget:{}});assert.equal(posts,1);finish(Response.json(null));await first;
 const second=find(render(),n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:{}});assert.equal(posts,2);finish(Response.json({success:false,error:'Retry safely'},{status:503}));await second;
 }finally{Object.assign(global,old);}
});
test('image previews fall back to protected original delivery and show a visible final error',()=>{
 const h=harness();const {MediaImage}=h.load('src/components/shared/media-preview.tsx');const render=()=>h.render(()=>MediaImage({src:'/api/media/image/file',alt:'Public image'}));let tree=render();
 find(tree,n=>n.type==='img').props.onError({});tree=render();const image=find(tree,n=>n.type==='img');assert.equal(image.props.src,'/api/media/image/file?original=1');assert.equal(image.props.srcSet,undefined);
 image.props.onError({});tree=render();assert.ok(find(tree,n=>n.props.role==='alert'));find(tree,n=>n.type==='img').props.onLoad({});assert.equal(find(render(),n=>n.props.role==='alert'),undefined);
});
test('discovery opens a visual collection while preserving text and within-collection order',()=>{
 const {mixDiscoveryItems}=loader()('src/components/shared/discovery-feed.tsx');const rows=[{id:'t1',moduleCode:'history',media:[]},{id:'t2',moduleCode:'history',media:[]},{id:'s1',moduleCode:'songs',media:[{type:'image'}]},{id:'s2',moduleCode:'songs',media:[]}];
 assert.deepEqual(mixDiscoveryItems(rows).map(row=>row.id),['s1','t1','s2','t2']);assert.equal(rows[0].id,'t1');
});

test('feed description expands inline and returns to its compact state without opening an item',()=>{
 const h=harness();const {FeedDescription}=h.load('src/components/shared/social-feed.tsx');
 const render=()=>h.render(()=>FeedDescription({text:'Traditional use and meaning. Full details remain in Explore.'}));
 let tree=render();let button=find(tree,n=>n.type==='button');
 assert.equal(tree.props['data-expanded'],false);assert.equal(button.props['aria-expanded'],false);
 assert.equal(button.props['aria-controls'],find(tree,n=>n.type==='p').props.id);
 assert.equal(button.props.children.props.source,'more');button.props.onClick();
 tree=render();button=find(tree,n=>n.type==='button');assert.equal(tree.props['data-expanded'],true);
 assert.equal(button.props.children.props.source,'less');button.props.onClick();
 assert.equal(render().props['data-expanded'],false);
});

test('full public descriptions retain usage, meaning and place without internal fields',()=>{
 const {publicCulturalText}=loader()('src/lib/public-cultural-text.ts');
 const text=publicCulturalText({meaning:'Public meaning',traditional_use:'Public usage',county:'Public county',origin:'Public origin',contributorId:'PRIVATE',storageKey:'PRIVATE',consent_document:'PRIVATE'});
 for(const value of ['Public meaning','Public usage','Public county','Public origin'])assert.ok(text.includes(value));
 assert.equal(text.includes('PRIVATE'),false);
});
