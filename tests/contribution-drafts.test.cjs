const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');
function fixture() {
  const records = new Map();
  const service = loader({'./offline-learning': {
    offlinePut: async (key,value) => records.set(key,structuredClone(value)),
    offlineDelete: async key => records.delete(key),
    offlineList: async prefix => [...records].filter(([key])=>key.startsWith(prefix)).map(([key,value])=>({key,value})),
  }})('src/lib/contribution-drafts.ts');
  return {service,records};
}
test('device contribution drafts separate backend, account and language and retain attachment bytes',async()=>{
  const {service:s}=fixture();
  const scope=s.contributionDraftScope('https://one.example/app','owner');
  const draft={id:'test-1',moduleCode:'oral_histories',languageId:1,title:'Private draft',files:{document:new Blob(['private transcript'])},updatedAt:10};
  await s.saveDeviceDraft(scope,draft);
  assert.equal((await s.listDeviceDrafts(scope,1)).length,1);
  assert.equal(await (await s.listDeviceDrafts(scope,1))[0].files.document.text(),'private transcript');
  assert.equal((await s.listDeviceDrafts(scope,2)).length,0);
  assert.equal((await s.listDeviceDrafts(s.contributionDraftScope('https://one.example','other'),1)).length,0);
  assert.equal((await s.listDeviceDrafts(s.contributionDraftScope('https://two.example','owner'),1)).length,0);
  await s.removeDeviceDraft(scope,draft.id);
  assert.equal((await s.listDeviceDrafts(scope,1)).length,0);
});
test('device draft scopes normalize origins and prevent ID prefix traversal',async()=>{
  const {service:s}=fixture();
  assert.equal(s.contributionDraftScope('https://one.example/app','owner'),s.contributionDraftScope('https://one.example/other','owner'));
  assert.notEqual(s.contributionDraftScope('https://one.example','owner'),s.contributionDraftScope('https://one.example','owner:other'));
  assert.throws(()=>s.contributionDraftScope('https://one.example',''));
  await assert.rejects(s.saveDeviceDraft(s.contributionDraftScope('https://one.example','owner'),{id:'../other'}));
});
