const CaseGenerator=require('./CaseGenerator');
const CaseValidator=require('./CaseValidator');
const InvestigationEngine=require('./InvestigationEngine');
const ScoringEngine=require('./ScoringEngine');
const JsonStore=require('./JsonStore');

class DetectiveGame {
  constructor(options={}){this.store=options.store||new JsonStore(options.dataDir);this.generator=new CaseGenerator();this.validator=new CaseValidator();this.investigations=new InvestigationEngine(this.store);this.scoring=new ScoringEngine();this.timeZone=options.timeZone||'Asia/Ho_Chi_Minh';}
  getDateKey(date=new Date()){try{return new Intl.DateTimeFormat('en-CA',{timeZone:this.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}catch{return date.toISOString().slice(0,10);}}
  getDailyCase(guildId,date=new Date()){if(!guildId)throw new Error('Detective requires a guild.');const dateKey=this.getDateKey(date),key='daily:'+guildId+':'+dateKey;let c=this.store.get('cases',key);if(!c){c=this.generator.generate(guildId+':'+dateKey,dateKey);const v=this.validator.validate(c);if(!v.valid)throw new Error('Generated case invalid: '+v.errors.join('; '));this.store.set('cases',key,c);}return c;}
  startInvestigation(userId,c){return this.investigations.start(userId,c);}
  investigate(userId,c,id){return this.investigations.investigate(userId,c,id);}
  interrogate(userId,c,id,a){return this.investigations.interrogate(userId,c,id,a);}
  addTimelineEvent(userId,c,id){return this.investigations.addTimelineEvent(userId,c,id);}
  submit(userId,c,report){const inv=this.investigations.get(userId,c.id);if(!inv)throw new Error('Investigation not found.');const result=this.scoring.score(c,inv,report);this.investigations.complete(userId,c,result);const p=this.updateProfile(userId,c.dateKey,result);return {result,profile:p};}
  getProfile(userId){return this.store.get('players',userId)||{userId,xp:0,rank:'Novice',streak:0,casesSolved:0,perfectCases:0,totalScore:0,lastCaseDate:null};}
  updateProfile(userId,date,result){const p=this.getProfile(userId),d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);const y=d.toISOString().slice(0,10);p.xp+=result.xp;p.casesSolved++;p.totalScore+=result.total;if(result.total>=900)p.perfectCases++;if(p.lastCaseDate===y)p.streak++;else if(p.lastCaseDate!==date)p.streak=1;p.lastCaseDate=date;p.rank=rank(p.xp);this.store.set('players',userId,p);return p;}
  getLeaderboard(limit=10){return this.store.values('players').sort((a,b)=>(b.xp||0)-(a.xp||0)||(b.totalScore||0)-(a.totalScore||0)).slice(0,Math.min(10,Math.max(1,Number(limit)||10)));}
}
function rank(x){if(x>=25000)return'Master Detective';if(x>=12000)return'Inspector';if(x>=6000)return'Senior Detective';if(x>=2500)return'Detective';if(x>=800)return'Investigator';return'Novice';}
module.exports=DetectiveGame;