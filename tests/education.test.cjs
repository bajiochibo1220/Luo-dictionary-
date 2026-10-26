const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loader}=require('./load-ts.cjs');
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',resourceId='33333333-3333-4333-8333-333333333333',courseId='44444444-4444-4444-8444-444444444444',classId='55555555-5555-4555-8555-555555555555',assignmentId='66666666-6666-4666-8666-666666666666';
const account={id:owner,name:'Learner',email:'learner@example.invalid',image:null,profileTypes:['teacher'],isSuperAdmin:false,isMasterSuperAdmin:false,languageRoles:[]};
const coordinator={...account,languageRoles:[{languageId:1,languageCode:'luo',languageName:'Dholuo',role:'language_admin'}]};
const resource={id:resourceId,title:'Public lesson',kind:'lesson',version:4,languageId:1,status:'published',consentScope:'public_excerpt',restrictionLevel:'public'};
const course={id:courseId,title:'Public course',description:'Description',languageId:1,level:'beginner',sequential:true,status:'published',version:3,createdBy:other,units:[{id:'unit',resourceId,resourceVersion:4,position:0,minimumScore:70,resource}]};
const classroom={id:classId,title:'Private class',languageId:1,courseId:null,version:1,archivedAt:null,inviteCodeHash:'private-hash',inviteExpiresAt:new Date(Date.now()+60000),members:[{userId:other,role:'teacher'},{userId:owner,role:'learner'}]};
function load(prisma){return loader({'./db':{prisma},'./account-security':{assertAccountRateLimit:async()=>{}}})('src/lib/education-service.ts');}
const contract=loader()('src/lib/education-contract.ts');

