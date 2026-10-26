const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,"../..");const folder=path.join(root,'docs/system-audit');
const register=JSON.parse(fs.readFileSync(path.join(folder,'SYSTEM_REQUIREMENTS.json'),'utf8'));
register.reviewDate='2026-10-26';
const testLog=fs.readFileSync(path.join(folder,'current-tests.log'),'utf8');const testCount=Number(testLog.match(/\btests\s+(\d+)\s*\n/)?.[1]||0);const passedCount=Number(testLog.match(/\bpass\s+(\d+)\s*\n/)?.[1]||0);
const applicable=register.requirements.filter(row=>row.status!=='deferred'),credit=applicable.reduce((sum,row)=>sum+row.coverage,0),percent=Math.round(credit/applicable.length*1000)/10;
const accepted=applicable.filter(row=>row.accepted).length;
const areas=[...new Set(applicable.map(row=>row.area))].map(area=>{const list=applicable.filter(row=>row.area===area);return `| ${area} | ${list.length} | ${list.filter(row=>row.coverage===1).length} | ${list.filter(row=>row.coverage===.5).length} | ${list.filter(row=>row.coverage===0).length} | ${Math.round(list.reduce((sum,row)=>sum+row.coverage,0)/list.length*100)}% |`;}).join('\n');
const results=['tests','web','android','androidusb','browserproduction','ai'].map(check=>{const p=path.join(folder,'current-'+check+'-result.json');if(!fs.existsSync(p))return `| ${check} | Running / not yet recorded |`;const result=JSON.parse(fs.readFileSync(p,'utf8'));const state=result.exitCode===0?'Passed':check==='ai'?'Blocked: provider usage limit':check==='android'?'Blocked: distribution requires an HTTPS API origin':'Failed / needs follow-up';return `| ${check} | ${state}; see [log](docs/system-audit/current-${check}.log) |`;}).join('\n');
const report=`# Luo Heritage: full-system implementation assessment

Reviewed against the supplied Phase One and Phase Two source files on 25–26 October 2026. The current software scope combines both phases. Older phase-labelled reports are historical; they do not certify the present implementation.

## Current percentage

**Estimated software implementation: ${percent}% covered; ${Math.round((100-percent)*10)/10}% remaining.** This is calculated from [the requirement register](docs/system-audit/SYSTEM_REQUIREMENTS.json), rather than a repeated informal estimate.

There are **${register.requirements.length} tracked rows**: **${applicable.length} applicable software/acceptance requirements**, and **${register.requirements.length-applicable.length} explicitly deferred requirements**. Of the applicable rows, ${applicable.filter(row=>row.coverage===1).length} are implemented, ${applicable.filter(row=>row.coverage===.5).length} are partial and ${applicable.filter(row=>row.coverage===0).length} have no complete implementation. Each row has equal weight: implemented earns 1, partial earns 0.5, missing earns 0. Deferrals earn no credit and are excluded from the denominator. Related deliverable/acceptance obligations are retained as separate rows; this is an estimate, not a measured fraction of development hours.

**Formal user/institutional acceptance recorded: ${accepted}/${applicable.length}.** This means no formal sign-off has been entered in this new register. It does not mean no features work. Code inspection, fixture tests, real-provider probes, browser checks and human acceptance are different kinds of evidence.

Recalculate with: <code>node docs/system-audit/report-system-progress.cjs</code>.

## Implemented and repaired in this review

- Google and email/password remain the supported sign-in methods. Apple, Microsoft and phone-code providers/buttons have been removed; the retired phone endpoint cannot issue codes.
- Password-recovery and verification flows use hashed, expiring, single-use tokens; successful reset revokes existing sessions. Delivery failures remove unusable tokens. Admin-saved email settings now work consistently with environment overrides.
- Shared collection screens have accessible icon filters on small screens, one horizontal control row and sticky heading/control groups. Administrative, history, learning and system screens received matching heading repairs. Collection contribution forms now include missing PRD fields and the required riddle explanation.
- Shared staff management includes content queues, users, staff creation/revocation, languages, analytics, AI activity, audit history, system settings and Master-only backups, subject to actual server permissions.
- Calendar navigation opens the events screen. Lesson authors can add reading, writing, speaking and listening instructions; editing preserves activities, source links, event times and distribution permissions.
- Reviewers can open attached media through the authenticated media endpoint on web/native transports. Raw storage links no longer bypass that path in the shared editor.
- A shared governed research library browses reviewed records/transcripts and provides authorized export actions. Assigned language roles are required; account interests do not grant access. Transcript and parent access are checked, and reads are audited.
- The Master administrator can grant teaching/research duties to existing accounts from the shared users screen. Grants and removals are audited. A teaching/research duty does not enable promotion of a public account to administrator; ordinary staff accounts still use the separate protected provisioning path.
- Public language metadata no longer returns staff identities. Backup creation requires Master authority. Settings expose only approved editable keys, mask complete secrets and reject attempts to overwrite unrelated internal keys.
- Public pages/AI text exclude private collection fields and exact coordinates. AI retrieval uses the current approved record after vector ranking, deduplicates sources and never sends legacy indexed text directly to the provider. Research exports redact protected participant/location/consent evidence for ordinary researchers and neutralize spreadsheet formulas.
- Chat answers are generated by the configured provider, retain conversation context and cite actual eligible sources. Current-model fallback handles primary-model overload. No cultural records or translations were invented to populate empty collections.

## Verification recorded

The latest full fixture suite passed **${passedCount}/${testCount}** tests. TypeScript passed after the shared research workspace was added. The final current-source web and Android checks are recorded below. Check logs/results for the exact final outcome. Build warnings are not the same as functional acceptance.

| Check | Current result |
|---|---|
${results}

The ordinary Android distribution build correctly failed because the configured API origin is localhost. The explicit USB development build is tracked separately. A locally compiled shared bundle is not proof of an iPhone build, a signed store release or physical-device acceptance. Browser fixture checks must not be described as real account/provider acceptance.

## Content and integration readiness

The current read-only inventory found 80 cultural records, but only **one publicly eligible cultural record**, **zero dictionary entries**, **zero published learning resources**, **zero courses/classes**, 51 images and 2,708 protected transcript segments. The transcript count is not the count of public lessons, audio recordings or verified translations. Private/pending research content was preserved. See [inventory](docs/system-audit/current-data-inventory.json).

The configured database and Google/AI settings exist. Real AI generation succeeded, but the latest provider probe reached a usage limit; AI service continuity needs available quota. Actual email delivery is not configured, so inbox receipt and the complete live forgotten-password journey remain unverified. The software is not ready to advertise every public collection as populated. Source owners/reviewers must supply or approve genuine cultural material before those collections can be meaningfully used; this has not been hidden inside the software percentage.

## Deferred as requested

Physical JOOUST server migration/provisioning, on-premises-only backup/restore/network-isolation acceptance, store accounts/signing/submission, Mac/iPhone availability and custom-model work requiring unavailable labelled/approved data are excluded. Ordinary missing software is not deferred merely because it is difficult. Account configuration and software implementation are tracked separately.

## Software still requiring implementation or completion

The full register preserves every assessed obligation. Major gaps include the dedicated language tutor, distinct game mechanics/multiplayer, virtual-tour/3D viewers, OCR/speech workflows, push registration/delivery, elevated-role MFA, full community/group-consent relationships, immutable release/model/dataset lineage and withdrawal propagation, and formal performance/load/security acceptance. Some existing areas are partial rather than absent. Supplying store or server credentials would not finish these features.

## Coverage by area

| Area | Applicable | Implemented | Partial | Missing | Estimated coverage |
|---|---:|---:|---:|---:|---:|
${areas}

## Sources and interpretation

${register.sources.map(source=>'- [Source text](docs/system-audit/'+encodeURIComponent(source)+'): '+source).join('\n')}

The PRD's module bullets and cross-cutting software requirements form the main register; NRF technical/data-model acceptance criteria are added explicitly. The funding/progress reports provide delivery context rather than overriding stricter acceptance criteria. Initial content inventory and institutional success/adoption measures are readiness/acceptance work, not automatically completed by code. The original annexes contain additional detailed modelling and operational instructions; completing these broad acceptance rows still requires proving those details. No university signature or source-owner approval has been fabricated.
`;
fs.writeFileSync(path.join(root,'SYSTEM_IMPLEMENTATION_STATUS.md'),report);
const checklist=path.join(root,'PHASE_STATUS_AND_COMPLETION_CHECKLIST.md');const history=path.join(folder,'historical-status-checklist-2026-10-25.md');if(!fs.existsSync(history))fs.copyFileSync(checklist,history);
fs.writeFileSync(checklist,`# Luo Heritage: current implementation status\n\nThe current combined assessment is [SYSTEM_IMPLEMENTATION_STATUS.md](SYSTEM_IMPLEMENTATION_STATUS.md).\n\nEstimated software coverage: **${percent}% covered / ${Math.round((100-percent)*10)/10}% remaining**, excluding the explicit user-approved deferrals. Formal acceptance recorded: **${accepted}/${applicable.length}**. These figures are calculated from the source-linked register; tests/builds alone do not mean the full system is accepted.\n\nThe assessment includes implementation changes, verification evidence, content readiness, integration requirements and the complete per-area table.\n\nThe previous checklist is preserved as [historical status](docs/system-audit/historical-status-checklist-2026-10-25.md).\n`);
console.log(JSON.stringify({coverage:percent,remaining:Math.round((100-percent)*10)/10,applicable:applicable.length,accepted},null,2));
