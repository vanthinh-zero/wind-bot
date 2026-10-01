const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const DetectiveGame=require('../src/games/detective');
const CaseValidator=require('../src/games/detective/CaseValidator');
const CaseGenerator=require('../src/games/detective/CaseGenerator');
const CaseTemplates=require('../src/games/detective/CaseTemplates');
const ScoringEngine=require('../src/games/detective/ScoringEngine');
const JsonStore=require('../src/games/detective/JsonStore');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wind-detective-'));
const game=new DetectiveGame({dataDir:dir,timeZone:'Asia/Ho_Chi_Minh'});
const a=game.getDailyCase('guild-test',new Date('2026-09-24T00:00:00Z'));
const b=game.getDailyCase('guild-test',new Date('2026-09-24T16:59:00Z'));
const c=game.getDailyCase('guild-test',new Date('2026-09-24T17:01:00Z'));
assert.equal(a.id,b.id);
assert.notEqual(a.id,c.id);
assert.equal(new CaseValidator().validate(a).valid,true);
const user='user-test';
game.startInvestigation(user,a);
for(const t of a.investigationTargets.slice(0,4))game.investigate(user,a,t.id);
game.interrogate(user,a,a.suspects[0].id,'time');
for(const id of ['T2','T3','T4'])game.addTimelineEvent(user,a,id);
const result=game.submit(user,a,{culprit:a.solution.culpritName,motive:a.solution.motive,timeline:['T2','T3','T4'],reasoning:'camera time key'});
assert.ok(result.result.total>0);
assert.equal(result.profile.casesSolved,1);
assert.equal(result.profile.streak,1);

const generator=new CaseGenerator();
const fingerprints=[];
for(let index=0;index<100;index++){
	const seed='procedural-seed-'+index;
	const generated=generator.generate(seed,'2026-09-24');
	const repeated=generator.generate(seed,'2026-09-24');
	assert.deepEqual(generated,repeated,'same seed must reproduce the same case');
	const validation=new CaseValidator().validate(generated);
	assert.equal(validation.valid,true,seed+': '+validation.errors.join('; '));
	fingerprints.push(generated.caseModel.fingerprint);
}
assert.ok(new Set(fingerprints.map(item=>item.archetype)).size>=6,'procedural seeds should cover multiple archetypes');
assert.ok(new Set(fingerprints.map(item=>item.evidencePattern)).size>=6,'procedural seeds should vary evidence structures');
assert.ok(new Set(fingerprints.map(item=>item.timelinePattern)).size>=3,'procedural seeds should vary timeline patterns');
const recentCase=generator.generate('recent-case-1');
const nextCase=generator.generate('recent-case-2','2026-09-25',[recentCase.caseModel.fingerprint]);
const fingerprintKeys=['archetype','motiveType','culpritRole','locationType','evidencePattern','timelinePattern','contradictionPattern','relationshipPattern'];
const sharedDimensions=fingerprintKeys.filter(key=>recentCase.caseModel.fingerprint[key]===nextCase.caseModel.fingerprint[key]).length;
assert.ok(sharedDimensions<=4,'recent cases must differ across at least four fingerprint dimensions');

const malformed=generator.generate('malformed-case');
malformed.caseModel.events[0].prerequisites.push('missing-event');
assert.equal(new CaseValidator().validate(malformed).valid,false,'validator should reject impossible event references');

