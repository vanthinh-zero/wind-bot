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
    const hits=c.solution.keywords.filter(k=>normalize(report.reasoning).includes(normalize(k))).length;
    const reasoningScore=Math.min(500,hits*125);
    const culpritScore=unlocked&&culprit?500:0, motiveScore=unlocked&&motive?250:0;
    let total=culpritScore+motiveScore+timelineScore+evidenceScore+reasoningScore;
    if(!unlocked) total=Math.min(total,250);
    if(!culprit) total=Math.min(total,300);
    return {culprit,motive,reportUnlocked:unlocked,culpritScore,motiveScore,timelineScore,evidenceScore,reasoningScore,total,xp:Math.round(total*1.15),foundRequired:found.length,requiredEvidence:required.size};
  }
}
function resolve(c,v){const x=String(v||'').trim().toLowerCase();return c.suspects.find(s=>s.id.toLowerCase()===x||s.name.toLowerCase()===x)?.id||null;}
function normalize(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
module.exports=ScoringEngine;