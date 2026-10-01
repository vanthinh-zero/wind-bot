const { seeded, pick, shuffle, hash } = require('./utils');
const ARCHETYPES = require('./CaseTemplates');

const EVIDENCE = {
  E1:{name:'Camera Buffer',description:'Bản ghi cục bộ cho thấy camera gián đoạn trong một khoảng ngắn; hệ thống không ghi được người thao tác.',tags:['time','technical']},
  E2:{name:'Stopped Watch',description:'Đồng hồ dừng trong một khoảng thời gian chưa xác định; va đập có thể xảy ra trước khi kim ngừng.',tags:['physical','time']},
  E3:{name:'Wet Footprints',description:'Dấu giày ướt đi qua hành lang phụ. Kích cỡ không đủ để nhận dạng người mang.',tags:['red_herring','physical']},
  E4:{name:'Service Key Record',description:'Sổ bàn giao ghi chìa khóa dự phòng được ký nhận; cần đối chiếu với lời khai về quyền tiếp cận.',tags:['access','critical']},
  E5:{name:'Call Metadata',description:'Nhật ký nhà mạng xác nhận một cuộc gọi; nội dung không được lưu.',tags:['time','critical']},
  E6:{name:'Discarded Glove',description:'Chiếc găng tay có bụi từ kho đạo cụ, nhưng không có dấu vết đủ tin cậy để xác định người dùng.',tags:['red_herring','physical']},
  E7:{name:'Private Note',description:'Ghi chú của nạn nhân về một vấn đề chưa giải quyết; ghi chú không tự xác định ai đã hành động.',tags:['motive','critical']}
};

const PERSONALITIES = ['cẩn trọng và ít nói','thẳng thắn nhưng hay quên chi tiết','xã giao, tránh xung đột','nguyên tắc và chú ý giờ giấc','nóng nảy khi bị nghi ngờ','điềm tĩnh, thường cân nhắc trước khi nói'];
const RELATIONSHIPS = ['đồng nghiệp lâu năm','đối tác làm ăn','người thân xa','nhân viên mới','bạn cũ','người từng có tranh chấp'];
const MOTIVES = ['che giấu một khoản nợ','bảo vệ một người bạn','lấy lại một món đồ quan trọng','che giấu một việc làm sai trước đó','giữ kín một mối quan hệ'];