const contradictionCase=generator.generate('contradiction-provenance');
const contradictionRecord=contradictionCase.caseModel.contradictions[0];
const contradictionStatement=contradictionCase.caseModel.statementDetails.find(item=>item.suspectId===contradictionRecord.suspectId&&item.question===contradictionRecord.statementQuestion);
const contradictionEvidence=contradictionCase.evidence.find(item=>item.id===contradictionRecord.evidenceId);
assert.equal(new CaseValidator().validate(contradictionCase).valid,true,'a fully sourced factual inconsistency is valid');
const compatibleCase=structuredClone(contradictionCase);
const compatibleContradiction=compatibleCase.caseModel.contradictions[0];
compatibleCase.caseModel.statementDetails.find(item=>item.suspectId===compatibleContradiction.suspectId&&item.question===compatibleContradiction.statementQuestion).claimFact.value=compatibleCase.evidence.find(item=>item.id===compatibleContradiction.evidenceId).fact.value;
assert.equal(new CaseValidator().validate(compatibleCase).valid,false,'compatible claims are not contradictions');
const compatibleSessionGame=new DetectiveGame({dataDir:path.join(dir,'compatible-contradiction')});
compatibleSessionGame.joinSession('compatible-guild',compatibleCase,'investigator');
compatibleSessionGame.interrogateSession('compatible-guild','investigator',compatibleCase,compatibleContradiction.suspectId,compatibleContradiction.statementQuestion);
compatibleSessionGame.investigateSession('compatible-guild','investigator',compatibleCase,compatibleCase.investigationTargets.find(item=>item.evidenceId===compatibleContradiction.evidenceId).id);
assert.equal(compatibleSessionGame.getSession('compatible-guild',compatibleCase.id).discoveredContradictions.includes(compatibleContradiction.id),false,'compatible claims are not discovered as contradictions');
const unprovenCase=structuredClone(contradictionCase);
const unproven=unprovenCase.caseModel.contradictions[0];
delete unprovenCase.caseModel.statementDetails.find(item=>item.suspectId===unproven.suspectId&&item.question===unproven.statementQuestion).claimFact;
assert.equal(new CaseValidator().validate(unprovenCase).valid,false,'contradictions without provenance are invalid');
const missingEvidenceCase=structuredClone(contradictionCase);
missingEvidenceCase.caseModel.contradictions[0].evidenceId='E_MISSING';
assert.equal(new CaseValidator().validate(missingEvidenceCase).valid,false,'nonexistent evidence references are rejected');
const missingEventCase=structuredClone(contradictionCase);
missingEventCase.caseModel.contradictions[0].eventId='T_MISSING';
assert.equal(new CaseValidator().validate(missingEventCase).valid,false,'nonexistent event references are rejected');
const misleadingInnocent=contradictionCase.caseModel.statementDetails.find(item=>item.truthType==='lie'&&item.suspectId!==contradictionCase.solution.culpritId);
assert.ok(misleadingInnocent,'the generator includes an innocent lie');
assert.equal(contradictionCase.caseModel.contradictions.some(item=>item.suspectId===misleadingInnocent.suspectId),false,'an innocent lie alone does not identify a culprit contradiction');

const innocentContradictionCase=structuredClone(contradictionCase);
innocentContradictionCase.caseModel.version=2;
const innocent=innocentContradictionCase.suspects.find(item=>item.id!==innocentContradictionCase.solution.culpritId);
const falseLead=innocentContradictionCase.evidence.find(item=>item.id===innocentContradictionCase.caseModel.truth.falseLeadId);
const innocentEvent=innocentContradictionCase.caseModel.events.find(item=>item.id===falseLead.eventId);
if(!innocentEvent.actors.includes(innocent.id))innocentEvent.actors.push(innocent.id);
if(!innocent.actualActions.includes(innocentEvent.id))innocent.actualActions.push(innocentEvent.id);
innocent.knowledge.push({eventId:innocentEvent.id,kind:'direct',confidence:0.8});
falseLead.fact={predicate:'prop_contact',value:'yes',suspectId:innocent.id,eventId:innocentEvent.id,source:'inventory_record'};
const innocentStatement=innocentContradictionCase.caseModel.statementDetails.find(item=>item.suspectId===innocent.id&&item.question==='object');
innocentStatement.text=innocent.name+' phủ nhận từng chạm vào món đồ này.';
innocentStatement.truthType='lie';
innocentStatement.relatedEvents.push(innocentEvent.id);
innocentStatement.relatedEvidence.push(falseLead.id);
innocentStatement.claimFact={predicate:'prop_contact',value:'no',suspectId:innocent.id,eventId:innocentEvent.id};
innocentContradictionCase.statements[innocent.id].object=innocentStatement.text;
innocentContradictionCase.caseModel.contradictions.push({id:'C_INNOCENT',suspectId:innocent.id,statementQuestion:'object',evidenceId:falseLead.id,eventId:innocentEvent.id,type:'unrelated_property_denial'});
assert.equal(new CaseValidator().validate(innocentContradictionCase).valid,true,'a sourced contradiction may concern an innocent suspect');
const innocentSessionGame=new DetectiveGame({dataDir:path.join(dir,'innocent-contradiction')});
innocentSessionGame.joinSession('innocent-guild',innocentContradictionCase,'investigator');
innocentSessionGame.interrogateSession('innocent-guild','investigator',innocentContradictionCase,innocent.id,'object');
innocentSessionGame.investigateSession('innocent-guild','investigator',innocentContradictionCase,innocentContradictionCase.investigationTargets.find(item=>item.evidenceId===falseLead.id).id);
assert.ok(innocentSessionGame.getSession('innocent-guild',innocentContradictionCase.id).discoveredContradictions.includes('C_INNOCENT'),'an unrelated innocent contradiction is discoverable by evidence');