test('course contracts reject duplicate lessons, invalid passing scores and unknown fields',()=>{
 const base={languageId:1,title:'Course',description:'',level:'beginner',sequential:true,units:[{resourceId,minimumScore:70}]};
 assert.equal(contract.CourseInput.safeParse(base).success,true);
 for(const invalid of [{...base,units:[]},{...base,units:[base.units[0],base.units[0]]},{...base,units:[{resourceId,minimumScore:101}]},{...base,createdBy:owner}])assert.equal(contract.CourseInput.safeParse(invalid).success,false);
});
test('assignment clients cannot forge grades, owners, timestamps or invalid teacher scores',()=>{
 const data={classroomId:classId,assignmentId,assignmentVersion:1,submissionVersion:0,answerText:'My writing'};
 assert.equal(contract.EducationAction.safeParse({action:'submit-assignment',data}).success,true);
 for(const fields of [{autoScore:100},{teacherScore:100},{userId:other},{submittedAt:new Date().toISOString()}])assert.equal(contract.EducationAction.safeParse({action:'submit-assignment',data:{...data,...fields}}).success,false);
 assert.equal(contract.EducationAction.safeParse({action:'grade',data:{classroomId:classId,submissionId:assignmentId,version:1,score:101,feedback:''}}).success,false);
});
test('sequential progress requires the preceding lesson and honors thresholds and availability',()=>{
 const units=[{available:true,score:60,minimumScore:70},{available:true,score:100,minimumScore:70}];
 assert.equal(contract.courseProgress(units,true).percent,0);
 assert.equal(contract.courseProgress(units,false).percent,50);
 assert.equal(contract.courseProgress([{...units[0],score:80},units[1]],true).percent,100);
 assert.equal(contract.courseProgress([{...units[0],available:false},units[1]],true).units[1].unlocked,false);
 assert.equal(contract.courseProgress([],true).percent,0);
});
test('spreadsheet exports quote cells and neutralize learner-controlled formulas',()=>{
 const csv=contract.gradebookCsv([['Learner','Grade'],['=HYPERLINK("bad")','100'],['\t+SUM(1,2)','50'],['Name, with "quotes"','Not submitted']]);
 assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
 assert.ok(csv.includes('"\'\t+SUM(1,2)"'));
 assert.ok(csv.includes('"Name, with ""quotes"""'));
 assert.equal(csv.split('\r\n').length,4);
});
test('course units reject withdrawn, cross-language, private, event and stale resource versions',()=>{
 const {availableCourseResource:ready}=load({});
 assert.equal(ready(resource,1,4),true);
 for(const changed of [{status:'withdrawn'},{languageId:2},{consentScope:'research_only'},{restrictionLevel:'internal'},{kind:'event'},{version:5}])assert.equal(ready({...resource,...changed},1,4),false);
});
test('ordinary teacher profile interests do not grant course authorship or private class access',async()=>{
 const service=load({learningClassroom:{findUnique:async()=>({...classroom,members:[{userId:other,role:'teacher'}]})}});
 await assert.rejects(service.educationAction(account,{action:'create-course',data:{languageId:1,title:'Course',description:'',level:'beginner',sequential:true,units:[{resourceId,minimumScore:70}]}}),error=>error.status===403);
 await assert.rejects(service.getClassroom(classId,account),error=>error.status===404);
});
test('course authors cannot approve their own course even with coordinator permissions',async()=>{
 const tx={learningCourse:{findUnique:async()=>({...course,status:'submitted',createdBy:owner})}};
 const service=load({$transaction:async cb=>cb(tx)});
 await assert.rejects(service.educationAction(coordinator,{action:'approve-course',data:{id:courseId,version:3}}),error=>error.status===403);
});
test('public course detail redacts withdrawn lesson titles and never inherits obsolete enrollment progress',async()=>{
 const hidden={...course,units:[{...course.units[0],resource:{...resource,title:'Unreviewed private title',status:'draft'}}]};
 const service=load({learningCourse:{findUnique:async()=>hidden},language:{findFirst:async()=>({id:1})},courseEnrollment:{findUnique:async()=>({courseVersion:2})},learningState:{findMany:async()=>[{resourceId,resourceVersion:4,bestScore:100,attempts:1}]}});
 const result=await service.getCourse(courseId,account);
 assert.equal(result.progress,0);assert.equal(result.needsEnrollmentUpdate,true);assert.equal(result.canEnroll,false);
 assert.equal(result.units[0].title,'Lesson unavailable');assert.equal(JSON.stringify(result).includes('Unreviewed'),false);assert.equal(Object.hasOwn(result,'createdBy'),false);
});
test('valid course completion derives exclusively from the signed-in account and pinned lesson edition',async()=>{
 const service=load({learningCourse:{findUnique:async()=>course},language:{findFirst:async()=>({id:1})},courseEnrollment:{findUnique:async()=>({courseVersion:3})},learningState:{findMany:async query=>{assert.equal(query.where.userId,owner);return [{resourceId,resourceVersion:3,bestScore:100,attempts:1}];}}});
 const result=await service.getCourse(courseId,account);assert.equal(result.progress,0);assert.equal(result.units[0].score,null);
});
test('stale course enrollment requests cannot silently accept a new curriculum',async()=>{
 let writes=0;
 const tx={$queryRaw:async()=>[{id:owner}],learningCourse:{findUnique:async()=>course},courseEnrollment:{upsert:async()=>writes++}};
 const service=load({$transaction:async cb=>cb(tx)});
 await assert.rejects(service.educationAction(account,{action:'enroll',data:{id:courseId,version:2}}),error=>error.status===409);assert.equal(writes,0);
});
test('concurrent enrollment conflicts retry the serializable transaction before committing one enrollment',async()=>{
 let attempts=0,writes=0;
 const tx={$queryRaw:async()=>[{id:owner}],language:{findFirst:async()=>({id:1})},learningCourse:{findUnique:async()=>course},courseEnrollment:{upsert:async()=>{writes++;return {id:'enrollment',courseVersion:3};}}};
 const service=load({$transaction:async cb=>{attempts++;if(attempts===1)throw Object.assign(new Error('retry'),{code:'P2034'});return cb(tx);}});
 assert.equal((await service.educationAction(account,{action:'enroll',data:{id:courseId,version:3}})).courseVersion,3);assert.equal(attempts,2);assert.equal(writes,1);
});
test('inactive accounts cannot join or mutate classes using a previously authorized request',async()=>{
 const service=load({$transaction:async cb=>cb({$queryRaw:async()=>[]})});
 await assert.rejects(service.educationAction(account,{action:'join-class',data:{code:'1234567890abcdef'}}),error=>error.status===401);
});
test('a learner with teacher interests cannot read the gradebook or grade a peer',async()=>{
 const tx={$queryRaw:async()=>[{id:owner}],language:{findFirst:async()=>({id:1})},learningClassroom:{findUnique:async()=>classroom,updateMany:()=>assert.fail('No unauthorized version write')}};
 const service=load({...tx,$transaction:async cb=>cb(tx)});
 await assert.rejects(service.getGradebook(classId,account),error=>error.status===403);
 await assert.rejects(service.educationAction(account,{action:'grade',data:{classroomId:classId,submissionId:assignmentId,version:1,score:99,feedback:'Forged'}}),error=>error.status===403);
});
test('learner class views exclude peers, emails, invitation secrets and aggregate submission counts',async()=>{
 const service=load({learningClassroom:{findUnique:async()=>classroom},classMembership:{findMany:async({where})=>{assert.equal(where.OR.length,2);return [{userId:owner,role:'learner',user:{name:'Me'}},{userId:other,role:'teacher',user:{name:'Teacher'}}];}},classAssignment:{findMany:async()=>[{id:assignmentId,title:'Writing',instructions:'Private class instructions',resourceId,resourceVersion:4,version:1,contentVersion:1,resource,dueAt:null,closedAt:null,_count:{submissions:17},submissions:[{version:1,assignmentVersion:1,autoScore:80,teacherScore:null}]}]}});
 const result=await service.getClassroom(classId,account);
 assert.equal(result.canTeach,false);assert.equal(result.assignments[0].submissionCount,1);assert.equal(result.inviteExpiresAt,null);assert.equal(JSON.stringify(result).includes('private-hash'),false);assert.equal(Object.hasOwn(result,'inviteCodeHash'),false);assert.equal(Object.hasOwn(result.members[0],'email'),false);
});
test('the last teacher cannot leave an active class',async()=>{
 const tx={$queryRaw:async()=>[{id:owner}],learningClassroom:{findUnique:async()=>({...classroom,members:[{userId:owner,role:'teacher'}]}),updateMany:async()=>({count:1})}};
 const service=load({$transaction:async cb=>cb(tx)});
 await assert.rejects(service.educationAction(account,{action:'leave-class',data:{classroomId:classId,version:1}}),error=>error.status===409);
});
test('a teacher cannot grade a submission from an older assignment edition',async()=>{
 const tx={$queryRaw:async()=>[{id:owner}],language:{findFirst:async()=>({id:1})},learningClassroom:{findUnique:async()=>({...classroom,members:[{userId:owner,role:'teacher'}]}),updateMany:async()=>({count:1})},assignmentSubmission:{findFirst:async()=>({assignmentVersion:1,assignment:{contentVersion:2}}),updateMany:()=>assert.fail('No stale grade write')}};
 const service=load({$transaction:async cb=>cb(tx)});
 await assert.rejects(service.educationAction(account,{action:'grade',data:{classroomId:classId,submissionId:assignmentId,version:1,score:90,feedback:'Stale'}}),error=>error.status===409);
});
test('gradebook excludes results that were assessed against superseded instructions',async()=>{
 const service=load({learningClassroom:{findUnique:async()=>({...classroom,members:[{userId:owner,role:'teacher'}]})},classMembership:{findMany:async()=>[{userId:other,user:{name:'Student'}}]},classAssignment:{findMany:async()=>[{id:assignmentId,title:'Updated assignment',contentVersion:2}]},assignmentSubmission:{findMany:async()=>[{userId:other,assignmentId,assignmentVersion:1,autoScore:100,teacherScore:95,isLate:false,gradedAt:new Date()}]}});
 const result=await service.getGradebook(classId,account);assert.equal(result.learners[0].grades[0].score,null);assert.equal(result.learners[0].grades[0].needsRevision,true);
});
test('account deletion checks active teaching responsibility after obtaining the user write lock',async()=>{
 const calls=[];
 const tx={verificationToken:{findUnique:async()=>({identifier:'account-delete:'+owner,expires:new Date(Date.now()+60000)}),deleteMany:async()=>({count:1})},user:{findUnique:async()=>({isMasterSuperAdmin:false}),updateMany:async()=>{calls.push('user-write');return {count:1};}},classMembership:{findFirst:async()=>{calls.push('class-check');return {id:'active-teaching'};}}};
 const {completeAccountEmail}=loader({'@/lib/db':{prisma:{$transaction:async cb=>cb(tx)}}})('src/lib/account-security.ts');
 await assert.rejects(completeAccountEmail('x'.repeat(43),'delete'),error=>error.status===409);assert.deepEqual(calls,['user-write','class-check']);
});
