const ARCHETYPES = require('./CaseTemplates');

class CaseValidator {
  validate(caseData) {
    const errors = [];
    if (!caseData?.id || !caseData?.title) errors.push('Missing case identity.');
    if (!Array.isArray(caseData.suspects) || caseData.suspects.length < 2) errors.push('Need at least 2 suspects.');
    if (!Array.isArray(caseData.evidence) || caseData.evidence.length < 3) errors.push('Need at least 3 evidence items.');
    if (!Array.isArray(caseData.investigationTargets) || caseData.investigationTargets.length < 3) errors.push('Need investigation targets.');
    if (!caseData.solution?.culpritId) errors.push('Missing culprit.');

    const suspectIds = new Set((caseData.suspects || []).map(s => s.id));
    if (caseData.solution?.culpritId && !suspectIds.has(caseData.solution.culpritId)) errors.push('Culprit is not a suspect.');

    const evidenceIds = new Set((caseData.evidence || []).map(e => e.id));
    for (const id of caseData.solution?.requiredEvidence || []) {
      if (!evidenceIds.has(id)) errors.push('Required evidence ' + id + ' does not exist.');
    }

    const timelineIds = new Set((caseData.timeline || []).map(t => t.id));
    for (const id of caseData.solution?.validTimeline || []) {
      if (!timelineIds.has(id)) errors.push('Timeline event ' + id + ' does not exist.');
    }

    for (const target of caseData.investigationTargets || []) {
      if (!evidenceIds.has(target.evidenceId)) {
        errors.push('Target ' + target.id + ' points to missing evidence ' + target.evidenceId + '.');
      }
    }

    if ((caseData.solution?.requiredEvidence?.length || 0) < 3) {
      errors.push('Solution must have at least 3 required evidence items.');
    }

    if (caseData.caseModel?.version >= 2) this.validateCaseModel(caseData, errors);
    if (caseData.caseModel?.version >= 4) this.validateTemplate(caseData, errors);

    return { valid: errors.length === 0, errors };
  }

