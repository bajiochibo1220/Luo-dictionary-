const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { NextRequest } = require('next/server');
const { loader } = require('./load-ts.cjs');
const row = (id, text, sourceId, role = 'interviewer') => ({ id, text, sourceId, speakerRole: role, languageCode: 'luo', createdAt: new Date('2026-01-01') });
const reading = { id: 'record', title: 'Complete interview', sourceLanguageCode: 'luo', sourceLanguageName: 'Dholuo', sourceText: '', englishText: '', transcripts: Array.from({ length: 216 }, (_, i) => ({ id: String(i), text: `Conversation turn ${i + 1}`, languageCode: 'luo', role: i % 2 ? 'Respondent' : 'Interviewer' })) };

test('conversation order uses natural segment numbers, not random UUIDs or lexical sorting', () => {
  const { orderedTranscriptSegments } = loader()('src/lib/reading-contract.ts');
  const segments = [row('a', 'Tenth turn', 'session_seg_10'), row('z', 'Second turn', 'session_seg_2'), row('m', 'First turn', 'session_seg_1')];
  const result = orderedTranscriptSegments(segments);
  assert.deepEqual(result.map(item => item.text), ['First turn', 'Second turn', 'Tenth turn']);
  assert.deepEqual(segments.map(item => item.id), ['a', 'z', 'm']);
  assert.equal(JSON.stringify(result).includes('session_seg'), false);
});

test('legacy snapshots restore dialogue order using matching text without exposing unpublished additions', () => {
  const { orderedTranscriptSegments } = loader()('src/lib/reading-contract.ts');
  const originals = [row('s1', 'Question', 'seg_1'), row('s2', 'Answer', 'seg_2', 'interviewee'), row('s3', 'UNPUBLISHED ADDITION', 'seg_3')];
  const snapshot = [row('public-a', 'Answer', null, 'interviewee'), row('public-z', 'Question', null)];
  const result = orderedTranscriptSegments(snapshot, originals);
  assert.deepEqual(result.map(item => item.text), ['Question', 'Answer']);
  assert.deepEqual(result.map(item => item.role), ['Interviewer', 'Respondent']);
  assert.doesNotMatch(JSON.stringify(result), /UNPUBLISHED|seg_1|s1/);
});

test('repeated questions are preserved and speaker identities are not inferred from role strings', () => {
  const { orderedTranscriptSegments } = loader()('src/lib/reading-contract.ts');
  const segments = [row('p3', 'Again?', null), row('p1', 'Again?', null), row('p2', 'Answer', null, 'Private Person Name')];
  const source = [row('s1', 'Again?', 'seg_1'), row('s2', 'Answer', 'seg_2', 'Private Person Name'), row('s3', 'Again?', 'seg_3')];
  const result = orderedTranscriptSegments(segments, source);
  assert.deepEqual(result.map(item => item.text), ['Again?', 'Answer', 'Again?']);
  assert.equal(result[1].role, null);
  assert.doesNotMatch(JSON.stringify(result), /Private Person Name/);
});

test('public reading checks parent publication and segment permissions and projects only reading fields', async () => {
  let query;
  const record = { id: 'record', title: 'Approved conversation', language: { code: 'luo', nativeName: 'Dholuo' }, data: { transcript: 'Embedded approved text', sourcePermission: 'PRIVATE' }, translations: [{ data: { transcript: 'English conversation', collector: 'PRIVATE' } }], transcripts: [row('part', 'Approved part', 'PRIVATE_SOURCE_ID')], publicationOf: { transcripts: [row('unpublished', 'UNPUBLISHED', 'seg_2')] }, contributorId: 'PRIVATE' };
  const { getPublicReading } = loader({ '@/lib/db': { prisma: { culturalRecord: { findFirst: async input => { query = input; return record; } } } } })('src/lib/public-reading.ts');
  const result = await getPublicReading('record');
  assert.equal(query.where.status, 'published'); assert.equal(query.where.language.isActive, true); assert.equal(query.where.module.isStub, false);
  for (const where of [query.where, query.select.transcripts.where]) { assert.match(JSON.stringify(where), /public_excerpt/); assert.match(JSON.stringify(where), /restrictionLevel/); }
  assert.equal(query.select.transcripts.take, undefined, 'The reader must not truncate linked conversations');
  assert.equal(result.transcripts[0].text, 'Approved part'); assert.match(result.englishText, /English conversation/);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|UNPUBLISHED|publicationOf|collector|contributor/);
});

