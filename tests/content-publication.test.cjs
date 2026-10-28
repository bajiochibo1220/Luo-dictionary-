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
