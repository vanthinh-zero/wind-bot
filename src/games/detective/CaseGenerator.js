const { seeded, pick, shuffle, hash } = require('./utils');

class CaseGenerator {
  generate(seed, dateKey = null) {
    const rng = seeded(seed);
    const names = shuffle(['Minh','Huy','Nam','An','Khoa','Linh'], rng).slice(0,4);
    const culpritIndex = Math.floor(rng()*names.length);
    const suspects = names.map((name,i)=>({id:'S'+(i+1),name,role:i===culpritIndex?'culprit':'suspect'}));
    const evidence=[
      {id:'E1',name:'Camera Log',description:'Camera mất tín hiệu ngay trước thời điểm vụ việc.',tags:['time','critical']},
      {id:'E2',name:'Broken Watch',description:'Một chiếc đồng hồ bị vỡ và dừng ở mốc đáng chú ý.',tags:['time','critical']},
      {id:'E3',name:'Wet Footprints',description:'Dấu chân ướt dẫn về khu vực phụ.',tags:['red_herring']},
      {id:'E4',name:'Missing Key',description:'Chìa khóa dự phòng biến mất.',tags:['access','critical']},
      {id:'E5',name:'Phone Record',description:'Một cuộc gọi tạo mốc thời gian quan trọng.',tags:['time','critical']},
      {id:'E6',name:'Glove',description:'Một chiếc găng tay gần cửa.',tags:['red_herring']},
      {id:'E7',name:'Desk Note',description:'Ghi chú hé lộ động cơ.',tags:['motive','critical']}
    ];
    const targets=shuffle([
      ['L1','Bàn làm việc','E7'],['L2','Khu vực cửa','E4'],['L3','Phòng camera','E1'],
      ['L4','Hành lang','E3'],['L5','Gần ghế','E2'],['L6','Lịch sử điện thoại','E5'],['L7','Tủ đồ','E6']
    ],rng).map(x=>({id:x[0],label:x[1],evidenceId:x[2]}));
    const statements={};
    for(const s of suspects) statements[s.id]={
      base:s.name+': “Tôi không liên quan đến chuyện này.”',
      time:s.name+' nói rằng mình đang ở khu vực khác vào khoảng 21:20–21:30.',
      object:s.name+' phủ nhận việc từng chạm vào món đồ bị mất.',
      person:s.name+' nói rằng mình không biết gì về các nghi phạm khác.'
    };
    const motive=pick(['che giấu một khoản nợ','bảo vệ một người bạn','lấy lại một món đồ quan trọng','che giấu một việc làm sai trước đó'],rng);
    return {
      id:'CASE_'+hash(seed).slice(0,8).toUpperCase(),dateKey,
      title:pick(['The Silent Room','The Missing Laptop','The Locked Office','The Vanished Key','The Last Message'],rng),
      difficulty:3,summary:'Một món đồ biến mất trong khu vực tưởng như không thể tiếp cận.',
      suspects,evidence,investigationTargets:targets,statements,
      timeline:[
        {id:'T1',time:'21:10',text:'Mọi người vẫn còn ở khu vực chung.'},
        {id:'T2',time:'21:17',text:'Một cuộc gọi tạo ra mốc thời gian mới.'},
        {id:'T3',time:'21:23',text:'Camera bắt đầu mất tín hiệu.'},
        {id:'T4',time:'21:24',text:'Chiếc đồng hồ bị dừng.'},
        {id:'T5',time:'21:37',text:'Vụ mất đồ được phát hiện.'}
      ],
      solution:{
        culpritId:suspects[culpritIndex].id,culpritName:names[culpritIndex],motive,
        requiredEvidence:['E1','E2','E4','E5','E7'],validTimeline:['T2','T3','T4'],
        keywords:['camera','time','key']
      }
    };
  }
}
module.exports=CaseGenerator;