  validateCaseModel(caseData, errors) {
    const model = caseData.caseModel;
    const eventIds = new Set((model.events || []).map(event => event.id));
    const suspectById = new Map((caseData.suspects || []).map(suspect => [suspect.id, suspect]));
    const evidenceById = new Map((caseData.evidence || []).map(item => [item.id, item]));
    const timelineById = new Map((caseData.timeline || []).map(item => [item.id, item]));
    const addUniqueIds = (items, label) => {
      const ids = new Set();
      for (const item of items || []) {
        if (!item?.id || ids.has(item.id)) errors.push('Duplicate or missing ' + label + ' id.');
        ids.add(item?.id);
      }
    };

    if (!model.archetype?.id || !model.truth?.motive || !model.truth?.mechanism) errors.push('Case model is missing its causal truth.');
    if (model.truth?.culpritId !== caseData.solution?.culpritId) errors.push('Truth culprit does not match the public solution.');
    if (!model.fingerprint || ['archetype','motiveType','culpritRole','locationType','evidencePattern','timelinePattern','contradictionPattern','relationshipPattern'].some(key => !model.fingerprint[key])) {
      errors.push('Case fingerprint is incomplete.');
    }
    if(model.version>=3&&!model.fingerprint?.causalStructure)errors.push('Causal fingerprint is missing from a template case.');
    if(model.version>=4&&(!model.fingerprint?.variant||model.fingerprint.variant!==model.archetype?.variantId||model.fingerprint.archetype!==model.archetype?.id))errors.push('Causal fingerprint does not identify its selected variant.');
    addUniqueIds(model.events, 'event');
    addUniqueIds(caseData.evidence, 'evidence');

    const graph = new Map();
    for (const event of model.events || []) {
      if (!timelineById.has(event.id)) errors.push('Event ' + event.id + ' has no public timeline entry.');
      graph.set(event.id, event.prerequisites || []);
      for (const suspectId of event.actors || []) {
        if (!suspectById.has(suspectId)) errors.push('Event ' + event.id + ' references unknown actor ' + suspectId + '.');
      }
      for (const evidenceId of event.evidence || []) {
        if (!evidenceById.has(evidenceId) || evidenceById.get(evidenceId).eventId !== event.id) errors.push('Event ' + event.id + ' has invalid evidence reference ' + evidenceId + '.');
      }
      for (const relatedId of [...(event.prerequisites || []), ...(event.consequences || [])]) {
        if (!eventIds.has(relatedId)) errors.push('Event ' + event.id + ' references missing event ' + relatedId + '.');
      }
    }
    if (hasCycle(graph)) errors.push('Event graph contains a cycle.');

    for (const [id, item] of evidenceById) {
      if (!eventIds.has(item.eventId) || !model.events.find(event => event.id === item.eventId)?.evidence.includes(id)) errors.push('Evidence ' + id + ' is orphaned from its event.');
      if (item.suspectId && !suspectById.has(item.suspectId)) errors.push('Evidence ' + id + ' references an unknown suspect.');
      if (item.fact && ((item.fact.suspectId && !suspectById.has(item.fact.suspectId)) || !eventIds.has(item.fact.eventId) || item.fact.eventId !== item.eventId || !item.fact.source)) errors.push('Evidence ' + id + ' has invalid fact provenance.');
      for (const link of item.links || []) {
        if (!evidenceById.has(link.evidenceId) || link.evidenceId === id) errors.push('Evidence ' + id + ' has an invalid graph link.');
      }
    }
    for (const suspect of caseData.suspects || []) {
      for (const actionId of suspect.actualActions || []) {
        if (!eventIds.has(actionId) || !model.events.find(event => event.id === actionId)?.actors.includes(suspect.id)) errors.push('Suspect ' + suspect.id + ' has an impossible actual action.');
      }
      for (const fact of suspect.knowledge || []) {
        if (fact.eventId && (!eventIds.has(fact.eventId) || !model.events.find(event => event.id === fact.eventId)?.actors.includes(suspect.id))) errors.push('Suspect ' + suspect.id + ' has impossible event knowledge.');
      }
    }
    for (const statement of model.statementDetails || []) {
      if (!suspectById.has(statement.suspectId)) errors.push('Statement references an unknown suspect.');
      if ((statement.relatedEvents || []).some(id => !eventIds.has(id))) errors.push('Statement references a missing event.');
      if ((statement.relatedEvidence || []).some(id => !evidenceById.has(id))) errors.push('Statement references missing evidence.');
    }

    for (const contradiction of model.contradictions || []) {
      const statement = (model.statementDetails || []).find(item => item.suspectId === contradiction.suspectId && item.question === contradiction.statementQuestion);
      const evidence = evidenceById.get(contradiction.evidenceId);
      if (!statement || !evidence) errors.push('Contradiction has no matching statement or evidence.');
      else {
        const claim = statement.claimFact, fact = evidence.fact;
        if (!(statement.relatedEvidence || []).includes(contradiction.evidenceId) || !(statement.relatedEvents || []).includes(contradiction.eventId)) errors.push('Contradiction is not connected to its statement provenance.');
        if (!eventIds.has(contradiction.eventId) || evidence.eventId !== contradiction.eventId) errors.push('Contradiction references missing or mismatched event provenance.');
        if (!claim || !fact || claim.suspectId !== contradiction.suspectId || (fact.suspectId && fact.suspectId !== contradiction.suspectId) || claim.eventId !== contradiction.eventId || fact.eventId !== contradiction.eventId) errors.push('Contradiction is missing subject/event provenance.');
        else if (claim.predicate !== fact.predicate || claim.value === fact.value) errors.push('Contradiction claims are compatible or incomparable.');
      }
    }
    const culpritEvidence = (caseData.evidence || []).some(item => item.suspectId === caseData.solution?.culpritId && (caseData.solution?.requiredEvidence || []).includes(item.id));
    const culpritContradiction = (model.contradictions || []).some(item => item.suspectId === caseData.solution?.culpritId && (caseData.solution?.requiredEvidence || []).includes(item.evidenceId));
    if (!culpritEvidence || !culpritContradiction) errors.push('The culprit cannot be established from linked evidence and a contradiction.');
    if (!(caseData.solution?.requiredEvidence || []).some(id => evidenceById.get(id)?.tags?.includes('motive'))) errors.push('Required evidence does not establish a motive.');
    if (!evidenceById.has(model.truth?.falseLeadId) || !evidenceById.get(model.truth?.falseLeadId)?.tags?.includes('red_herring')) errors.push('False lead is missing or not marked as misleading evidence.');
    if ((caseData.solution?.requiredEvidence || []).includes(model.truth?.falseLeadId)) errors.push('False lead is incorrectly required to solve the case.');
  }

