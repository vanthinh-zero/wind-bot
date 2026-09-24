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

    return { valid: errors.length === 0, errors };
  }
}

module.exports = CaseValidator;