const teamDir=path.join(dir,'team-state');
const teamGame=new DetectiveGame({dataDir:teamDir,timeZone:'Asia/Ho_Chi_Minh'});
const teamDate=new Date('2026-09-24T12:00:00Z');
assert.equal(teamGame.joinDailySession('empty-guild','player-b',teamDate),null,'join must not create a missing case/session');
assert.equal(teamGame.store.values('cases').length,0,'join must not generate a case');
const teamCase=teamGame.getDailyCase('co-op-guild',teamDate);
const playerA=teamGame.joinSession('co-op-guild',teamCase,'player-a');
const contradiction=teamCase.caseModel.contradictions[0];
const contradictionTarget=teamCase.investigationTargets.find(item=>item.evidenceId===contradiction.evidenceId);
teamGame.interrogateSession('co-op-guild','player-a',teamCase,contradiction.suspectId,contradiction.statementQuestion);
teamGame.investigateSession('co-op-guild','player-a',teamCase,contradictionTarget.id);
const playerBJoin=teamGame.joinDailySession('co-op-guild','player-b',teamDate);
assert.equal(playerBJoin.caseData.id,teamCase.id,'joining preserves the existing case');
assert.equal(playerBJoin.session.sessionId,playerA.sessionId,'players share one session');
assert.equal(playerBJoin.session.caseId,playerA.caseId,'players share the case reference');
assert.equal(playerBJoin.session.discoveredEvidence.includes(contradiction.evidenceId),true,'player B sees player A evidence');
assert.equal(playerBJoin.session.discoveredContradictions.includes(contradiction.id),true,'contradictions are shared');
const sharedEvidenceBeforeLocalAction=[...playerBJoin.session.discoveredEvidence];
const localTarget=teamCase.investigationTargets.find(item=>!playerBJoin.session.inspectedTargets.includes(item.id));
teamGame.investigate('player-b',teamCase,localTarget.id);
assert.deepEqual(teamGame.getSession('co-op-guild',teamCase.id).discoveredEvidence,sharedEvidenceBeforeLocalAction,'player-local investigation state cannot overwrite shared discovery');
const memberCount=playerBJoin.session.players.length;
teamGame.joinDailySession('co-op-guild','player-b',teamDate);
assert.equal(teamGame.getSession('co-op-guild',teamCase.id).players.length,memberCount,'rejoining does not duplicate investigators');
const playerHypothesis=teamGame.addHypothesis('co-op-guild','player-b',teamCase,'S2 có thể đang bảo vệ một bí mật riêng.');
teamGame.addHypothesis('co-op-guild','player-a',teamCase,'Đối chiếu giờ gọi với thời điểm camera gián đoạn.');
assert.equal(teamGame.getSession('co-op-guild',teamCase.id).hypotheses.length,2,'hypotheses from both investigators are retained');
assert.equal(Object.hasOwn(playerHypothesis.hypothesis,'correct'),false,'text hypotheses do not become correct automatically');
for(const target of teamCase.investigationTargets)teamGame.investigateSession('co-op-guild','player-b',teamCase,target.id);
const restartedGame=new DetectiveGame({dataDir:teamDir,timeZone:'Asia/Ho_Chi_Minh'});
const restartedCase=restartedGame.getDailyCase('co-op-guild',teamDate);
const rejoined=restartedGame.joinDailySession('co-op-guild','player-a',teamDate);
assert.equal(rejoined.session.discoveredEvidence.length,playerBJoin.session.discoveredEvidence.length,'discoveries survive a game/store restart');
assert.equal(rejoined.session.hypotheses.length,2,'hypotheses survive a game/store restart');
assert.equal(rejoined.session.players.length,memberCount,'rejoining after restart does not duplicate membership');
const teamResult=restartedGame.submitSession('co-op-guild','player-a',restartedCase,{culprit:restartedCase.solution.culpritName,motive:restartedCase.solution.motive,timeline:restartedCase.solution.validTimeline,reconstruction:'',reasoning:''});
assert.ok(teamResult.result.contradictionScore>0,'team scoring must receive discovered contradictions');