  validateTemplate(caseData, errors) {
    const model=caseData.caseModel;
    const archetypeId=model.archetype?.id,variantId=model.archetype?.variantId||'base';
    const template=ARCHETYPES.resolveVariant(archetypeId,variantId);
    if(!template){errors.push('Unknown causal archetype variant.');return;}
    if(!Array.isArray(model.events)||!Array.isArray(caseData.evidence)||!Array.isArray(caseData.suspects)||!Array.isArray(model.statementDetails)||!caseData.solution){errors.push('Template case is missing required causal collections.');return;}
    const events=model.events||[];
    const eventIds=new Map(template.events.map((event,index)=>[event.key,'T'+(index+1)]));
    const eventById=new Map(events.map(event=>[event.id,event]));
    const timelineById=new Map((caseData.timeline||[]).map(item=>[item.id,item]));
    const evidenceById=new Map((caseData.evidence||[]).map(item=>[item.id,item]));
    const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
    if(model.archetype?.variantId!==template.variantId)errors.push('Selected variant ID does not match the resolved template.');
    if(events.length!==template.events.length)errors.push('Event count does not match archetype '+template.id+'.');
    if(model.archetype?.culpritRole!==template.culpritRole)errors.push('Culprit role does not match archetype '+template.id+'.');
    if(model.truth?.mechanismId!==template.id+':'+template.variantId||model.truth?.mechanism!==template.mechanism||model.initialState!==template.initialState||model.outcome!==template.outcome)errors.push('Causal truth does not match archetype variant '+template.variantId+'.');
    if(model.truth?.motive!==template.motive||model.truth?.falseLeadId!==template.redHerring||model.truth?.falseLeadType!==template.redHerringType||model.truth?.falseLeadExplanation!==template.falseLeadExplanation||!same(model.truth?.falseLeadResolution,template.falseLeadResolution))errors.push('Motive or false lead does not match its archetype variant.');
    const roleAssignments=model.actorRoles||{};
    for(const spec of template.events){
      for(const role of spec.actorRoles)if(!roleAssignments[role]||!caseData.suspects.some(item=>item.id===roleAssignments[role]))errors.push('Archetype role '+role+' has no suspect assignment.');
    }
    for(let index=0;index<template.events.length;index++){
      const spec=template.events[index],id='T'+(index+1),event=eventById.get(id),timeline=timelineById.get(id);
      if(!event)continue;
      const expectedPrerequisites=spec.requires.map(key=>eventIds.get(key));
      const expectedConsequences=template.events.filter(item=>item.requires.includes(spec.key)).map(item=>eventIds.get(item.key));
      const expectedActors=[...new Set(spec.actorRoles.map(role=>roleAssignments[role]).filter(Boolean))].sort();
      if(event.key!==spec.key||event.type!==spec.type)errors.push('Event '+id+' does not match archetype event '+spec.key+'.');
      if(!same(event.actorRoles||[],spec.actorRoles))errors.push('Event '+id+' has the wrong information-bearing roles.');
      if(!same([...(event.actors||[])].sort(),expectedActors))errors.push('Event '+id+' actors do not match its role assignments.');
      if(!same(event.prerequisites,expectedPrerequisites))errors.push('Event '+id+' dependency edges do not match archetype '+template.id+'.');
      if(!same(event.consequences,expectedConsequences))errors.push('Event '+id+' consequence edges do not match archetype '+template.id+'.');
      if(!timeline||timeline.time!==event.approximateTime||timeline.text!==event.text||timeline.location!==event.location)errors.push('Timeline entry '+id+' does not reflect its causal event.');
    }
    if(events.some(event=>event.approximateTime===undefined||!event.key))errors.push('Causal events require keys and approximate times.');

    const evidenceEventEntries=Object.entries(template.evidenceEvents);
    if(caseData.evidence.length!==evidenceEventEntries.length)errors.push('Evidence inventory does not match the archetype contract.');
    for(const [evidenceId,eventKey] of evidenceEventEntries){
      const item=evidenceById.get(evidenceId),eventId=eventIds.get(eventKey),event=eventById.get(eventId);
      if(!item||item.eventId!==eventId||!event?.evidence.includes(evidenceId))errors.push('Evidence '+evidenceId+' is not attached to its archetype event.');
      if(item?.fact?.suspectId&&!event?.actors.includes(item.fact.suspectId))errors.push('Evidence '+evidenceId+' attributes a fact to a non-participant.');
      if(item&&template.evidenceDescriptions?.[evidenceId]){
        const subjectName=caseData.suspects.find(suspect=>suspect.id===item.suspectId)?.name||'một người trong tòa nhà';
        if(item.description!==template.evidenceDescriptions[evidenceId].replaceAll('{name}',subjectName))errors.push('Evidence '+evidenceId+' text does not match its causal source.');
      }
    }
    if(template.falseLeadFact){
      const spec=template.falseLeadFact,lead=evidenceById.get(spec.evidenceId),subjectId=roleAssignments[spec.role],eventId=eventIds.get(spec.eventKey);
      if(lead?.fact?.predicate!==spec.predicate||lead.fact.value!==spec.value||lead.fact.suspectId!==subjectId||lead.fact.eventId!==eventId||lead.fact.source!==spec.source)errors.push('False lead lacks its declared source, actor, or event relationship.');
    }
    if(template.falseLeadFact===null&&evidenceById.get(template.redHerring)?.fact)errors.push('False-lead evidence contains an undeclared suspect/event fact.');
    for(const evidenceId of template.requiredEvidence){
      if(!(caseData.solution.requiredEvidence||[]).includes(evidenceId))errors.push('Required archetype evidence '+evidenceId+' is missing from the solution.');
    }
    if((caseData.solution.requiredEvidence||[]).length<4)errors.push('Archetype solution does not meet the report-unlock evidence threshold.');

    if((model.contradictions||[]).length!==template.contradictions.length)errors.push('Contradiction count does not match archetype '+template.id+'.');
    for(const spec of template.contradictions){
      const contradiction=model.contradictions.find(item=>item.id===spec.id);
      const subjectId=roleAssignments[spec.role],eventId=eventIds.get(spec.eventKey);
      const statement=model.statementDetails.find(item=>item.suspectId===subjectId&&item.question===spec.question);
      const evidence=evidenceById.get(spec.evidenceId);
      const subjectName=caseData.suspects.find(item=>item.id===subjectId)?.name;
      if(!contradiction||contradiction.suspectId!==subjectId||contradiction.statementQuestion!==spec.question||contradiction.evidenceId!==spec.evidenceId||contradiction.eventId!==eventId||contradiction.type!==spec.id)errors.push('Contradiction '+spec.id+' does not match its archetype contract.');
      if(statement?.text!==spec.statement.replaceAll('{name}',subjectName||''))errors.push('Contradiction '+spec.id+' statement text does not express its declared claim.');
      if(!statement?.claimFact||statement.claimFact.predicate!==spec.predicate||statement.claimFact.value!==spec.claimValue||statement.claimFact.eventId!==eventId||!statement.relatedEvents.includes(eventId)||!statement.relatedEvidence.includes(spec.evidenceId))errors.push('Contradiction '+spec.id+' has an unsupported statement claim.');
      if(!evidence?.fact||evidence.fact.predicate!==spec.predicate||evidence.fact.value!==spec.evidenceValue||evidence.fact.eventId!==eventId||evidence.fact.source!==spec.source)errors.push('Contradiction '+spec.id+' has no matching sourced event fact.');
      if(spec.evidenceText&&evidence?.description!==spec.evidenceText.replaceAll('{name}',subjectName||''))errors.push('Contradiction '+spec.id+' evidence text omits its attributed fact.');
    }
    for(const [role,overrides] of Object.entries(template.statementOverrides||{})){
      const subjectId=roleAssignments[role],subjectName=caseData.suspects.find(item=>item.id===subjectId)?.name;
      for(const [question,text] of Object.entries(overrides)){
        const expected=text.replaceAll('{name}',subjectName||'');
        if(caseData.statements?.[subjectId]?.[question]!==expected||!model.statementDetails.some(item=>item.suspectId===subjectId&&item.question===question&&item.text===expected))errors.push('Statement for archetype role '+role+' does not match its knowledge contract.');
      }
    }

    const expectedPath=template.reconstructionPath.map(key=>eventIds.get(key));
    if(!same(model.reconstructionPath,expectedPath)||!same(caseData.solution.reconstruction?.sequence,expectedPath))errors.push('Reconstruction path does not match archetype '+template.id+'.');
    const pathPosition=new Map(expectedPath.map((id,index)=>[id,index]));
    for(const id of expectedPath){
      const event=eventById.get(id);
      if(!event)continue;
      for(const prerequisite of event.prerequisites||[])if(!pathPosition.has(prerequisite)||pathPosition.get(prerequisite)>=pathPosition.get(id))errors.push('Reconstruction path violates event prerequisites at '+id+'.');
    }
    if(caseData.solution.reconstruction?.mechanism!==template.mechanism)errors.push('Final reconstruction mechanism does not match the causal model.');
    if(!expectedPath.some(id=>eventById.get(id)?.actors.includes(caseData.solution.culpritId)))errors.push('Culprit is not reachable through the reconstruction path.');
    for(const spec of template.contradictions.filter(item=>item.role==='culprit')){
      if(!pathPosition.has(eventIds.get(spec.eventKey))||!(caseData.solution.requiredEvidence||[]).includes(spec.evidenceId))errors.push('Culprit reasoning path omits its sourced contradiction.');
    }
    if(caseData.solution.falseLeadId!==template.redHerring||caseData.solution.falseLeadExplanation!==template.falseLeadExplanation||(caseData.solution.requiredEvidence||[]).includes(template.redHerring))errors.push('False-lead contract is inconsistent.');
    const falseLead=evidenceById.get(template.redHerring);
    const falseLeadPattern={
      type:template.redHerringType,
      evidenceTags:falseLead?.tags?.slice().sort(),
      eventIndex:events.findIndex(event=>event.id===falseLead?.eventId),
      subjectRole:falseLead?.fact?.suspectId?Object.keys(roleAssignments).find(role=>roleAssignments[role]===falseLead.fact.suspectId)||'other':null,
      fact:falseLead?.fact?[falseLead.fact.predicate,falseLead.fact.value]:null,
      resolution:template.falseLeadResolution.map(id=>{const clue=evidenceById.get(id);return [clue?.tags?.slice().sort(),events.findIndex(event=>event.id===clue?.eventId)];}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
    };
    if(!same(model.truth.falseLeadPattern,falseLeadPattern)||!template.falseLeadExplanation||caseData.solution.falseLeadExplanation!==template.falseLeadExplanation)errors.push('Red-herring explanation or resolution does not match its causal evidence graph.');

    for(const suspect of caseData.suspects){
      const expectedEvents=events.filter(event=>event.actors.includes(suspect.id)).map(event=>event.id).sort();
      const actualActions=[...(suspect.actualActions||[])].sort();
      const knownEvents=(suspect.knowledge||[]).filter(item=>item.eventId).map(item=>item.eventId).sort();
      if(!same(actualActions,expectedEvents)||!same(knownEvents,expectedEvents))errors.push('Suspect '+suspect.id+' action/knowledge model diverges from the event graph.');
    }
    if(template.relationshipModel){
      const relation=(model.relationships||[]).find(item=>item.type===template.relationshipModel.type);
      const expectedSuspects=template.relationshipModel.roles.map(role=>roleAssignments[role]);
      const expectedEvents=template.relationshipModel.eventKeys.map(key=>eventIds.get(key));
      if(!relation||!same(relation.suspectIds,expectedSuspects)||!same(relation.establishedBy,expectedEvents))errors.push('Relationship is not supported by the selected event graph.');
    }else if((model.relationships||[]).length)errors.push('Unexpected relationship edges in this archetype.');
  }
}

function hasCycle(graph) {
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of graph.get(id) || []) if (visit(next)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  for (const id of graph.keys()) if (visit(id)) return true;
  return false;
}

module.exports = CaseValidator;