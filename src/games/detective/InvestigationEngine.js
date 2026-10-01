class InvestigationEngine {
  constructor(store) {
    this.store = store;
  }

  key(userId, caseId) {
    return userId + ':' + caseId;
  }

  sessionKey(guildId, caseId) {
    return guildId + ':' + caseId;
  }

  joinSession(guildId, caseData, userId) {
    const key = this.sessionKey(guildId, caseData.id);
    let session = this.store.get('sessions', key);
    if (!session) {
      session = {
        sessionId:key,
        guildId,
        caseId:caseData.id,
        players:[],
        inspectedTargets:[],
        discoveredEvidence:[],
        interrogatedSuspects:[],
        interrogationLog:[],
        discoveredContradictions:[],
        timelineNotes:[],
        hypotheses:[],
        status:'active',
        startedAt:Date.now()
      };
    }
    if (!session.players.some(player => player.userId === userId)) {
      session.players.push({userId,role:'investigator',joinedAt:Date.now()});
    }
    this.saveSession(session);
    return session;
  }

  getSession(guildId, caseId) {
    return this.store.get('sessions', this.sessionKey(guildId, caseId));
  }

  investigateSession(guildId, userId, caseData, targetId) {
    const session = this.joinSession(guildId, caseData, userId);
    if (session.status !== 'active') return {completed:true,session};
    const target = caseData.investigationTargets.find(item => item.id === targetId);
    if (!target) throw new Error('Investigation target not found.');
    const evidence = caseData.evidence.find(item => item.id === target.evidenceId);
    if (!evidence) throw new Error('Evidence linked to target was not found.');
    const found = !session.inspectedTargets.includes(target.id);
    if (found) {
      session.inspectedTargets.push(target.id);
      if (!session.discoveredEvidence.includes(evidence.id)) session.discoveredEvidence.push(evidence.id);
      this.refreshContradictions(session, caseData);
      this.saveSession(session);
    }
    return {found,target,evidence,session};
  }

  interrogateSession(guildId, userId, caseData, suspectId, action) {
    const session = this.joinSession(guildId, caseData, userId);
    if (session.status !== 'active') return {completed:true,session};
    const suspect = caseData.suspects.find(item => item.id === suspectId);
    if (!suspect) throw new Error('Suspect not found.');
    const statementSet = caseData.statements[suspectId] || {};
    const response = statementSet[action] || statementSet.base || (suspect.name + ': “Tôi không có gì để nói.”');
    const record = {suspectId,action,response,playerId:userId,at:Date.now()};
    session.interrogationLog.push(record);
    if (!session.interrogatedSuspects.includes(suspectId)) session.interrogatedSuspects.push(suspectId);
    this.refreshContradictions(session, caseData);
    this.saveSession(session);
    return {...record,session};
  }

  addSessionTimeline(guildId, userId, caseData, eventId) {
    const session = this.joinSession(guildId, caseData, userId);
    if (!caseData.timeline.some(item => item.id === eventId)) throw new Error('Timeline event not found.');
    if (!session.timelineNotes.includes(eventId)) session.timelineNotes.push(eventId);
    this.saveSession(session);
    return session;
  }

  addHypothesis(guildId, userId, caseData, text) {
    const session = this.joinSession(guildId, caseData, userId);
    const cleanText = String(text || '').trim();
    if (!cleanText || cleanText.length > 1000) throw new Error('Hypothesis must be between 1 and 1000 characters.');
    const hypothesis = {id:'H'+(session.hypotheses.length+1),playerId:userId,text:cleanText,createdAt:Date.now()};
    session.hypotheses.push(hypothesis);
    this.saveSession(session);
    return {hypothesis,session};
  }

  completeSession(guildId, caseId, result) {
    const session = this.getSession(guildId, caseId);
    if (!session || session.status === 'completed') return session;
    session.status = 'completed';
    session.result = result;
    session.completedAt = Date.now();
    this.saveSession(session);
    return session;
  }

  start(userId, caseData) {
    const key = this.key(userId, caseData.id);
    let inv = this.store.get('investigations', key);
    if (!inv) {
      inv = {
        userId,
        caseId: caseData.id,
        evidenceFound: [],
        inspectedTargets: [],
        suspectsInterrogated: [],
        interrogationLog: [],
        timeline: [],
        completed: false,
        startedAt: Date.now()
      };
      this.store.set('investigations', key, inv);
    }
    return inv;
  }

  get(userId, caseId) {
    return this.store.get('investigations', this.key(userId, caseId));
  }

  investigate(userId, caseData, targetId) {
    const inv = this.start(userId, caseData);
    if (inv.completed) return { completed: true, investigation: inv };
    const target = caseData.investigationTargets.find(t => t.id === targetId);
    if (!target) throw new Error('Investigation target not found.');
    const evidence = caseData.evidence.find(e => e.id === target.evidenceId);
    if (!evidence) throw new Error('Evidence linked to target was not found.');

    if (!inv.inspectedTargets.includes(target.id)) {
      inv.inspectedTargets.push(target.id);
      if (!inv.evidenceFound.includes(evidence.id)) inv.evidenceFound.push(evidence.id);
      this.save(inv);
      return { found: true, target, evidence, investigation: inv };
    }
    return { found: false, target, evidence, investigation: inv };
  }

  interrogate(userId, caseData, suspectId, action) {
    const inv = this.start(userId, caseData);
    if (inv.completed) return { completed: true, investigation: inv };
    const suspect = caseData.suspects.find(s => s.id === suspectId);
    if (!suspect) throw new Error('Suspect not found.');
    const statementSet = caseData.statements[suspectId] || {};
    let response = statementSet[action] || statementSet.base || (suspect.name + ': “Tôi không có gì để nói.”');

    if (inv.evidenceFound.includes('E1') && action === 'time') response += '\n\n🧩 Khi được hỏi về camera, ' + suspect.name + ' tỏ ra dè chừng.';
    if (inv.evidenceFound.includes('E4') && action === 'object') response += '\n\n🔑 Khi được nhắc tới chìa khóa, ' + suspect.name + ' phải suy nghĩ lại trước khi trả lời.';
    if (inv.evidenceFound.includes('E5') && action === 'time') response += '\n\n📱 Lịch sử cuộc gọi khiến mốc thời gian trong lời khai trở nên đáng nghi.';

    const record = { suspectId, action, response, at: Date.now() };
    inv.interrogationLog.push(record);
    if (!inv.suspectsInterrogated.includes(suspectId)) inv.suspectsInterrogated.push(suspectId);
    this.save(inv);
    return { ...record, investigation: inv };
  }

  addTimelineEvent(userId, caseData, eventId) {
    const inv = this.start(userId, caseData);
    if (inv.completed) return inv;
    if (!caseData.timeline.some(t => t.id === eventId)) throw new Error('Timeline event not found.');
    if (!inv.timeline.includes(eventId)) inv.timeline.push(eventId);
    this.save(inv);
    return inv;
  }

  complete(userId, caseData, result) {
    const inv = this.get(userId, caseData.id);
    if (!inv || inv.completed) return inv;
    inv.completed = true;
    inv.result = result;
    inv.completedAt = Date.now();
    this.save(inv);
    return inv;
  }

  save(inv) {
    this.store.set('investigations', this.key(inv.userId, inv.caseId), inv);
  }

  refreshContradictions(session, caseData) {
    for (const contradiction of caseData.caseModel?.contradictions || []) {
      const statement = caseData.caseModel.statementDetails.find(item => item.suspectId === contradiction.suspectId && item.question === contradiction.statementQuestion);
      const evidence = caseData.evidence.find(item => item.id === contradiction.evidenceId);
      const asked = session.interrogationLog.some(record => record.suspectId === contradiction.suspectId && record.action === contradiction.statementQuestion);
      const claim = statement?.claimFact, fact = evidence?.fact;
      const supported = statement?.relatedEvents?.includes(contradiction.eventId) && statement?.relatedEvidence?.includes(contradiction.evidenceId) && evidence?.eventId === contradiction.eventId && claim?.suspectId === contradiction.suspectId && (!fact?.suspectId || fact.suspectId === contradiction.suspectId) && claim?.eventId === contradiction.eventId && fact?.eventId === contradiction.eventId && fact?.source && claim?.predicate === fact?.predicate && claim?.value !== fact?.value;
      if (asked && supported && session.discoveredEvidence.includes(contradiction.evidenceId) && !session.discoveredContradictions.includes(contradiction.id)) {
        session.discoveredContradictions.push(contradiction.id);
      }
    }
  }

  saveSession(session) {
    this.store.set('sessions', this.sessionKey(session.guildId, session.caseId), session);
  }
}

module.exports = InvestigationEngine;