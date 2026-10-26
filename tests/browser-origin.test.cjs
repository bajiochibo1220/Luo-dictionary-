const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loader}=require('./load-ts.cjs');
const {sameOriginBrowserPost}=loader()('src/lib/native-api-headers.ts');
function request(headers={}){return new Request('http://localhost:3000/api/v1/account/settings',{method:'POST',headers:{'Content-Type':'application/json',Host:'127.0.0.1:3000',Origin:'http://127.0.0.1:3000',...headers},body:'{}'});}
test('browser writes use the addressed host when framework URLs use the configured auth host',()=>{
  assert.equal(sameOriginBrowserPost(request()),true);
  assert.equal(sameOriginBrowserPost(request({Origin:'http://localhost:3000'})),false);
  assert.equal(sameOriginBrowserPost(new Request('https://app.example/api',{method:'POST',headers:{Host:'app.example',Origin:'https://app.example','Content-Type':'application/json; charset=utf-8'}})),true);
});
test('browser origin guard rejects foreign origins, malformed hosts and form posts',()=>{
  for(const headers of [{Origin:'https://attacker.example'},{Origin:'null'},{Origin:''},{Origin:'http://127.0.0.1:3000/path'},{'Content-Type':'text/plain'},{Host:'attacker@127.0.0.1:3000'},{Host:'127.0.0.1:3000/path'},{Origin:'https://attacker.example','X-Forwarded-Host':'attacker.example'}]){
    assert.equal(sameOriginBrowserPost(request(headers)),false,JSON.stringify(headers));
  }
});