class CaseGenerator {
  generate(seed, dateKey = null, recentFingerprints = []) {
    let best = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidateSeed = attempt ? String(seed) + ':candidate:' + attempt : String(seed);
      const candidate = this.generateCandidate(candidateSeed, dateKey, String(seed));
      const similarity = Math.max(0, ...recentFingerprints.map(fingerprint => fingerprintSimilarity(candidate.caseModel.fingerprint, fingerprint)));
      if (!best || similarity < best.similarity) best = { candidate, similarity };
      if (similarity <= 4) return candidate;
    }
    return best.candidate;
  }

  generateCandidate(seed, dateKey = null, identitySeed = seed) {
    const rng = seeded(String(seed));
    const baseArchetype = pick(ARCHETYPES, rng);
    const variantId = pick(['base',...baseArchetype.variants.map(item=>item.variantId)],rng);
    const archetype = ARCHETYPES.resolveVariant(baseArchetype.id,variantId);
    const names = shuffle(['Minh','Huy','Nam','An','Khoa','Linh'], rng).slice(0,4);
    const culpritIndex = Math.floor(rng() * names.length);
    const culpritId = 'S' + (culpritIndex + 1);
    const nonculprits = names.map((name,index)=>({name,index})).filter(item=>item.index!==culpritIndex);
    const roleAssignments = {culprit:culpritId,witness_a:'S'+(nonculprits[0].index+1),witness_b:'S'+(nonculprits[1].index+1),innocent:'S'+(nonculprits[2].index+1),partner:'S'+(nonculprits[0].index+1)};
    const innocentId = roleAssignments.innocent;
    const victim = {id:'V1',name:pick(['ông Quang','bà Hạnh','ông Duy','bà Mai'],rng),profile:pick(['chủ tòa nhà','quản lý tài chính','người phụ trách lưu trữ','nhà sản xuất'],rng)};
    const motive = archetype.motive;
    const suspects = names.map((name,index)=>({
      id:'S'+(index+1),name,role:index===culpritIndex?'culprit':'suspect',personality:pick(PERSONALITIES,rng),relationshipToVictim:pick(RELATIONSHIPS,rng),
      motive:index===culpritIndex?archetype.motive:(('S'+(index+1))===innocentId?pick(MOTIVES.filter(item=>item!==archetype.motive),rng):null),
      secrets:(('S'+(index+1))===innocentId?['đang che giấu một việc riêng không liên quan đến vụ án']:[]),knowledge:[],actualActions:[],alibi:null
    }));
    const timeWindows=['21:04–21:08','21:08–21:12','21:12–21:16','21:16–21:20','21:20–21:24','21:24–21:29','21:34–21:40'];
    const eventIdByKey = new Map(archetype.events.map((event,index)=>[event.key,'T'+(index+1)]));
    const events = archetype.events.map((spec,index)=>{
      const actors=spec.actorRoles.map(role=>roleAssignments[role]).filter(Boolean);
      return {
        id:'T'+(index+1),key:spec.key,type:spec.type,approximateTime:timeWindows[spec.timeIndex],location:spec.location||archetype.location,text:spec.text,
        actorRoles:[...spec.actorRoles],actors:[...new Set(actors)],prerequisites:spec.requires.map(key=>eventIdByKey.get(key)),consequences:[],evidence:[],informationFlow:{directWitnessRoles:[...spec.actorRoles]}
      };
    });
    for(const event of events)for(const prerequisite of event.prerequisites)events.find(item=>item.id===prerequisite)?.consequences.push(event.id);
    const factByEvidence = new Map();
    for(const contradiction of archetype.contradictions){
      const suspectId=roleAssignments[contradiction.role];
      const event=events.find(item=>item.id===eventIdByKey.get(contradiction.eventKey));
      factByEvidence.set(contradiction.evidenceId,{predicate:contradiction.predicate,value:contradiction.evidenceValue,suspectId:contradiction.independent||contradiction.predicate==='camera_status'||!event?.actors.includes(suspectId)?null:suspectId,eventId:eventIdByKey.get(contradiction.eventKey),source:contradiction.source});
    }
    if(archetype.falseLeadFact){
      const clue=archetype.falseLeadFact;
      factByEvidence.set(clue.evidenceId,{predicate:clue.predicate,value:clue.value,suspectId:roleAssignments[clue.role],eventId:eventIdByKey.get(clue.eventKey),source:clue.source});
    }
    const evidence = Object.keys(EVIDENCE).map(id=>{
      const source=EVIDENCE[id],eventId=eventIdByKey.get(archetype.evidenceEvents[id]),fact=factByEvidence.get(id)||null;
      const contradiction=archetype.contradictions.find(item=>item.evidenceId===id);
      const suspectId=fact?.suspectId||(events.find(item=>item.id===eventId)?.actors.includes(culpritId)?culpritId:null);
      const subjectName=suspects.find(item=>item.id===suspectId)?.name;
      const contradictionName=suspects.find(item=>item.id===roleAssignments[contradiction?.role])?.name;
      let description=source.description;
      if(archetype.evidenceDescriptions?.[id])description=archetype.evidenceDescriptions[id].replaceAll('{name}',subjectName||'một người trong tòa nhà');
      else if(contradiction?.evidenceText)description=contradiction.evidenceText.replaceAll('{name}',contradictionName||subjectName||'một người trong tòa nhà');
      else if(id==='E1'&&archetype.id==='conflicting_witnesses')description='Bộ đệm máy ghi xác nhận camera tắt giữa hai lần nhân chứng quan sát hành lang.';
      return {id,name:archetype.evidenceNames?.[id]||source.name,description,tags:[...source.tags],sourceReliability:fact?'high':'medium',eventId,links:[],suspectId,fact};
    });
    for(const item of evidence){
      const event=events.find(entry=>entry.id===item.eventId);
      event.evidence.push(item.id);
    }
    for(const item of evidence){
      const event=events.find(entry=>entry.id===item.eventId);
      const adjacent=new Set([...event.prerequisites,...event.consequences]);
      const linked=evidence.find(other=>other.id!==item.id&&adjacent.has(other.eventId))||evidence.find(other=>other.id!==item.id&&other.eventId===item.eventId)||evidence.find(other=>other.id!==item.id);
      if(linked)item.links.push({evidenceId:linked.id,relation:adjacent.has(linked.eventId)?'supports_causal_sequence':'contextual_comparison'});
    }
    const statements={};
    const statementDetails=[];
    for(const suspect of suspects){
      const role=archetype.id==='hidden_relationship'&&roleAssignments.partner===suspect.id?'partner':Object.keys(roleAssignments).find(key=>roleAssignments[key]===suspect.id)||'suspect';
      const knownEvents=events.filter(event=>event.actors.includes(suspect.id));
      const timeText=role==='culprit'?'Tôi đã ở một khu vực khác trong khoảng thời gian quan trọng.':knownEvents.length?'Tôi chỉ nhớ những gì mình trực tiếp quan sát, không chắc chính xác từng phút.':'Tôi không theo dõi thời gian đủ sát để xác nhận mốc đó.';
      const objectText=role==='innocent'?'Tôi chưa từng cầm chìa khóa dự phòng; có chuyện riêng tôi không muốn kể.':'Tôi chỉ có thể nói về những vật dụng mình trực tiếp bàn giao.';
      const personText=role==='partner'?'Tôi không có liên hệ riêng với người được nhắc đến.':'Tôi không biết nội dung các cuộc trao đổi riêng của nạn nhân.';
      statements[suspect.id]={base:suspect.name+': “Tôi chỉ có thể xác nhận điều mình trực tiếp biết.”',time:timeText,object:objectText,person:personText};
      const defaults=[
        {question:'time',text:timeText,truthType:role==='culprit'||role==='innocent'?'lie':'partial_truth',confidence:0.6},
        {question:'object',text:objectText,truthType:role==='innocent'?'lie':'partial_truth',confidence:0.65},
        {question:'person',text:personText,truthType:role==='partner'?'omission':'partial_truth',confidence:0.55}
      ];
      for(const claim of defaults){
        const known=knownEvents.map(event=>event.id);
        const relatedEvidence=evidence.filter(item=>known.includes(item.eventId)).map(item=>item.id);
        statementDetails.push({...claim,suspectId:suspect.id,source:'interview',relatedEvents:known,relatedEvidence,claimFact:null,hiddenReason:role==='innocent'?'che giấu chuyện riêng không liên quan':null});
      }
      suspect.actualActions=knownEvents.map(event=>event.id);
      suspect.knowledge=knownEvents.map(event=>({eventId:event.id,kind:'direct',confidence:0.9}));
      if(suspect.id===innocentId)suspect.knowledge.push({factId:'private-secret',kind:'personal',confidence:1});
      suspect.alibi={claim:role==='culprit'?'ở một nơi khác':'không chắc địa điểm chính xác',window:knownEvents[0]?.approximateTime||'21:08–21:29',verified:false};
    }
    for(const [role,overrides] of Object.entries(archetype.statementOverrides||{})){
      const suspectId=roleAssignments[role],name=suspects.find(item=>item.id===suspectId).name;
      for(const [question,templateText] of Object.entries(overrides)){
        const text=templateText.replaceAll('{name}',name);
        statements[suspectId][question]=text;
        const detail=statementDetails.find(item=>item.suspectId===suspectId&&item.question===question);
        detail.text=text;
        detail.truthType='truth';
      }
    }
    const contradictions=archetype.contradictions.map(spec=>{
      const suspectId=roleAssignments[spec.role],eventId=eventIdByKey.get(spec.eventKey);
      const statement=statementDetails.find(item=>item.suspectId===suspectId&&item.question===spec.question);
      const text=spec.statement.replaceAll('{name}',suspects.find(item=>item.id===suspectId).name);
      statement.text=text;
      statement.truthType=spec.truthType||(spec.role==='culprit'?'lie':'mistaken');
      statement.claimFact={predicate:spec.predicate,value:spec.claimValue,suspectId,eventId};
      statement.relatedEvents=[...new Set([...statement.relatedEvents,eventId])];
      statement.relatedEvidence=[...new Set([...statement.relatedEvidence,spec.evidenceId])];
      statements[suspectId][spec.question]=text;
      return {id:spec.id,suspectId,statementQuestion:spec.question,evidenceId:spec.evidenceId,eventId,type:spec.id};
    });
    const relationships=archetype.relationshipModel?[{type:archetype.relationshipModel.type,suspectIds:archetype.relationshipModel.roles.map(role=>roleAssignments[role]),establishedBy:archetype.relationshipModel.eventKeys.map(key=>eventIdByKey.get(key))}]:[];
    const targets=shuffle(evidence.map((item,index)=>({id:'L'+(index+1),label:['Bàn làm việc','Cửa phụ','Phòng camera','Hành lang','Lịch sử điện thoại','Tủ đồ','Quầy tiếp tân'][index],evidenceId:item.id})),rng);
    const timeline=events.map(event=>({id:event.id,time:event.approximateTime,text:event.text,location:event.location}));
    const reconstructionPath=archetype.reconstructionPath.map(key=>eventIdByKey.get(key));
    const requiredEvidence=[...archetype.requiredEvidence];
    const falseLead=evidence.find(item=>item.id===archetype.redHerring);
    const falseLeadPattern={
      type:archetype.redHerringType,
      evidenceTags:falseLead.tags.slice().sort(),
      eventIndex:events.findIndex(event=>event.id===falseLead.eventId),
      subjectRole:falseLead.fact?.suspectId?Object.keys(roleAssignments).find(role=>roleAssignments[role]===falseLead.fact.suspectId)||'other':null,
      fact:falseLead.fact?[falseLead.fact.predicate,falseLead.fact.value]:null,
      resolution:archetype.falseLeadResolution.map(id=>{const clue=evidence.find(item=>item.id===id);return [clue.tags.slice().sort(),events.findIndex(event=>event.id===clue.eventId)];}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
    };
    const fingerprint=makeCausalFingerprint(archetype,events,evidence,contradictions,roleAssignments,reconstructionPath,relationships);
    fingerprint.archetype=archetype.id;
    fingerprint.variant=archetype.variantId;
    fingerprint.motiveType=archetype.motiveType;
    fingerprint.culpritRole=archetype.culpritRole;
    fingerprint.locationType=archetype.location;
    fingerprint.evidencePattern=JSON.stringify(events.map(event=>event.evidence.map(id=>EVIDENCE[id].tags.slice().sort())));
    fingerprint.timelinePattern=events.map(event=>event.type).join('>');
    fingerprint.contradictionPattern=contradictions.map(item=>item.statementQuestion+':'+item.eventId).join('|');
    fingerprint.relationshipPattern=relationships.map(item=>item.type+':'+item.suspectIds.map(id=>id===culpritId?'culprit':'other').join('-')).join('|')||'none';
    const intro=`${pick(['22:40','23:05','21:52'],rng)} — ${victim.profile} ${victim.name} được phát hiện tại ${archetype.location}. ${archetype.initialState} Các mốc và lời khai không tự giải thích được nhau; hãy dựng lại quan hệ giữa hành động, người quan sát và dấu vết.`;
    return {
      id:'CASE_'+hash(String(identitySeed)).slice(0,8).toUpperCase(),dateKey,title:archetype.title,difficulty:3,summary:intro,intro,
      suspects,evidence,investigationTargets:targets,statements,timeline,
      caseModel:{version:4,seed:String(identitySeed),archetype:{id:archetype.id,variantId:archetype.variantId,locationType:archetype.location,motiveType:archetype.motiveType,culpritRole:archetype.culpritRole},actorRoles:roleAssignments,initialState:archetype.initialState,outcome:archetype.outcome,truth:{victim,motive,culpritId,mechanism:archetype.mechanism,mechanismId:archetype.id+':'+archetype.variantId,falseLeadId:archetype.redHerring,falseLeadType:archetype.redHerringType,falseLeadExplanation:archetype.falseLeadExplanation,falseLeadResolution:archetype.falseLeadResolution,falseLeadPattern,relationships},events,relationships,reconstructionPath,evidenceGraph:evidence.map(item=>({id:item.id,links:item.links})),statementDetails,contradictions,fingerprint},
      solution:{culpritId,culpritName:names[culpritIndex],motive,requiredEvidence,validTimeline:reconstructionPath.slice(0,3),keywords:['camera','thời gian','chìa khóa'],reconstruction:{sequence:reconstructionPath,mechanism:archetype.mechanism},falseLeadId:archetype.redHerring,falseLeadExplanation:archetype.falseLeadExplanation}
    };
  }
}

