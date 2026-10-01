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

    const openings=[
      {
        title:'The Silent Room',
        intro:'22:40 — Nhà số 17, phố Blackwood.\n\nTiếng chuông điện thoại vang lên lần thứ ba nhưng không ai bắt máy. Người quản gia mở cửa phòng làm việc và lập tức gọi cảnh sát. Một người đàn ông được phát hiện đã chết bên trong.\n\nCánh cửa khóa. Cửa sổ đóng từ bên trong. Camera hành lang không ghi nhận ai bước vào.\n\nNhưng chiếc đồng hồ trên bàn dừng ở 21:17, trong khi điện thoại của nạn nhân ghi nhận một cuộc gọi lúc 22:13 — và bản ghi cuộc gọi đó đã biến mất.\n\nCó một điều chắc chắn: hiện trường đang kể một câu chuyện không hoàn chỉnh.'
      },
      {
        title:'The Last Message',
        intro:'23:05 — Cảnh sát nhận được một tin nhắn chỉ gồm sáu chữ: “Đừng tin người đã gọi.”\n\nMười phút sau, người gửi được phát hiện đã chết trong phòng làm việc. Không có dấu hiệu đột nhập. Không ai thừa nhận đã ở gần căn phòng vào thời điểm đó.\n\nĐiện thoại vẫn còn trên bàn, nhưng tin nhắn cuối cùng đã bị xóa. Một chiếc đồng hồ trong phòng lại chỉ một thời điểm khác hoàn toàn với dữ liệu camera.\n\nBốn người có mặt trong tòa nhà. Cả bốn đều có lời giải thích. Chỉ có một lời giải thích khớp với tất cả các mốc thời gian.'
      },
      {
        title:'The Locked Office',
        intro:'21:52 — Đèn phòng làm việc bất ngờ tắt.\n\nKhi sáng trở lại, không ai mở được cửa từ bên ngoài. Người bên trong không trả lời. Sau khi cửa được mở bằng chìa dự phòng, cảnh sát phát hiện một người đàn ông đã chết trong phòng.\n\nKhông có cửa sổ mở. Không có dấu hiệu ai đột nhập. Camera hành lang vẫn hoạt động — và chính đoạn ghi hình đó khiến vụ án trở nên kỳ lạ hơn.\n\nBởi vì nó cho thấy một người xuất hiện ở hành lang vào thời điểm mà theo lời khai của chính họ, họ không thể có mặt ở đó.'
      }
    ];
    const opening=pick(openings,rng);
    return {
      id:'CASE_'+hash(seed).slice(0,8).toUpperCase(),dateKey,
      title:opening.title,
      difficulty:3,summary:opening.intro,intro:opening.intro,
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