test('public reading returns no data for a withdrawn or unavailable parent', async () => {
  const { getPublicReading } = loader({ '@/lib/db': { prisma: { culturalRecord: { findFirst: async () => null } } } })('src/lib/public-reading.ts');
  assert.equal(await getPublicReading('withdrawn'), null);
});

test('all 216 conversation turns are readable before using any download link', () => {
  const { PublicTranscriptReader } = loader()('src/components/shared/public-transcript-reader.tsx');
  const html = renderToStaticMarkup(React.createElement(PublicTranscriptReader, { recordId: 'record', languageCode: 'luo', initial: reading }));
  assert.match(html, /Conversation turn 1</); assert.match(html, /Conversation turn 216</);
  assert.ok(html.indexOf('Conversation turn 216') < html.indexOf('Download full transcript text'));
  assert.match(html, /Respondent/); assert.match(html, /Interviewer/);
});

test('a collection preview can keep the conversation closed without truncating the full reader', () => {
  const { PublicTranscriptReader } = loader()('src/components/shared/public-transcript-reader.tsx');
  const html = renderToStaticMarkup(React.createElement(PublicTranscriptReader, { recordId: 'record', languageCode: 'luo', initial: reading, defaultOpen: false }));
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Read full transcript/);
  assert.doesNotMatch(html, /Conversation turn 1|Download full transcript text/);
});

test('English view displays an uploaded translation and never relabels the original conversation as English', () => {
  const { PublicTranscriptReader } = loader()('src/components/shared/public-transcript-reader.tsx');
  const render = initial => renderToStaticMarkup(React.createElement(PublicTranscriptReader, { recordId: 'record', languageCode: 'eng', initial }));
  const missing = render(reading);
  assert.match(missing, /An English transcript has not been uploaded/);
  assert.match(missing, /Read the original conversation/); assert.doesNotMatch(missing, /Conversation turn 216/);
  const translated = render({ ...reading, englishText: 'Uploaded full English translation', transcripts: [...reading.transcripts, { id: 'en', languageCode: 'eng', text: 'English respondent answer', role: 'Respondent' }] });
  assert.match(translated, /Uploaded full English translation/); assert.match(translated, /English respondent answer/);
  assert.doesNotMatch(translated, /has not been uploaded|Conversation turn 216/);
});

test('reading API permits anonymous public reading, validates input, and supports credential-free native origins', async () => {
  const load = loader({ '@/lib/public-reading': { getPublicReading: async id => id === 'record' ? reading : null }, '@/lib/auth': { auth: () => assert.fail('Public reading must not require an account') } });
  const { GET, OPTIONS } = load('src/app/api/v1/reading/route.ts');
  const request = id => new NextRequest(`https://heritage.test/api/v1/reading?id=${encodeURIComponent(id)}`, { headers: { Origin: 'capacitor://localhost' } });
  const response = await GET(request('record'));
  assert.equal(response.status, 200); assert.equal((await response.json()).data.transcripts.length, 216);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost');
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.equal((await GET(request('../private'))).status, 400); assert.equal((await GET(request('missing'))).status, 404);
  assert.equal(OPTIONS(request('record')).status, 204);
  const { middleware } = load('src/middleware.ts');
  assert.equal((await middleware(request('record'))).headers.get('x-middleware-next'), '1');
});

test('individual public transcript access does not reapply a private-parent reviewer gate', async () => {
  const fields = { consentScope: 'public_excerpt', restrictionLevel: 'public', embargoUntil: null };
  const transcript = { id: 'part', languageId: 1, recordId: 'record', text: 'Public answer', languageCode: 'luo', speaker: 'PRIVATE', ...fields, record: { id: 'record', languageId: 1, status: 'published', contributorId: 'owner', ...fields } };
  const { GET } = loader({ '@/lib/auth': { auth: async () => null }, '@/lib/db': { prisma: { transcript: { findUnique: async () => transcript } } } })('src/app/api/transcripts/[id]/route.ts');
  const response = await GET(new NextRequest('https://heritage.test/api/transcripts/part'), { params: Promise.resolve({ id: 'part' }) });
  assert.equal(response.status, 200); assert.doesNotMatch(JSON.stringify(await response.json()), /PRIVATE|contributorId/);
  transcript.record.status = 'draft';
  assert.equal((await GET(new NextRequest('https://heritage.test/api/transcripts/part'), { params: Promise.resolve({ id: 'part' }) })).status, 401);
});
