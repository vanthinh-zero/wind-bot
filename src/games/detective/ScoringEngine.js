class ScoringEngine {
  score(c,inv,report){
    if(inv.completed) throw new Error('This investigation has already been submitted.');
    const required=new Set(c.solution.requiredEvidence);
    const found=inv.evidenceFound.filter(id=>required.has(id));
    const culpritId=resolve(c,report.culprit);
    const unlocked=inv.evidenceFound.length>=4&&inv.suspectsInterrogated.length>=1;
    const culprit=culpritId===c.solution.culpritId;
    const motive=normalize(report.motive).includes(normalize(c.solution.motive))||normalize(c.solution.motive).includes(normalize(report.motive));
    const timeline=[...new Set(report.timeline||[])].filter(id=>c.solution.validTimeline.includes(id));
    const timelineScore=Math.min(200,timeline.length*70);
    const evidenceScore=Math.round(found.length/required.size*300);
    const contradictionScore=Math.min(150,(inv.discoveredContradictions||[]).length*75);
    const hits=c.solution.keywords.filter(k=>normalize(report.reasoning).includes(normalize(k))).length;
    const reasoningScore=Math.min(500,hits*125);
    const reconstruction=normalize(report.reconstruction);
    const sequenceIds=c.solution.reconstruction?.sequence||c.solution.validTimeline;
    const sequenceHits=sequenceIds.filter(id=>reconstruction.includes(normalize(id))).length;
    const sequenceScore=sequenceHits>=3?100:0;
    const mechanism=c.solution.reconstruction?.mechanism||'';
    const mechanismScore=mechanism&&reconstruction.includes(normalize(mechanism))?100:0;
    const falseLead=c.solution.falseLeadId;
    const falseLeadName=c.evidence.find(item=>item.id===falseLead)?.name||'';
    const falseLeadScore=falseLead&&(reconstruction.includes(normalize(falseLead))||reconstruction.includes(normalize(falseLeadName)))?50:0;
    const citedEvidence=c.evidence.filter(item=>found.includes(item.id)&&(reconstruction.includes(normalize(item.id))||reconstruction.includes(normalize(item.name))));
    const evidenceReasoningScore=citedEvidence.length?50:0;
    const reconstructionScore=sequenceScore+mechanismScore+falseLeadScore+evidenceReasoningScore;
    const culpritScore=unlocked&&culprit?500:0, motiveScore=unlocked&&motive?250:0;
    let total=culpritScore+motiveScore+timelineScore+evidenceScore+contradictionScore+reasoningScore+reconstructionScore;
    if(!unlocked) total=Math.min(total,250);
    return {culprit,motive,reportUnlocked:unlocked,culpritScore,motiveScore,timelineScore,evidenceScore,contradictionScore,reconstructionScore,reasoningScore,total,xp:Math.round(total*1.15),foundRequired:found.length,requiredEvidence:required.size};
  }
}
function resolve(c,v){const x=String(v||'').trim().toLowerCase();return c.suspects.find(s=>s.id.toLowerCase()===x||s.name.toLowerCase()===x)?.id||null;}
function normalize(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
module.exports=ScoringEngine;