const scoringCase=generator.generate('scoring-matrix');
const scoring=new ScoringEngine();
const completeInvestigation={completed:false,evidenceFound:scoringCase.solution.requiredEvidence,suspectsInterrogated:['S1'],discoveredContradictions:scoringCase.caseModel.contradictions.map(item=>item.id)};
const culpritOnly=scoring.score(scoringCase,{completed:false,evidenceFound:[],suspectsInterrogated:[],discoveredContradictions:[]},{culprit:scoringCase.solution.culpritName,motive:'',timeline:[],reasoning:'',reconstruction:''});
const weak=scoring.score(scoringCase,completeInvestigation,{culprit:scoringCase.solution.culpritName,motive:scoringCase.solution.motive,timeline:[],reasoning:'',reconstruction:''});
const evidenceTimeline=scoring.score(scoringCase,completeInvestigation,{culprit:scoringCase.solution.culpritName,motive:scoringCase.solution.motive,timeline:scoringCase.solution.validTimeline,reasoning:'',reconstruction:''});
const completeReconstruction=scoring.score(scoringCase,completeInvestigation,{culprit:scoringCase.solution.culpritName,motive:scoringCase.solution.motive,timeline:scoringCase.solution.validTimeline,reasoning:scoringCase.solution.keywords.join(' '),reconstruction:scoringCase.solution.reconstruction.sequence.join(' ')+' '+scoringCase.solution.reconstruction.mechanism+' '+scoringCase.solution.falseLeadId+' '+scoringCase.solution.requiredEvidence[0]});
const wrong=scoring.score(scoringCase,completeInvestigation,{culprit:scoringCase.suspects.find(item=>item.id!==scoringCase.solution.culpritId).name,motive:'',timeline:scoringCase.solution.validTimeline,reasoning:scoringCase.solution.keywords.join(' '),reconstruction:scoringCase.solution.reconstruction.sequence.join(' ')+' '+scoringCase.solution.reconstruction.mechanism+' '+scoringCase.solution.falseLeadId+' '+scoringCase.solution.requiredEvidence[0]});
const noMechanismText=scoring.score(scoringCase,completeInvestigation,{culprit:scoringCase.solution.culpritName,motive:scoringCase.solution.motive,timeline:[],reasoning:'',reconstruction:'hiện trường'});
const mechanismOnly=scoring.score(scoringCase,completeInvestigation,{culprit:scoringCase.solution.culpritName,motive:scoringCase.solution.motive,timeline:[],reasoning:'',reconstruction:scoringCase.solution.reconstruction.mechanism});
assert.equal(weak.culprit,true);
assert.equal(culpritOnly.culpritScore,0,'naming the culprit without investigation is not a solved report');
assert.equal(culpritOnly.total,0,'a culprit-only answer receives no full-investigation credit');
assert.ok(evidenceTimeline.total>weak.total,'timeline evidence improves a culprit-only report');
assert.ok(completeReconstruction.total>evidenceTimeline.total,'contradiction and reconstruction improve the complete report');
assert.equal(wrong.culpritScore,0,'wrong culprit earns no culprit points');
assert.ok(wrong.total>0&&wrong.total<completeReconstruction.total,'a wrong accusation can earn partial investigation credit');
assert.equal(noMechanismText.reconstructionScore,0,'a generic word must not earn mechanism reconstruction points');
assert.equal(mechanismOnly.reconstructionScore,100,'the actual mechanism phrase earns mechanism reconstruction points');