function makeCausalFingerprint(archetype,events,evidence,contradictions,roles,path,relationships){
  const eventPositions=new Map(events.map((event,index)=>[event.id,index]));
  const evidenceById=new Map(evidence.map(item=>[item.id,item]));
  const roleOf=id=>Object.keys(roles).find(role=>roles[role]===id)||'unassigned';
  return {causalStructure:JSON.stringify({
    mechanism:archetype.mechanism,
    events:events.map(event=>({type:event.type,requires:event.prerequisites.map(id=>eventPositions.get(id)),actors:event.actorRoles.slice().sort(),evidence:event.evidence.map(id=>EVIDENCE[id].tags.slice().sort()).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))})),
    edges:events.flatMap(event=>event.prerequisites.map(parent=>[eventPositions.get(parent),eventPositions.get(event.id)])).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),
    evidence:evidence.map(item=>({tags:item.tags.slice().sort(),event:eventPositions.get(item.eventId),subject:item.suspectId?roleOf(item.suspectId):null,fact:item.fact&&[item.fact.predicate,item.fact.value,item.fact.suspectId?roleOf(item.fact.suspectId):null,eventPositions.get(item.fact.eventId)],links:item.links.map(link=>{const target=evidenceById.get(link.evidenceId);return [link.relation,target?.tags.slice().sort(),eventPositions.get(target?.eventId)];}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
    facts:contradictions.map(item=>{const statement=archetype.contradictions.find(entry=>entry.id===item.id);const clue=evidenceById.get(item.evidenceId);return [item.suspectId===roles.culprit?'culprit':statement.role,item.statementQuestion,eventPositions.get(item.eventId),statement.predicate,statement.claimValue,statement.evidenceValue,clue.tags.slice().sort()];}),
    witnessKnowledge:events.map(event=>event.actorRoles.slice().sort()),
    relationships:relationships.map(item=>[item.type,item.suspectIds.map(id=>id===roles.culprit?'culprit':'associate').sort(),item.establishedBy.map(id=>eventPositions.get(id))]),
    falseLead:[archetype.redHerringType,EVIDENCE[archetype.redHerring].tags.slice().sort(),eventPositions.get(evidenceById.get(archetype.redHerring).eventId),archetype.falseLeadResolution.map(id=>{const clue=evidenceById.get(id);return [clue.tags.slice().sort(),eventPositions.get(clue.eventId)];}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))],
    reconstruction:path.map(id=>eventPositions.get(id))
  })};
}

function fingerprintSimilarity(left,right){
  const keys=['archetype','variant','motiveType','culpritRole','locationType','evidencePattern','timelinePattern','contradictionPattern','relationshipPattern','causalStructure'];
  return keys.filter(key=>left[key]===right[key]).length;
}

module.exports=CaseGenerator;