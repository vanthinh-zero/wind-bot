class InvestigationEngine {
  constructor(store) {
    this.store = store;
  }

  key(userId, caseId) {
    return userId + ':' + caseId;
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
}

module.exports = InvestigationEngine;