let conflictingWitnessCase=null;
for(let index=0;index<200&&!conflictingWitnessCase;index++){
	const candidate=generator.generate('witness-archetype-'+index);
	if(candidate.caseModel.archetype.id==='conflicting_witnesses')conflictingWitnessCase=candidate;
}
assert.ok(conflictingWitnessCase,'the existing conflicting_witnesses archetype is generated');
const cameraEvent=conflictingWitnessCase.caseModel.events.find(item=>item.key==='camera_gap');
const arrivalEvent=conflictingWitnessCase.caseModel.events.find(item=>item.key==='arrival_sighted');
const cameraClaims=conflictingWitnessCase.caseModel.statementDetails.filter(item=>item.claimFact?.predicate==='camera_status');
assert.ok(arrivalEvent.actorRoles.includes('witness_a'),'witness A directly observes the arrival');
assert.ok(cameraEvent.actorRoles.includes('witness_b'),'witness B directly observes the camera interval');
assert.equal(cameraEvent.actorRoles.includes('witness_a'),false,'witness A does not know the later camera interval');
assert.deepEqual(cameraClaims.map(item=>item.claimFact.value),['up'],'only the witness who observed the camera interval makes that claim');
assert.ok(conflictingWitnessCase.caseModel.contradictions.some(item=>item.suspectId!==conflictingWitnessCase.solution.culpritId&&item.evidenceId==='E1'),'the camera buffer independently challenges the mistaken witness');
const witnessContradiction=conflictingWitnessCase.caseModel.contradictions.find(item=>item.suspectId!==conflictingWitnessCase.solution.culpritId);
const witnessGame=new DetectiveGame({dataDir:path.join(dir,'witness-session')});
witnessGame.joinSession('witness-guild',conflictingWitnessCase,'analyst');
const witnessResponse=witnessGame.interrogateSession('witness-guild','analyst',conflictingWitnessCase,witnessContradiction.suspectId,'time');
witnessGame.investigateSession('witness-guild','analyst',conflictingWitnessCase,conflictingWitnessCase.investigationTargets.find(item=>item.evidenceId==='E1').id);
assert.ok(witnessGame.getSession('witness-guild',conflictingWitnessCase.id).discoveredContradictions.includes(witnessContradiction.id),'the player discovers the witness contradiction from statement plus evidence');
assert.equal(Object.hasOwn(witnessResponse,'truthType'),false,'hidden truth labels are not returned by interrogation');

