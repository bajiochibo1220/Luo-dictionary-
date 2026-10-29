const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const fs = require('node:fs');
const vm = require('node:vm');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('./load-ts.cjs');
function setup({ cached, apple = false } = {}) {
  const savedWindow = global.window, savedNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
  const host = new EventTarget(), display = new EventTarget(); display.matches = false;
  host.matchMedia = () => display; host.isSecureContext = true; host.__luoInstallPrompt = cached;
  global.window = host;
  Object.defineProperty(global, 'navigator', {configurable:true,value:{userAgent:apple?'iPhone':'Chrome',platform:apple?'iPhone':'Linux',maxTouchPoints:apple?5:0}});
  const values = [], jobs = [], effects = []; let cursor = 0, context = null;
  const load = loader({react:{...React,useContext:()=>context,
    useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return [values[i],value=>{values[i]=typeof value==='function'?value(values[i]):value;}];},
    useRef(initial){const i=cursor++;return values[i]??={current:initial};},
    useEffect(fn){const i=cursor++;if(!effects[i])jobs.push(()=>{effects[i]={cleanup:fn()};});},
  }});
  const {AppInstallationProvider,InstallAppButton}=load('src/components/pwa/app-installation.tsx');
  const Owner=AppInstallationProvider({children:null}).type;
  const render=()=>{context=null;cursor=0;const node=Owner({children:null});jobs.splice(0).forEach(fn=>fn());context=node.props.value;return node.props.value;};
  return {host,display,render,button:()=>InstallAppButton(),restore(){for(const effect of effects)effect?.cleanup?.();global.window=savedWindow;if(savedNavigator)Object.defineProperty(global,'navigator',savedNavigator);else delete global.navigator;}};
}
function offer({outcome='dismissed',fail=false,onPrompt=()=>{}}={}) {
  const event=new Event('beforeinstallprompt',{cancelable:true});
  event.prompt=()=>{onPrompt();return fail?Promise.reject(new Error('Synthetic failure')):Promise.resolve();};
  event.userChoice=Promise.resolve({outcome});return event;
}
test('install offers are retained before hydration and cleared after installation',()=>{
  const host=new EventTarget();vm.runInNewContext(fs.readFileSync('public/install-prompt.js','utf8'),{window:host});
  const event=offer();host.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(host.__luoInstallPrompt,event);
  host.dispatchEvent(new Event('appinstalled'));assert.equal(host.__luoInstallPrompt,null);
});
test('cached install prompt runs in the click gesture once; cancellation gives useful instructions',async()=>{
  let calls=0;const h=setup({cached:offer({onPrompt:()=>calls++})});
  try{h.render();let state=h.render();assert.equal(state.available,true);const work=state.install();assert.equal(calls,1);await state.install();assert.equal(calls,1);await work;
    state=h.render();assert.equal(state.available,false);assert.equal(state.help,true);assert.match(state.notice,/cancelled/);await state.install();assert.equal(calls,1);
  }finally{h.restore();}
});
test('manual iPhone installation is visible and can be dismissed when no browser prompt exists',async()=>{
  const h=setup({apple:true});try{h.render();await h.render().install();let state=h.render();assert.equal(state.help,true);assert.equal(state.platform,'apple');assert.ok(h.button());state.closeHelp();assert.equal(h.render().help,false);}finally{h.restore();}
});
test('failed prompts recover, a new offer retries, and installation hides the control',async()=>{
  const h=setup();try{h.render();h.host.dispatchEvent(offer({fail:true}));await h.render().install();assert.match(h.render().notice,/could not open/);
    let calls=0;h.host.dispatchEvent(offer({outcome:'accepted',onPrompt:()=>calls++}));await h.render().install();assert.equal(calls,1);assert.match(h.render().notice,/requested/);
    h.host.dispatchEvent(new Event('appinstalled'));h.render();assert.equal(h.button(),null);
  }finally{h.restore();}
});
test('public and admin sidebars put Install first among their actions',()=>{
  const Link=({children,...props})=>React.createElement('a',props,children);
  const load=loader({'next/navigation':{usePathname:()=>'/admin/dashboard'},'./navigation-link':{NavigationLink:Link}});
  const {AppSidebarView}=load('src/components/shared/app-sidebar-view.tsx'),{AdminSidebar}=load('src/components/layout/admin-sidebar.tsx');
  for(const element of [React.createElement(AppSidebarView,{modules:[],pathname:'/dashboard',activeModule:null,Link}),React.createElement(AdminSidebar,{roles:[],isSuperAdmin:true})]){
    const html=renderToStaticMarkup(element);assert.ok(html.indexOf('data-app-install')<html.indexOf('<nav'));assert.match(html,/<button[^>]*>[\s\S]*?Install the app/);
  }
});
test('global chat shortcut covers public, authentication and administrative routes without duplicating shared chat',()=>{
  for(const route of ['/','/login','/register','/privacy','/admin/dashboard','/super-admin/system','/luo/wende']){
    const {FloatingChatbot}=loader({'next/navigation':{usePathname:()=>route}})('src/components/layout/floating-chatbot.tsx');
    assert.match(renderToStaticMarkup(React.createElement(FloatingChatbot)),/aria-label="Open CULTURAL HERITAGE"/);
  }
  const {FloatingChatbot}=loader({'next/navigation':{usePathname:()=>'/application'}})('src/components/layout/floating-chatbot.tsx');assert.equal(FloatingChatbot(),null);
});