const causalStructures=new Map();
const causalTopologies=new Set();
const archetypeStructures=new Map(CaseTemplates.map(template=>[template.id,new Set()]));
const variantsByArchetype=new Map(CaseTemplates.map(template=>[template.id,new Set()]));
const archetypeCases=new Map();
const mechanisms=new Set();
const contradictionPatterns=new Set();
const redHerringPatterns=new Set();
const reconstructionPaths=new Set();
const fingerprintProof=generator.generate('surface-normalization-proof');
const surfaceOnlyClone=structuredClone(fingerprintProof);
surfaceOnlyClone.suspects.forEach((suspect,index)=>{suspect.name='Alias '+index;});
surfaceOnlyClone.evidence.forEach((item,index)=>{item.name='Clue '+index;item.description='Changed surface description '+index;});
surfaceOnlyClone.timeline.forEach((item,index)=>{item.time='23:'+String(index).padStart(2,'0');item.text='Changed timeline wording '+index;});
surfaceOnlyClone.caseModel.events.forEach((item,index)=>{item.approximateTime='23:'+String(index).padStart(2,'0');item.text='Changed event wording '+index;});
assert.equal(causalStructure(surfaceOnlyClone),causalStructure(fingerprintProof),'surface-only changes do not create a new causal fingerprint');
const legacyV3Case=structuredClone(fingerprintProof);
legacyV3Case.caseModel.version=3;
delete legacyV3Case.caseModel.archetype.variantId;
legacyV3Case.caseModel.truth.mechanismId=legacyV3Case.caseModel.archetype.id;
delete legacyV3Case.caseModel.truth.falseLeadType;
delete legacyV3Case.caseModel.truth.falseLeadExplanation;
delete legacyV3Case.caseModel.truth.falseLeadResolution;
delete legacyV3Case.caseModel.truth.falseLeadPattern;
delete legacyV3Case.caseModel.fingerprint.variant;
delete legacyV3Case.solution.falseLeadExplanation;
assert.equal(new CaseValidator().validate(legacyV3Case).valid,true,'cases persisted with the previous v3 model remain valid');
for(let index=0;index<200;index++){
	const generated=generator.generate('causal-diversity-'+index);
	const validation=new CaseValidator().validate(generated);
	assert.equal(validation.valid,true,'causal-diversity-'+index+': '+validation.errors.join('; '));
	const signature=causalStructure(generated);
	causalTopologies.add(causalTopology(generated));
	const entry=causalStructures.get(signature)||{count:0,examples:[]};
	entry.count++;
	if(entry.examples.length<2)entry.examples.push(generated);
	causalStructures.set(signature,entry);
	archetypeStructures.get(generated.caseModel.archetype.id).add(signature);
	variantsByArchetype.get(generated.caseModel.archetype.id).add(generated.caseModel.archetype.variantId);
	if(!archetypeCases.has(generated.caseModel.archetype.id))archetypeCases.set(generated.caseModel.archetype.id,generated);
	mechanisms.add(generated.caseModel.truth.mechanism);
	contradictionPatterns.add(JSON.stringify(generated.caseModel.contradictions.map(item=>{const fact=generated.evidence.find(clue=>clue.id===item.evidenceId)?.fact;return [item.suspectId===generated.solution.culpritId?'culprit':'other',item.statementQuestion,item.type,item.eventId&&generated.caseModel.events.findIndex(event=>event.id===item.eventId),fact?.predicate,fact?.source];}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))));
	redHerringPatterns.add(JSON.stringify([generated.caseModel.truth.falseLeadPattern?.type,generated.caseModel.truth.falseLeadPattern?.eventIndex,generated.caseModel.truth.falseLeadPattern?.subjectRole,generated.caseModel.truth.falseLeadPattern?.resolution]));
	const pathEvents=generated.solution.reconstruction.sequence.map(id=>generated.caseModel.events.find(event=>event.id===id));
	reconstructionPaths.add(JSON.stringify(pathEvents.map(event=>[event.type,event.prerequisites.map(id=>generated.caseModel.events.find(parent=>parent.id===id)?.type).sort()])));
}
const structureCounts=[...causalStructures.values()].map(entry=>entry.count).sort((left,right)=>right-left);
const largestStructure=structureCounts[0];
assert.equal(causalStructures.size,CaseTemplates.length*3,'each archetype variant must produce a distinct causal structure');
assert.equal(causalTopologies.size,CaseTemplates.length*3,'each variant must have distinct event topology independent of evidence labels');
assert.ok(largestStructure<100,'one causal structure must not account for a majority of generated cases');
for(const template of CaseTemplates){
	assert.equal(archetypeStructures.get(template.id).size,3,template.id+' must produce three causal structures');
	assert.equal(variantsByArchetype.get(template.id).size,3,template.id+' must generate each declared variant');
}
assert.equal(mechanisms.size,CaseTemplates.length*3,'variant mechanisms must be structurally distinct');
assert.ok(contradictionPatterns.size>=CaseTemplates.length*2,'variant contradiction patterns must vary');
assert.ok(redHerringPatterns.size>=CaseTemplates.length*2,'variant red-herring structures must vary');
assert.equal(reconstructionPaths.size,CaseTemplates.length*3,'variant reconstruction paths must differ');
for(const template of CaseTemplates){
	assert.equal(template.variants.length,2,template.id+' must declare a base plus two causal variants');
	const validCase=archetypeCases.get(template.id);
	assert.equal(new CaseValidator().validate(validCase).valid,true,template.id+' template case is valid');
	const wrongLabel=structuredClone(validCase);
	wrongLabel.caseModel.archetype.id=CaseTemplates.find(item=>item.id!==template.id).id;
	assert.equal(new CaseValidator().validate(wrongLabel).valid,false,template.id+' rejects a mismatched archetype label');
	const wrongVariantFingerprint=structuredClone(validCase);
	wrongVariantFingerprint.caseModel.fingerprint.variant='other_variant';
	assert.equal(new CaseValidator().validate(wrongVariantFingerprint).valid,false,template.id+' rejects a mismatched causal fingerprint variant');
	const missingCausalFingerprint=structuredClone(validCase);
	delete missingCausalFingerprint.caseModel.fingerprint.causalStructure;
	assert.equal(new CaseValidator().validate(missingCausalFingerprint).valid,false,template.id+' requires a graph-derived anti-repetition fingerprint');
	const missingEvent=structuredClone(validCase);
	missingEvent.caseModel.events.pop();
	assert.equal(new CaseValidator().validate(missingEvent).valid,false,template.id+' rejects a missing causal event');
	const missingEvidenceCollection=structuredClone(validCase);
	delete missingEvidenceCollection.evidence;
	assert.equal(new CaseValidator().validate(missingEvidenceCollection).valid,false,template.id+' rejects malformed causal state without throwing');
	const brokenPath=structuredClone(validCase);
	brokenPath.caseModel.reconstructionPath.reverse();
	assert.equal(new CaseValidator().validate(brokenPath).valid,false,template.id+' rejects an impossible reconstruction order');
	const brokenEvidence=structuredClone(validCase);
	const cameraEvidence=brokenEvidence.evidence.find(item=>item.id==='E1');
	cameraEvidence.eventId=brokenEvidence.caseModel.events.find(event=>event.id!==cameraEvidence.eventId).id;
	assert.equal(new CaseValidator().validate(brokenEvidence).valid,false,template.id+' rejects evidence disconnected from its declared event');
	const brokenKnowledge=structuredClone(validCase);
	const knower=brokenKnowledge.suspects.find(suspect=>suspect.knowledge.some(item=>item.eventId));
	const knowledge=knower.knowledge.find(item=>item.eventId);
	knowledge.eventId=brokenKnowledge.caseModel.events.find(event=>!event.actors.includes(knower.id)).id;
	assert.equal(new CaseValidator().validate(brokenKnowledge).valid,false,template.id+' rejects impossible witness knowledge');
}
console.log('Replayability: 200 cases; archetypes: '+CaseTemplates.length+'; causal structures: '+causalStructures.size+'; duplicate instances: '+(200-causalStructures.size)+'; largest repeated structure: '+largestStructure+'.');
console.log('Event topologies: '+causalTopologies.size+'; mechanisms: '+mechanisms.size+'; contradiction patterns: '+contradictionPatterns.size+'; red-herring patterns: '+redHerringPatterns.size+'; reconstruction paths: '+reconstructionPaths.size+'.');
console.log('Unique structures per archetype: '+[...archetypeStructures].map(([id,structures])=>id+'='+structures.size).join(', '));

async function testJoinHandler(){
	const handler=require('../src/handlers/detective');
	const handlerGame=handler.detectiveGame;
	const previousStore=handlerGame.store,previousInvestigationStore=handlerGame.investigations.store;
	const isolatedStore=new JsonStore(path.join(dir,'handler-state'));
	handlerGame.store=isolatedStore;
	handlerGame.investigations.store=isolatedStore;
	async function invokeJoin(guildId,userId){
		let response;
		const interaction={guildId,user:{id:userId},commandName:'detective',replied:false,deferred:false,isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,isModalSubmit:()=>false,options:{getSubcommand:()=> 'join'},reply:async payload=>{response=payload;interaction.replied=true;return payload;}};
		await handler.handleDetectiveInteraction(interaction);
		return response;
	}
	async function invokeComponent(guildId,userId,customId,values=[]){
		const calls=[];
		const interaction={guildId,user:{id:userId},customId,values,replied:false,deferred:false,isChatInputCommand:()=>false,isButton:()=>false,isStringSelectMenu:()=>true,isModalSubmit:()=>false,reply:async payload=>{calls.push({type:'reply',payload});interaction.replied=true;return payload;},update:async payload=>{calls.push({type:'update',payload});interaction.replied=true;return payload;}};
		await handler.handleDetectiveInteraction(interaction);
		return calls;
	}
	try{
		const missing=await invokeJoin('join-empty-guild','player-b');
		assert.equal(isolatedStore.values('cases').length,0,'/join with no case must not generate one');
		assert.equal(isolatedStore.values('sessions').length,0,'/join with no session must not create one');
		assert.equal(missing.flags!==undefined,true,'missing-session response is ephemeral');
		const guildId='join-existing-guild';
		const existingCase=handlerGame.getDailyCase(guildId);
		const existingSession=handlerGame.joinSession(guildId,existingCase,'player-a');
		const target=existingCase.investigationTargets[0];
		handlerGame.investigateSession(guildId,'player-a',existingCase,target.id);
		const evidenceBefore=[...existingSession.discoveredEvidence];
		const caseIdBefore=existingSession.caseId;
		const response=await invokeJoin(guildId,'player-b');
		const after=handlerGame.getSession(guildId,existingCase.id);
		assert.equal(response.flags!==undefined,true,'join confirmation is ephemeral');
		assert.equal(response.embeds[0].data.title,'INVESTIGATION SESSION');
		assert.equal(response.components,undefined,'join does not post the full case controls');
		assert.equal(isolatedStore.values('cases').length,1,'join does not create a second case');
		assert.equal(after.caseId,caseIdBefore,'join preserves the current case reference');
		assert.deepEqual(after.discoveredEvidence,evidenceBefore,'join preserves existing discoveries');
		assert.equal(after.players.length,2,'join adds one investigator');
		await invokeJoin(guildId,'player-b');
		assert.equal(handlerGame.getSession(guildId,existingCase.id).players.length,2,'repeat join is idempotent');
		const validComponent=await invokeComponent(guildId,'player-b','detective:inspect:'+existingCase.id,[existingCase.investigationTargets[1].id]);
		assert.equal(validComponent[0].type,'update','component resolves against its originating case');
		const caseCountBeforeInvalid=isolatedStore.values('cases').length;
		const invalidComponent=await invokeComponent(guildId,'player-b','detective:inspect:CASE_INVALID',[existingCase.investigationTargets[2].id]);
		assert.equal(invalidComponent[0].type,'reply','invalid case id receives an ephemeral error');
		assert.equal(isolatedStore.values('cases').length,caseCountBeforeInvalid,'invalid components do not generate cases');
		const expiredComponent=await invokeComponent(guildId,'player-b','detective:inspect',[existingCase.investigationTargets[2].id]);
		assert.equal(expiredComponent[0].type,'reply','legacy/stale components without case ids are rejected');
	}finally{
		handlerGame.store=previousStore;
		handlerGame.investigations.store=previousInvestigationStore;
	}
}

testJoinHandler().then(()=>console.log('Discord Detective tests passed.')).catch(error=>{console.error(error);process.exitCode=1;});

function causalStructure(caseData){
	const model=caseData.caseModel;
	const positions=new Map(model.events.map((event,index)=>[event.id,index]));
	const roleOf=id=>Object.keys(model.actorRoles).find(role=>model.actorRoles[role]===id)||'unassigned';
	const evidenceById=new Map(caseData.evidence.map(item=>[item.id,item]));
	const eventGraph=model.events.map(event=>({
		type:event.type,
		prerequisites:event.prerequisites.map(id=>positions.get(id)).sort((a,b)=>a-b),
		consequences:event.consequences.map(id=>positions.get(id)).sort((a,b)=>a-b),
		actors:event.actorRoles.slice().sort(),
		evidence:event.evidence.map(id=>{
			const item=evidenceById.get(id);
			return {tags:item.tags.slice().sort(),subject:item.suspectId?roleOf(item.suspectId):null,fact:item.fact?[item.fact.predicate,item.fact.value,roleOf(item.fact.suspectId),positions.get(item.fact.eventId)]:null};
		}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
	}));
	const evidenceLinks=caseData.evidence.map(item=>({
		tags:item.tags.slice().sort(),event:positions.get(item.eventId),
		links:(item.links||[]).map(link=>{const target=evidenceById.get(link.evidenceId);return [link.relation,target?.tags.slice().sort(),positions.get(target?.eventId)];}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
	})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
	const claims=model.statementDetails.filter(item=>item.claimFact).map(item=>({
		subject:roleOf(item.suspectId),question:item.question,fact:[item.claimFact.predicate,item.claimFact.value,positions.get(item.claimFact.eventId)],
		events:item.relatedEvents.map(id=>positions.get(id)).sort((a,b)=>a-b),
		evidence:item.relatedEvidence.map(id=>evidenceById.get(id)?.tags.slice().sort()).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
	})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
	const contradictions=model.contradictions.map(item=>{
		const statement=model.statementDetails.find(entry=>entry.suspectId===item.suspectId&&entry.question===item.statementQuestion);
		const evidence=evidenceById.get(item.evidenceId);
		return {subject:roleOf(item.suspectId),question:item.statementQuestion,event:positions.get(item.eventId),claim:statement?.claimFact&&[statement.claimFact.predicate,statement.claimFact.value],evidence:evidence?.tags.slice().sort(),fact:evidence?.fact&&[evidence.fact.predicate,evidence.fact.value]};
	}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
	const redLead=evidenceById.get(model.truth.falseLeadId);
	const culpritPath=model.events.filter(event=>event.actors.includes(model.truth.culpritId)).map(event=>positions.get(event.id));
	const reconstruction=caseData.solution.reconstruction.sequence.map(id=>positions.get(id));
	const witnessKnowledge=caseData.suspects.map(suspect=>[roleOf(suspect.id),suspect.knowledge.filter(item=>item.eventId).map(item=>positions.get(item.eventId)).sort((a,b)=>a-b)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
	return JSON.stringify({mechanism:model.truth.mechanism,eventGraph,evidenceLinks,claims,contradictions,witnessKnowledge,redLead:redLead&&[redLead.tags.slice().sort(),positions.get(redLead.eventId)],culpritPath,reconstruction});
}

function causalTopology(caseData){
	const model=caseData.caseModel;
	const positions=new Map(model.events.map((event,index)=>[event.id,index]));
	return JSON.stringify({
		eventCount:model.events.length,
		order:model.events.map(event=>event.type),
		actors:model.events.map(event=>event.actorRoles.slice().sort()),
		edges:model.events.flatMap(event=>event.prerequisites.map(id=>[positions.get(id),positions.get(event.id)])).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),
		culpritPath:model.events.filter(event=>event.actors.includes(model.truth.culpritId)).map(event=>positions.get(event.id)),
		reconstruction:caseData.solution.reconstruction.sequence.map(id=>positions.get(id))
	});
}
