const ARCHETYPES = [
  {
    id:'locked_room', title:'The Silent Room', location:'phòng làm việc', motiveType:'debt', culpritRole:'custodian', motive:'che giấu một khoản nợ', redHerring:'E3', redHerringType:'innocent_suspicious_behavior', falseLeadExplanation:'Dấu giày thuộc người trực ca; chúng chỉ xác nhận người này đến sau khi cửa đã khóa, không chứng minh họ vào phòng.', falseLeadResolution:['E4','E5'], requiredEvidence:['E1','E2','E4','E7'],
    initialState:'Căn phòng có một cửa chính với chốt lò xo và một lối bảo trì bị niêm phong.',
    mechanism:'Hung thủ dùng chìa phụ đã sao, vào phòng, rời qua lối bảo trì rồi để chốt lò xo tạo cảm giác cửa khóa từ bên trong.',
    outcome:'Nạn nhân được phát hiện trong căn phòng khóa kín; cửa sổ và chốt chính không bị phá.',
    events:[
      {key:'key_copied',type:'access_prepared',timeIndex:0,text:'Một chìa phụ được sao trước khi ca trực bắt đầu.',location:'phòng dụng cụ',actorRoles:['culprit'],requires:[]},
      {key:'latch_tested',type:'lock_mechanism_tested',timeIndex:1,text:'Chốt lò xo được thử từ phía hành lang.',location:'cửa phòng làm việc',actorRoles:['culprit'],requires:['key_copied']},
      {key:'room_entered',type:'restricted_room_entered',timeIndex:2,text:'Một người dùng chìa phụ vào phòng khi cửa chính chưa bị chú ý.',location:'phòng làm việc',actorRoles:['culprit'],requires:['latch_tested']},
      {key:'incident',type:'victim_confronted',timeIndex:3,text:'Cuộc đối đầu với nạn nhân xảy ra bên trong phòng.',location:'phòng làm việc',actorRoles:['culprit'],requires:['room_entered']},
      {key:'hidden_exit',type:'concealed_exit_used',timeIndex:4,text:'Lối bảo trì được dùng; chốt lò xo trở lại vị trí khóa.',location:'lối bảo trì',actorRoles:['culprit'],requires:['incident']},
      {key:'locked_discovery',type:'locked_room_discovered',timeIndex:5,text:'Người trực ca phát hiện nạn nhân và cửa đang khóa.',location:'hành lang',actorRoles:['witness_a'],requires:['hidden_exit']}
    ],
    evidenceEvents:{E1:'hidden_exit',E2:'incident',E3:'locked_discovery',E4:'key_copied',E5:'room_entered',E6:'locked_discovery',E7:'key_copied'},
    contradictions:[{id:'C1',role:'culprit',question:'object',evidenceId:'E4',eventKey:'key_copied',predicate:'key_handled',claimValue:'no',evidenceValue:'yes',source:'key_copy_log',statement:'{name} nói chưa từng cầm hoặc sao chìa dự phòng.',evidenceText:'Sổ sao chìa ghi nhận {name} đã nhận một bản chìa phụ trước ca trực.'}],
    reconstructionPath:['key_copied','latch_tested','room_entered','incident','hidden_exit','locked_discovery']
  },
  {
    id:'false_alibi', title:'The Last Message', location:'khu lưu trữ', motiveType:'protect_someone', culpritRole:'witness', motive:'bảo vệ một người bạn', redHerring:'E6', redHerringType:'unrelated_secret', falseLeadExplanation:'Chiếc găng tay thuộc nhân viên kỹ thuật và được dùng trước ca trực; nó không đặt người đó tại hiện trường trong khoảng quan trọng.', falseLeadResolution:['E5','E1'], requiredEvidence:['E1','E4','E5','E7'],
    initialState:'Một lời khai đặt nghi phạm ở kho lưu trữ trong khi các nguồn độc lập ghi lại hoạt động ở hai nơi khác.',
    mechanism:'Hung thủ khai đang ở kho lưu trữ, nhưng cuộc gọi từ máy lẻ tại hiện trường và nhân chứng độc lập đặt họ trên tuyến di chuyển.',
    outcome:'Lời khai về vị trí bị bác bỏ bởi một dấu thời gian độc lập và một lần nhìn thấy trên đường đi.',
    events:[
      {key:'alibi_claimed',type:'alibi_location_claimed',timeIndex:0,text:'Nghi phạm nói đã ở kho lưu trữ suốt khoảng thời gian quan trọng.',location:'quầy lưu trữ',actorRoles:['culprit','witness_a'],requires:[]},
      {key:'call_from_scene',type:'scene_phone_used',timeIndex:1,text:'Máy lẻ tại hiện trường thực hiện cuộc gọi dưới mã được cấp cho nghi phạm.',location:'phòng làm việc',actorRoles:['culprit'],requires:[]},
      {key:'route_sighting',type:'independent_route_sighting',timeIndex:2,text:'Một nhân chứng thấy nghi phạm rời tuyến đường nối hiện trường với kho.',location:'cửa phụ',actorRoles:['culprit','witness_b'],requires:[]},
      {key:'movement_window',type:'alibi_route_reconstructed',timeIndex:3,text:'Khoảng trống giữa cuộc gọi và lần nhìn thấy cho phép di chuyển đến hiện trường.',location:'hành lang phụ',actorRoles:['culprit'],requires:['call_from_scene','route_sighting']},
      {key:'alibi_reviewed',type:'alibi_independently_checked',timeIndex:4,text:'Sổ trực đối chiếu lời khai với hai nguồn ghi nhận độc lập.',location:'bàn trực',actorRoles:['witness_a','witness_b'],requires:['alibi_claimed','movement_window']}
    ],
    evidenceEvents:{E1:'route_sighting',E2:'movement_window',E3:'route_sighting',E4:'alibi_claimed',E5:'call_from_scene',E6:'alibi_reviewed',E7:'alibi_claimed'},
    contradictions:[{id:'C1',role:'culprit',question:'time',evidenceId:'E5',eventKey:'call_from_scene',predicate:'reported_location',claimValue:'archive',evidenceValue:'scene',source:'phone_metadata',statement:'{name} khẳng định mình ở kho lưu trữ khi cuộc gọi được thực hiện.',evidenceText:'Nhật ký nhà mạng đặt máy lẻ được cấp cho {name} tại phòng làm việc trong mốc cuộc gọi.'}],
    reconstructionPath:['alibi_claimed','call_from_scene','route_sighting','movement_window','alibi_reviewed']
  },
  {
    id:'staged_scene', title:'The Unmoving Clock', location:'phòng thu', motiveType:'conceal_misconduct', culpritRole:'technician', motive:'che giấu một việc làm sai trước đó', redHerring:'E3', redHerringType:'misleading_physical_trace', falseLeadExplanation:'Dấu giày đi qua sau khi hiện trường đã bị thay đổi; chúng không xác định ai đã chạm vào đồng hồ.', falseLeadResolution:['E2','E6'], requiredEvidence:['E1','E2','E6','E7'],
    initialState:'Hiện trường có một vật bị di chuyển và một dấu vết phụ không khớp với thời điểm được trình bày.',
    mechanism:'Sau sự cố thật, hung thủ dàn lại đồng hồ và dấu vết để đẩy thời điểm sự việc về sớm hơn.',
    outcome:'Đồng hồ tạo ra mốc giả, nhưng vật liệu còn lại tại hiện trường cho thấy việc dàn dựng xảy ra muộn hơn.',
    events:[
      {key:'incident',type:'real_incident',timeIndex:0,text:'Sự cố thật xảy ra trước khi hiện trường bị chạm vào.',location:'phòng thu',actorRoles:['culprit'],requires:[]},
      {key:'scene_altered',type:'scene_altered',timeIndex:1,text:'Vị trí một số vật dụng bị thay đổi có chủ đích.',location:'phòng thu',actorRoles:['culprit'],requires:['incident']},
      {key:'watch_planted',type:'false_time_marker_planted',timeIndex:2,text:'Đồng hồ bị đặt lại để gợi một mốc sớm hơn.',location:'bàn điều khiển',actorRoles:['culprit'],requires:['scene_altered']},
      {key:'trace_left',type:'secondary_trace_left',timeIndex:3,text:'Một vết dầu trên găng tay của kỹ thuật viên còn lại ở mép bàn.',location:'bàn điều khiển',actorRoles:['culprit'],requires:['scene_altered']},
      {key:'scene_examined',type:'inconsistent_traces_examined',timeIndex:4,text:'Người kiểm tra so đồng hồ với dấu vết trên bàn.',location:'phòng thu',actorRoles:['witness_a'],requires:['watch_planted','trace_left']}
    ],
    evidenceEvents:{E1:'scene_altered',E2:'watch_planted',E3:'scene_examined',E4:'incident',E5:'incident',E6:'trace_left',E7:'incident'},
    contradictions:[{id:'C1',role:'culprit',question:'object',evidenceId:'E2',eventKey:'watch_planted',predicate:'watch_tampered',claimValue:'no',evidenceValue:'yes',source:'mechanical_trace',statement:'{name} nói mình không chạm vào chiếc đồng hồ sau sự cố.',evidenceText:'Dấu cơ khí trên núm chỉnh khớp với thao tác đặt lại đồng hồ trong giai đoạn {name} có mặt.'}],
    reconstructionPath:['incident','scene_altered','watch_planted','trace_left','scene_examined']
  },
  {
    id:'missing_object', title:'The Empty Cabinet', location:'phòng hồ sơ', motiveType:'recover_object', culpritRole:'owner', motive:'lấy lại một món đồ quan trọng', redHerring:'E6', redHerringType:'misleading_physical_trace', falseLeadExplanation:'Găng tay có bụi lưu trữ nhưng không có dấu vết người dùng; nó không nối được ai với lần hồ sơ biến mất.', falseLeadResolution:['E4','E5'], requiredEvidence:['E2','E4','E5','E7'],
    initialState:'Một món hồ sơ có mặt trong lần kiểm kê đầu nhưng không còn khi mất mát được phát hiện.',
    mechanism:'Hung thủ lấy hồ sơ sau lần kiểm kê, sửa sổ ra vào ở một nhánh riêng rồi rời khỏi khu vực trước khi phát hiện.',
    outcome:'Hai chuỗi độc lập, vật thể biến mất và bản ghi bị sửa, cùng quy về một lần tiếp cận.',
    events:[
      {key:'inventory_checked',type:'object_inventory_confirmed',timeIndex:0,text:'Nhân viên xác nhận hồ sơ vẫn còn trong tủ.',location:'phòng hồ sơ',actorRoles:['witness_a'],requires:[]},
      {key:'object_removed',type:'target_object_removed',timeIndex:1,text:'Hồ sơ được lấy khỏi tủ sau lần kiểm kê.',location:'tủ hồ sơ',actorRoles:['culprit'],requires:['inventory_checked']},
      {key:'access_record_edited',type:'access_record_altered',timeIndex:2,text:'Một dòng trong sổ chìa khóa bị sửa để che lần tiếp cận.',location:'bàn trực',actorRoles:['culprit'],requires:['inventory_checked']},
      {key:'exit_route',type:'suspect_left_archive',timeIndex:3,text:'Nghi phạm rời khu lưu trữ cùng một vật phẳng trong túi hồ sơ.',location:'cửa phụ',actorRoles:['culprit','witness_b'],requires:['object_removed']},
      {key:'absence_discovered',type:'missing_object_discovered',timeIndex:4,text:'Lần kiểm tra sau phát hiện hồ sơ mất và bản ghi có dấu sửa.',location:'phòng hồ sơ',actorRoles:['witness_b'],requires:['access_record_edited','exit_route']}
    ],
    evidenceEvents:{E1:'exit_route',E2:'object_removed',E3:'exit_route',E4:'access_record_edited',E5:'inventory_checked',E6:'absence_discovered',E7:'inventory_checked'},
    contradictions:[{id:'C1',role:'culprit',question:'object',evidenceId:'E4',eventKey:'access_record_edited',predicate:'archive_access',claimValue:'no',evidenceValue:'yes',source:'signed_access_log',statement:'{name} phủ nhận đã vào khu lưu trữ sau lần kiểm kê.',evidenceText:'Bản ký nhận chìa khóa xác nhận {name} đã vào khu lưu trữ sau lần kiểm kê đầu.'}],
    reconstructionPath:['inventory_checked','object_removed','access_record_edited','exit_route','absence_discovered']
  },
  {
    id:'conflicting_witnesses', title:'Three Versions', location:'hành lang phía đông', motiveType:'protect_someone', culpritRole:'observer', motive:'bảo vệ một người bạn', redHerring:'E6', redHerringType:'incorrect_witness_assumption', falseLeadExplanation:'Nhân chứng đoán chiếc găng tay thuộc người rời cửa phụ; hồ sơ kho đạo cụ không xác nhận người sử dụng.', falseLeadResolution:['E1','E5'], requiredEvidence:['E1','E4','E5','E7'],
    initialState:'Hai nhân chứng chỉ quan sát được các đoạn khác nhau của cùng một lần ra vào.',
    mechanism:'Hung thủ lợi dụng vùng quan sát rời rạc; hai lời khai tưởng như loại trừ nhau nhưng bộ đệm camera xác định thứ tự.',
    outcome:'Các lời khai tương thích khi ghép đúng khoảng nhìn thấy; camera giải quyết mốc camera tắt.',
    events:[
      {key:'arrival_sighted',type:'arrival_partially_observed',timeIndex:0,text:'Nhân chứng A thấy một người đến trước khi hành lang khuất tầm nhìn.',location:'sảnh đông',actorRoles:['culprit','witness_a'],requires:[]},
      {key:'camera_gap',type:'camera_state_changed',timeIndex:1,text:'Camera mất tín hiệu trong một khoảng ngắn.',location:'phòng camera',actorRoles:['culprit','witness_b'],requires:[]},
      {key:'departure_sighted',type:'departure_partially_observed',timeIndex:2,text:'Nhân chứng B chỉ thấy người đó rời đi sau khi camera hoạt động lại.',location:'cửa phụ',actorRoles:['culprit','witness_b'],requires:['camera_gap']},
      {key:'accounts_compared',type:'partial_accounts_compared',timeIndex:3,text:'Hai nhân chứng so sánh phần thời gian mỗi người quan sát được.',location:'bàn trực',actorRoles:['witness_a','witness_b'],requires:['arrival_sighted','departure_sighted']},
      {key:'buffer_checked',type:'camera_buffer_checked',timeIndex:4,text:'Bản đệm xác nhận chính xác khoảng camera mất tín hiệu.',location:'phòng camera',actorRoles:['witness_a'],requires:['camera_gap','accounts_compared']}
    ],
    evidenceEvents:{E1:'camera_gap',E2:'departure_sighted',E3:'arrival_sighted',E4:'camera_gap',E5:'accounts_compared',E6:'departure_sighted',E7:'arrival_sighted'},
    statementOverrides:{witness_a:{time:'{name} thấy người đó tới sảnh trước khi camera tắt; sau đó không còn quan sát cửa phụ.'}},
    contradictions:[
      {id:'C1',role:'culprit',question:'object',evidenceId:'E4',eventKey:'camera_gap',predicate:'key_received',claimValue:'no',evidenceValue:'yes',source:'signed_key_log',statement:'{name} phủ nhận đã nhận chìa khóa khu hành lang.',evidenceText:'Sổ bàn giao ghi {name} ký nhận chìa khóa khu hành lang trước khoảng camera gián đoạn.'},
      {id:'C2',role:'witness_b',question:'time',evidenceId:'E1',eventKey:'camera_gap',predicate:'camera_status',claimValue:'up',evidenceValue:'down',source:'camera_buffer',statement:'{name} chỉ thấy người đó rời cửa phụ sau khi camera bật lại; họ nhớ camera vẫn sáng trong khoảng gián đoạn.',truthType:'mistaken'}
    ],
    reconstructionPath:['arrival_sighted','camera_gap','departure_sighted','accounts_compared','buffer_checked']
  },
  {
    id:'hidden_relationship', title:'The Unlisted Call', location:'phòng khách', motiveType:'conceal_relationship', culpritRole:'associate', motive:'giữ kín một mối quan hệ', redHerring:'E3', redHerringType:'innocent_suspicious_behavior', falseLeadExplanation:'Dấu chân thuộc nhân viên giao thư đi ngang; chúng không chứng minh người này tham gia cuộc gặp kín.', falseLeadResolution:['E5','E1'], relationshipModel:{type:'concealed_association',roles:['culprit','partner'],eventKeys:['secret_meeting','contact_recorded']}, requiredEvidence:['E1','E4','E5','E7'],
    initialState:'Một cuộc gặp kín và một lời khai giống hệt nhau tạo ra khoảng trống trong danh sách người ra vào.',
    mechanism:'Hai người che giấu mối quan hệ để tạo quyền tiếp cận; dấu liên lạc và lần chứng kiến riêng biệt phá vỡ câu chuyện chung.',
    outcome:'Lời khai phủ nhận liên hệ không khớp nhật ký cuộc gọi; người thứ ba xác nhận lần gặp.',
    events:[
      {key:'secret_meeting',type:'private_meeting',timeIndex:0,text:'Hung thủ gặp riêng người thân cận tại phòng khách.',location:'phòng khách',actorRoles:['culprit','partner'],requires:[]},
      {key:'contact_recorded',type:'unlisted_contact_recorded',timeIndex:1,text:'Cuộc gọi giữa hai người không xuất hiện trong sổ liên lạc nội bộ.',location:'bàn điện thoại',actorRoles:['culprit','partner'],requires:['secret_meeting']},
      {key:'cover_story_agreed',type:'shared_cover_story_agreed',timeIndex:2,text:'Hai người thống nhất phủ nhận đã gặp nhau.',location:'phòng khách',actorRoles:['culprit','partner'],requires:['contact_recorded']},
      {key:'access_requested',type:'access_granted_under_cover',timeIndex:3,text:'Người thân cận dùng lời giải thích đã thống nhất để mở cửa khu phụ.',location:'cửa phụ',actorRoles:['culprit','partner'],requires:['cover_story_agreed']},
      {key:'partial_sighting',type:'third_party_saw_meeting',timeIndex:4,text:'Một nhân viên chỉ thấy người thân cận đi vào, không nghe cuộc trò chuyện.',location:'hành lang',actorRoles:['partner','witness_b'],requires:['access_requested']},
      {key:'relationship_inferred',type:'relationship_evidence_compared',timeIndex:5,text:'Nhật ký liên lạc được ghép với lời chứng về lần gặp.',location:'bàn trực',actorRoles:['witness_a','witness_b'],requires:['contact_recorded','partial_sighting']}
    ],
    evidenceDescriptions:{E7:'Ghi chú nạn nhân nhắc đến một cuộc gặp cần giữ kín, nhưng không ghi tên người tham dự.'},
    evidenceEvents:{E1:'access_requested',E2:'secret_meeting',E3:'partial_sighting',E4:'access_requested',E5:'contact_recorded',E6:'partial_sighting',E7:'secret_meeting'},
    contradictions:[{id:'C1',role:'culprit',question:'person',evidenceId:'E5',eventKey:'contact_recorded',predicate:'contact_with_partner',claimValue:'no',evidenceValue:'yes',source:'unlisted_call_record',statement:'{name} nói mình không có liên hệ riêng với người đi vào cửa phụ.',evidenceText:'Nhật ký cuộc gọi nội bộ ghi một liên lạc chưa khai báo giữa {name} và người thân cận.'}],
    reconstructionPath:['secret_meeting','contact_recorded','cover_story_agreed','access_requested','partial_sighting','relationship_inferred']
  },
  {
    id:'false_motive', title:'The Obvious Debt', location:'thư viện', motiveType:'recover_object', culpritRole:'debtor', motive:'lấy lại một món đồ quan trọng', redHerring:'E3', redHerringType:'false_motive', falseLeadExplanation:'Người tranh cãi có động cơ riêng nhưng sổ trực đặt họ ở thư viện, không phải kho sách hiếm; chìa khóa và hồ sơ mất dẫn đến người khác.', falseLeadResolution:['E4','E2'], requiredEvidence:['E1','E2','E4','E7'],
    initialState:'Một nghi phạm có tranh chấp công khai, trong khi người thực sự lấy món đồ không có động cơ hiển nhiên.',
    mechanism:'Hung thủ tận dụng cuộc tranh chấp để dàn dấu hiệu hướng về người vô tội, rồi lấy món đồ bằng quyền tiếp cận riêng.',
    outcome:'Dấu hiệu động cơ nổi bật thuộc về người không thể thực hiện lần tiếp cận; hồ sơ chìa khóa dẫn đến hung thủ.',
    events:[
      {key:'public_dispute',type:'innocent_motive_exposed',timeIndex:0,text:'Một cuộc tranh cãi công khai khiến nhân viên chú ý đến nghi phạm vô tội.',location:'thư viện',actorRoles:['innocent','witness_a'],requires:[]},
      {key:'culprit_access',type:'culprit_accessed_collection',timeIndex:1,text:'Hung thủ dùng quyền giữ chìa khóa để vào khu sưu tập.',location:'kho sách hiếm',actorRoles:['culprit'],requires:[]},
      {key:'decoy_planted',type:'false_motive_clue_emphasized',timeIndex:2,text:'Một mảnh ghi chú tranh chấp được đặt gần lối vào.',location:'cửa kho',actorRoles:['culprit'],requires:['public_dispute','culprit_access']},
      {key:'object_retrieved',type:'target_object_retrieved',timeIndex:3,text:'Hung thủ lấy món đồ đã nhắm tới trước cuộc tranh cãi.',location:'kho sách hiếm',actorRoles:['culprit'],requires:['culprit_access','decoy_planted']},
      {key:'records_reviewed',type:'independent_access_records_reviewed',timeIndex:4,text:'Nhân chứng đối chiếu quyền tiếp cận với dấu hiệu động cơ công khai.',location:'bàn trực',actorRoles:['witness_b'],requires:['decoy_planted','object_retrieved']}
    ],
    evidenceDescriptions:{E3:'Sổ trực xác nhận {name} có mặt trong cuộc tranh cãi ở thư viện; điều đó không đặt họ trong kho sách hiếm.',E7:'Nạn nhân ghi cần thu hồi một món đồ khỏi kho sách hiếm, nhưng không nêu ai sẽ lấy nó.'},
    falseLeadFact:{evidenceId:'E3',role:'innocent',eventKey:'public_dispute',predicate:'public_dispute_presence',value:'present',source:'signed_witness_log'},
    evidenceEvents:{E1:'records_reviewed',E2:'object_retrieved',E3:'public_dispute',E4:'culprit_access',E5:'records_reviewed',E6:'decoy_planted',E7:'public_dispute'},
    contradictions:[{id:'C1',role:'culprit',question:'object',evidenceId:'E4',eventKey:'culprit_access',predicate:'collection_access',claimValue:'no',evidenceValue:'yes',source:'signed_key_log',statement:'{name} phủ nhận đã vào kho sách hiếm trong ca trực.',evidenceText:'Sổ chìa khóa có chữ ký của {name} cho lần mở kho sách hiếm trong ca trực.'}],
    reconstructionPath:['public_dispute','culprit_access','decoy_planted','object_retrieved','records_reviewed']
  }
];

const event=(key,type,timeIndex,actorRoles,requires,text,location)=>({key,type,timeIndex,actorRoles,requires,text,location});
const contradiction=(id,role,question,evidenceId,eventKey,predicate,claimValue,evidenceValue,source,statement,evidenceText,truthType)=>({id,role,question,evidenceId,eventKey,predicate,claimValue,evidenceValue,source,statement,evidenceText,truthType});
const variant=(variantId,details)=>({variantId,...details});

const VARIANTS = {
  locked_room:[
    variant('maintenance_intermediary',{
      initialState:'Lối bảo trì chỉ được mở khi có yêu cầu của người trực; chìa khóa không phải cách duy nhất để vào phòng.',
      mechanism:'Hung thủ khiến người trực mở lối bảo trì cho một việc tưởng như hợp lệ, rồi lợi dụng chính hành động của người trực để tiếp cận căn phòng.',
      outcome:'Người trực xác nhận đã mở lối nhưng không biết hung thủ đi qua sau đó.',
      events:[
        event('maintenance_requested','authorized_service_requested',0,['culprit','witness_a'],[],'Một yêu cầu sửa chốt được gửi dưới tên ca trực.','bàn trực'),
        event('service_route_opened','service_route_opened_by_staff',1,['witness_a'],['maintenance_requested'],'Người trực mở lối bảo trì theo yêu cầu.','lối bảo trì'),
        event('room_entered','room_entered_through_service_route',2,['culprit'],['service_route_opened'],'Một người đi qua lối vừa mở khi người trực rời hành lang.','phòng làm việc'),
        event('incident','victim_confronted',3,['culprit'],['room_entered'],'Cuộc đối đầu xảy ra bên trong căn phòng.','phòng làm việc'),
        event('route_audited','service_log_audited',4,['witness_b'],['incident','service_route_opened'],'Sổ bảo trì được đối chiếu với thời điểm phát hiện cửa khóa.','bàn trực')
      ],
      evidenceEvents:{E1:'route_audited',E2:'incident',E3:'route_audited',E4:'service_route_opened',E5:'maintenance_requested',E6:'route_audited',E7:'maintenance_requested'},
      contradictions:[contradiction('C1','culprit','person','E5','maintenance_requested','service_request','no','yes','signed_service_request','{name} nói mình không hề yêu cầu mở lối bảo trì.','Phiếu bảo trì mang mã ca của {name} yêu cầu mở lối ngay trước lần tiếp cận.')],
      reconstructionPath:['maintenance_requested','service_route_opened','room_entered','incident','route_audited'],requiredEvidence:['E1','E2','E5','E7'],redHerring:'E6',
      redHerringType:'unrelated_secret',falseLeadExplanation:'Chiếc găng tay thuộc nhân viên bảo trì; lịch sử kho cho thấy nó được dùng trước ca trực.',falseLeadResolution:['E5','E1'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{}
    }),
    variant('sealed_decoy_room',{
      initialState:'Một căn phòng được niêm phong trước khi nạn nhân được chuyển từ phòng kế bên.',
      mechanism:'Hung thủ khóa và niêm phong một căn phòng trống làm mồi, rồi dùng cửa nối để tạo hiện trường trong căn phòng liền kề.',
      outcome:'Niêm phong nguyên vẹn chỉ chứng minh căn phòng mồi không bị mở; nó không chứng minh nạn nhân ở bên trong từ đầu.',
      events:[
        event('decoy_room_sealed','empty_room_sealed',0,['culprit','witness_a'],[],'Một căn phòng được khóa và niêm phong khi còn trống.','phòng phía tây'),
        event('victim_moved','victim_moved_through_connecting_door',1,['culprit'],['decoy_room_sealed'],'Nạn nhân được chuyển qua cửa nối mà không làm rách niêm phong.','cửa nối'),
        event('empty_room_checked','sealed_room_checked',2,['witness_b'],['decoy_room_sealed'],'Nhân viên nhìn thấy niêm phong còn nguyên nhưng không kiểm tra phòng kế bên.','phòng phía tây'),
        event('second_room_accessed','adjacent_room_accessed',3,['culprit'],['victim_moved','empty_room_checked'],'Hung thủ rời khu vực phòng kế bên sau khi chuyển nạn nhân.','phòng làm việc'),
        event('seal_compared','seal_and_floor_marks_compared',4,['witness_a','witness_b'],['second_room_accessed'],'Hai người đối chiếu niêm phong nguyên vẹn với vết bánh xe ở cửa nối.','hành lang')
      ],
      evidenceEvents:{E1:'second_room_accessed',E2:'victim_moved',E3:'seal_compared',E4:'decoy_room_sealed',E5:'empty_room_checked',E6:'seal_compared',E7:'decoy_room_sealed'},
      contradictions:[contradiction('C1','culprit','object','E4','decoy_room_sealed','seal_applied','no','yes','seal_register','{name} phủ nhận đã yêu cầu niêm phong căn phòng phía tây.','Sổ niêm phong ghi {name} là người yêu cầu khóa căn phòng mồi.')],
      reconstructionPath:['decoy_room_sealed','victim_moved','empty_room_checked','second_room_accessed','seal_compared'],requiredEvidence:['E1','E2','E4','E7'],redHerring:'E3',
      redHerringType:'incorrect_witness_assumption',falseLeadExplanation:'Dấu giày cạnh niêm phong thuộc nhân viên kiểm tra; niêm phong nguyên vẹn không xác nhận căn phòng có người bên trong.',falseLeadResolution:['E1','E2'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{}
    })
  ],
  false_alibi:[
    variant('true_but_incomplete',{
      initialState:'Nghi phạm có mặt ở kho lưu trữ ở đầu và cuối khoảng thời gian, nhưng lời khai bỏ trống đoạn giữa.',
      mechanism:'Lời khai không sai về địa điểm đã nêu; hung thủ lợi dụng cách hỏi theo mốc đầu-cuối để giấu một cuộc gặp trung gian.',
      outcome:'Cuộc gọi và dấu bàn giao chứng minh khoảng trống di chuyển dù hai mốc kho lưu trữ đều đúng.',
      events:[
        event('archive_presence','archive_presence_confirmed',0,['culprit','witness_a'],[],'Nhân viên xác nhận nghi phạm có mặt tại kho lúc đầu ca.','kho lưu trữ'),
        event('service_exit','archive_service_exit_used',1,['culprit'],['archive_presence'],'Nghi phạm rời kho qua cửa giao nhận không có sổ khách.','cửa giao nhận'),
        event('intermediary_contact','intermediary_contacted',2,['culprit','partner'],['service_exit'],'Một cuộc gọi ngắn báo cho người trung gian biết vị trí món đồ.','quầy điện thoại'),
        event('archive_return','archive_return_confirmed',3,['culprit','witness_b'],['intermediary_contact'],'Nghi phạm quay lại kho trước lần kiểm tra cuối.','kho lưu trữ'),
        event('route_gap_compared','route_and_call_times_compared',4,['witness_a','witness_b'],['archive_presence','archive_return'],'Sổ kho được ghép với nhật ký cuộc gọi và cửa giao nhận.','bàn trực')
      ],
      evidenceEvents:{E1:'service_exit',E2:'archive_return',E3:'service_exit',E4:'archive_presence',E5:'intermediary_contact',E6:'route_gap_compared',E7:'archive_presence'},
      contradictions:[contradiction('C1','culprit','person','E5','intermediary_contact','contact_with_intermediary','no','yes','phone_metadata','{name} nói mình không liên lạc với người trung gian trong ca trực.','Nhật ký nhà mạng ghi cuộc gọi từ máy được cấp cho {name} tới người trung gian.')],
      reconstructionPath:['archive_presence','service_exit','intermediary_contact','archive_return','route_gap_compared'],requiredEvidence:['E1','E4','E5','E7'],redHerring:'E3',
      redHerringType:'innocent_suspicious_behavior',falseLeadExplanation:'Dấu giày ở cửa giao nhận thuộc nhân viên vận chuyển đã ký sổ; chúng không xác định ai dùng cửa sau đó.',falseLeadResolution:['E4','E5'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{}
    }),
    variant('borrowed_badge',{
      initialState:'Nhật ký cho thấy thẻ của một nhân viên được quẹt tại cửa, nhưng camera chỉ ghi được bóng người.',
      mechanism:'Hung thủ đưa thẻ cho người trung gian để tạo lượt vào giả, rồi tự dùng lối phụ không gắn thẻ.',
      outcome:'Lượt quẹt thẻ là có thật nhưng không chứng minh chủ thẻ là người đã vào.',
      events:[
        event('badge_borrowed','access_badge_borrowed',0,['culprit','innocent'],[],'Thẻ của một nhân viên được mượn với lý do kiểm tra cửa.','bàn bảo vệ'),
        event('badge_entry','borrowed_badge_used',1,['innocent'],['badge_borrowed'],'Thẻ được quẹt tại cửa chính khi chủ thẻ đang ở nơi khác.','cửa chính'),
        event('side_entry','unlogged_side_entry',2,['culprit'],['badge_borrowed'],'Hung thủ vào bằng cửa phụ không nối với bộ đọc thẻ.','cửa phụ'),
        event('records_confused','badge_record_misread',3,['witness_a'],['badge_entry','side_entry'],'Người trực ghép lượt quẹt thẻ với bóng người ở cửa phụ.','phòng bảo vệ'),
        event('identity_checked','badge_owner_location_checked',4,['witness_b','innocent'],['records_confused'],'Vị trí chủ thẻ được kiểm tra độc lập với hình bóng camera.','bàn trực')
      ],
      evidenceEvents:{E1:'side_entry',E2:'identity_checked',E3:'badge_entry',E4:'badge_entry',E5:'records_confused',E6:'identity_checked',E7:'badge_borrowed'},
      contradictions:[contradiction('C1','culprit','time','E1','side_entry','culprit_at_side_entry','no','yes','side_door_sensor','{name} phủ nhận đã dùng cửa phụ trong khoảng mất dấu.','Cảm biến độc lập ghi nhận cửa phụ mở khi {name} có mặt tại khu vực.')],
      reconstructionPath:['badge_borrowed','badge_entry','side_entry','records_confused','identity_checked'],requiredEvidence:['E1','E4','E5','E7'],redHerring:'E6',
      redHerringType:'innocent_suspicious_behavior',falseLeadExplanation:'Găng tay thuộc chủ thẻ mượn và được dùng khi sửa khóa trước đó; lượt quẹt thẻ không xác định người ở cửa phụ.',falseLeadResolution:['E2','E5'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{}
    })
  ],
  staged_scene:[
    variant('marker_precedes_incident',{
      initialState:'Một mốc thời gian giả xuất hiện trước sự cố thật, không phải sau nó.',
      mechanism:'Hung thủ đặt lại đồng hồ trước sự cố để khiến các nhân chứng ghi nhớ một trình tự ngược.',
      outcome:'Dấu va đập mới hơn lớp bụi dưới mặt đồng hồ chứng minh mốc giả được tạo trước khi sự cố xảy ra.',
      events:[
        event('watch_reset','clock_marker_reset',0,['culprit'],[],'Đồng hồ được đặt về một mốc sớm hơn.', 'bàn điều khiển'),
        event('incident','real_incident',1,['culprit'],[],'Sự cố thật xảy ra sau khi mốc đồng hồ đã bị chỉnh.','phòng thu'),
        event('dust_layered','dust_layer_disturbed',2,['culprit'],['watch_reset'],'Bụi dưới chân đồng hồ bị xáo trộn khi vật được đặt lại.','bàn điều khiển'),
        event('witness_time_recorded','witness_time_recorded',3,['witness_a'],['incident'],'Nhân chứng ghi giờ theo chiếc đồng hồ đang hiển thị.','phòng thu'),
        event('layers_compared','dust_and_impact_compared',4,['witness_b'],['dust_layered','witness_time_recorded'],'Dấu bụi được so với vết va đập mới trên đồng hồ.','bàn điều khiển')
      ],
      evidenceEvents:{E1:'witness_time_recorded',E2:'watch_reset',E3:'layers_compared',E4:'watch_reset',E5:'witness_time_recorded',E6:'dust_layered',E7:'incident'},
      contradictions:[contradiction('C1','culprit','time','E2','watch_reset','clock_reset_before_incident','no','yes','clock_gear_trace','{name} nói đồng hồ chỉ dừng sau sự cố.','Vết bánh răng cho thấy {name} đã chỉnh đồng hồ trước mốc sự cố được nhân chứng ghi.')],
      reconstructionPath:['watch_reset','incident','dust_layered','witness_time_recorded','layers_compared'],requiredEvidence:['E1','E2','E6','E7'],redHerring:'E3',
      redHerringType:'incorrect_witness_assumption',falseLeadExplanation:'Dấu chân được tạo khi nhân chứng quay lại kiểm tra sau sự cố; chúng không xác định ai chỉnh đồng hồ trước đó.',falseLeadResolution:['E2','E6'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{}
    }),
    variant('digital_log_staged',{
      initialState:'Hiện trường vật lý không bị dàn lại; chỉ đồng hồ và bản ghi điện tử lệch nhau.',
      mechanism:'Hung thủ sửa mốc trong máy ghi để tạo alibi theo dữ liệu hệ thống, trong khi đồng hồ độc lập giữ giờ thật.',
      outcome:'Hai thiết bị cùng ghi một sự kiện theo hai giờ khác nhau; nhật ký chỉnh sửa nối sai lệch với tài khoản hung thủ.',
      events:[
        event('incident','real_incident',0,['culprit'],[],'Sự cố xảy ra khi đồng hồ cơ vẫn chạy đúng.','phòng thu'),
        event('system_time_changed','digital_clock_changed',1,['culprit'],['incident'],'Mốc giờ trong máy ghi bị lùi lại sau sự cố.','phòng camera'),
        event('mechanical_time_kept','mechanical_clock_observed',2,['witness_a'],['incident'],'Nhân chứng ghi lại giờ từ đồng hồ cơ độc lập.','phòng thu'),
        event('device_logs_compared','independent_clocks_compared',3,['witness_a','witness_b'],['system_time_changed','mechanical_time_kept'],'Hai mốc giờ được đối chiếu với nhật ký tài khoản.','phòng camera'),
        event('account_change_verified','account_change_verified',4,['witness_b'],['device_logs_compared'],'Lịch sử đăng nhập xác định ai sửa máy ghi.','bàn trực')
      ],
      evidenceEvents:{E1:'system_time_changed',E2:'mechanical_time_kept',E3:'account_change_verified',E4:'account_change_verified',E5:'system_time_changed',E6:'account_change_verified',E7:'incident'},
      contradictions:[contradiction('C1','culprit','time','E5','system_time_changed','system_time_after_incident','before','after','device_audit_log','{name} khẳng định bản ghi giờ không bị chỉnh sau sự cố.','Nhật ký thiết bị xác nhận tài khoản của {name} đã đổi giờ sau khi sự cố xảy ra.')],
      reconstructionPath:['incident','system_time_changed','mechanical_time_kept','device_logs_compared','account_change_verified'],requiredEvidence:['E1','E2','E5','E7'],redHerring:'E6',
      redHerringType:'unrelated_secret',falseLeadExplanation:'Găng tay có bụi đạo cụ thuộc người kiểm tra thiết bị; nó không liên quan thao tác chỉnh đồng hồ điện tử.',falseLeadResolution:['E2','E5'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{}
    })
  ],
  missing_object:[
    variant('authorized_handoff',{
      initialState:'Món đồ rời khỏi tủ qua một lần bàn giao hợp lệ mà người nhận không biết yêu cầu đã bị thao túng.',
      mechanism:'Hung thủ dùng một trung gian vô tình chuyển món đồ, rồi sửa phiếu yêu cầu để biến việc bàn giao thành mất cắp không dấu vết.',
      outcome:'Người trung gian thực sự cầm món đồ nhưng chỉ làm theo lệnh; dấu yêu cầu ban đầu nối quyết định với hung thủ.',
      events:[
        event('handoff_requested','authorized_handoff_requested',0,['culprit','witness_a'],[],'Một phiếu chuyển hồ sơ được tạo dưới lý do kiểm tra.','bàn trực'),
        event('handoff_completed','assistant_handoff_completed',1,['innocent'],['handoff_requested'],'Nhân viên trung gian chuyển hồ sơ đến phòng kiểm tra.','phòng kiểm tra'),
        event('request_erased','handoff_request_erased',2,['culprit'],['handoff_requested'],'Bản yêu cầu gốc bị xóa khỏi tập hồ sơ.','bàn trực'),
        event('object_hidden','object_hidden_by_culprit',3,['culprit'],['handoff_completed'],'Hung thủ lấy lại hồ sơ sau khi trung gian rời đi.','phòng kiểm tra'),
        event('handoff_reconciled','handoff_receipts_reconciled',4,['witness_b','innocent'],['request_erased','object_hidden'],'Hai bản biên nhận được đối chiếu để tìm người ra lệnh.','phòng hồ sơ')
      ],
      evidenceEvents:{E1:'request_erased',E2:'object_hidden',E3:'handoff_completed',E4:'handoff_requested',E5:'handoff_requested',E6:'handoff_reconciled',E7:'handoff_requested'},
      contradictions:[contradiction('C1','culprit','person','E5','handoff_requested','handoff_ordered','no','yes','signed_transfer_request','{name} nói mình không yêu cầu chuyển món hồ sơ.', 'Phiếu chuyển có chữ ký của {name} và tên nhân viên trung gian nhận lệnh.')],
      reconstructionPath:['handoff_requested','handoff_completed','request_erased','object_hidden','handoff_reconciled'],requiredEvidence:['E1','E2','E5','E7'],redHerring:'E6',
      redHerringType:'genuine_innocent_lie',falseLeadExplanation:'Người trung gian phủ nhận nhớ đã nhận lệnh vì sợ bị kỷ luật; hai biên nhận cho thấy họ chỉ làm theo phiếu.',falseLeadResolution:['E5','E1'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{}
    }),
    variant('decoy_replacement',{
      initialState:'Tủ vẫn chứa một vật có hình dạng giống món đồ được kiểm kê, nhưng số hiệu không khớp.',
      mechanism:'Hung thủ đặt một bản sao vào tủ trước khi lấy bản gốc, khiến lần kiểm tra sơ bộ báo món đồ vẫn còn.',
      outcome:'Số hiệu trên bản sao và dấu tháo niêm phong cho thấy món đồ gốc đã bị đổi chỗ.',
      events:[
        event('inventory_recorded','object_inventory_recorded',0,['witness_a'],[],'Số hiệu món đồ gốc được ghi trong sổ kiểm kê.','phòng hồ sơ'),
        event('replica_inserted','replica_inserted',1,['culprit'],['inventory_recorded'],'Một bản sao được đặt vào vị trí của món đồ gốc.','tủ hồ sơ'),
        event('original_removed','original_removed',2,['culprit'],['replica_inserted'],'Món đồ thật được đưa ra khỏi tủ.','tủ hồ sơ'),
        event('surface_check_passed','surface_check_passed',3,['witness_b'],['replica_inserted'],'Kiểm tra hình dạng sơ bộ không phát hiện việc tráo đổi.','phòng hồ sơ'),
        event('serial_checked','serial_number_checked',4,['witness_a','witness_b'],['original_removed','surface_check_passed'],'Số hiệu và niêm phong được kiểm tra đầy đủ.','bàn trực')
      ],
      evidenceEvents:{E1:'surface_check_passed',E2:'original_removed',E3:'surface_check_passed',E4:'original_removed',E5:'inventory_recorded',E6:'serial_checked',E7:'inventory_recorded'},
      evidenceNames:{E4:'Cabinet Access Record'},
      contradictions:[contradiction('C1','culprit','object','E4','original_removed','archive_access','no','yes','signed_access_log','{name} khẳng định mình không mở tủ trong ca trực.','Sổ khóa ghi {name} mở tủ đúng lúc món đồ gốc bị lấy.')],
      reconstructionPath:['inventory_recorded','replica_inserted','original_removed','surface_check_passed','serial_checked'],requiredEvidence:['E2','E4','E5','E7'],redHerring:'E3',
      redHerringType:'innocent_suspicious_behavior',falseLeadExplanation:'Dấu giày gần tủ thuộc người kiểm kê đầu ca; số hiệu cho thấy họ ghi đúng món đồ gốc trước khi tráo đổi.',falseLeadResolution:['E5','E4'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{}
    })
  ],
  conflicting_witnesses:[
    variant('relay_handoff',{
      initialState:'Mỗi nhân chứng chỉ thấy một đoạn của quá trình chuyển phong bì qua hai người.',
      mechanism:'Hung thủ dùng một lần chuyển tay trung gian để khiến lời khai về người giữ phong bì có vẻ bất khả thi.',
      outcome:'Biên nhận có dấu thời gian nối hai lần quan sát mà không yêu cầu nhân chứng nào thấy toàn bộ sự việc.',
      events:[
        event('first_handoff','first_handoff_observed',0,['culprit','witness_a'],[],'Nhân chứng A thấy hung thủ đưa phong bì cho nhân viên trung gian.','sảnh đông'),
        event('relay_handoff','relay_handoff_observed',1,['innocent','witness_b'],['first_handoff'],'Nhân chứng B thấy trung gian chuyển phong bì cho người nhận.','cửa phụ'),
        event('relay_call','relay_call_recorded',2,['culprit','innocent'],['first_handoff'],'Một cuộc gọi ngắn xác nhận thời điểm chuyển tay thứ nhất.','bàn điện thoại'),
        event('receipts_compared','handoff_receipts_compared',3,['witness_a','witness_b'],['relay_handoff','relay_call'],'Hai nhân chứng so thời điểm họ nhìn thấy với cuộc gọi.','bàn trực'),
        event('envelope_seal_checked','envelope_seal_checked',4,['witness_b'],['receipts_compared'],'Dấu niêm phong xác nhận phong bì không bị đổi trong đoạn trung gian.','phòng kiểm tra')
      ],
      evidenceEvents:{E1:'envelope_seal_checked',E2:'relay_handoff',E3:'first_handoff',E4:'first_handoff',E5:'relay_call',E6:'envelope_seal_checked',E7:'first_handoff'},
      contradictions:[contradiction('C1','culprit','person','E5','relay_call','relay_call_authorized','no','yes','call_metadata','{name} nói không biết người trung gian chuyển phong bì.', 'Cuộc gọi từ máy của {name} xác nhận lần chuyển tay đầu tiên.')],
      reconstructionPath:['first_handoff','relay_handoff','relay_call','receipts_compared','envelope_seal_checked'],requiredEvidence:['E1','E4','E5','E7'],redHerring:'E6',
      redHerringType:'unrelated_secret',falseLeadExplanation:'Găng tay thuộc nhân viên phòng kiểm tra và được dùng để giữ phong bì niêm phong; nó không cho biết ai ra lệnh chuyển.',falseLeadResolution:['E5','E1'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{witness_a:{time:'{name} chỉ thấy lần chuyển tay đầu; họ không thể nhận diện người nhận ở cửa phụ.'},witness_b:{person:'{name} chỉ thấy người trung gian trao phong bì; họ không nghe cuộc gọi trước đó.'}}
    }),
    variant('bell_time_memory',{
      initialState:'Hai nhân chứng nhớ thứ tự tiếng chuông và lần ra vào khác nhau vì mỗi người chỉ nghe được một phần.',
      mechanism:'Hung thủ tận dụng khoảng trễ âm thanh giữa sảnh và hành lang để làm lời khai có vẻ xung đột.',
      outcome:'Bộ ghi chuông độc lập cho thấy hai ký ức đều đúng nhưng nói về hai thời điểm khác nhau.',
      events:[
        event('bell_rang_lobby','lobby_bell_rang',0,['witness_a'],[],'Chuông sảnh vang lên khi nhân chứng A đang ở cửa chính.','sảnh'),
        event('culprit_entered','culprit_entered_after_bell',1,['culprit','witness_a'],['bell_rang_lobby'],'Hung thủ đi vào sau tiếng chuông ở sảnh.','cửa chính'),
        event('bell_rang_hall','hall_bell_rang_later',2,['witness_b'],[],'Chuông hành lang vang muộn hơn do đường truyền âm thanh.','hành lang'),
        event('culprit_exited','culprit_exited_after_hall_bell',3,['culprit','witness_b'],['bell_rang_hall'],'Nhân chứng B thấy hung thủ rời khu vực sau tiếng chuông thứ hai.','cửa phụ'),
        event('bell_log_compared','independent_bell_log_compared',4,['witness_a','witness_b'],['culprit_entered','culprit_exited'],'Bản ghi chuông cho thấy hai mốc cách nhau vài phút.','bàn trực')
      ],
      evidenceEvents:{E1:'bell_log_compared',E2:'culprit_exited',E3:'culprit_entered',E4:'culprit_entered',E5:'bell_log_compared',E6:'culprit_exited',E7:'bell_rang_lobby'},
      contradictions:[contradiction('C1','culprit','time','E5','bell_log_compared','entry_after_first_bell','before','after','bell_controller_log','{name} khai đã rời đi trước tiếng chuông sảnh.', 'Bộ điều khiển ghi lượt ra vào của {name} sau tiếng chuông sảnh và trước tiếng chuông hành lang.')],
      reconstructionPath:['bell_rang_lobby','culprit_entered','bell_rang_hall','culprit_exited','bell_log_compared'],requiredEvidence:['E1','E4','E5','E7'],redHerring:'E3',
      redHerringType:'incorrect_witness_assumption',falseLeadExplanation:'Nhân chứng A nhầm tiếng chuông sảnh với tiếng chuông hành lang; bộ ghi âm xác nhận hai mốc khác nhau.',falseLeadResolution:['E1','E5'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{witness_a:{time:'{name} nhớ chuông sảnh vang trước khi thấy người đi vào.'},witness_b:{time:'{name} chỉ nhớ chuông hành lang vang trước khi thấy người rời đi.'}}
    })
  ],
  hidden_relationship:[
    variant('intermediary_messages',{
      initialState:'Hai người không gặp trực tiếp; một nhân viên chuyển tin và mở cửa theo yêu cầu tưởng như công việc.',
      mechanism:'Hung thủ dùng người trung gian để che mối liên hệ với người có quyền mở cửa, rồi xóa phần giao tiếp trực tiếp.',
      outcome:'Dấu liên lạc vòng qua trung gian nhưng cùng dẫn tới một quyền truy cập chỉ hai người biết.',
      events:[
        event('message_sent','coded_message_sent',0,['culprit'],[],'Hung thủ gửi một tin nhắn mã hóa về cửa phụ.','bàn điện thoại'),
        event('message_relayed','message_relayed_by_staff',1,['innocent'],['message_sent'],'Nhân viên trung gian chuyển lời nhắn mà không biết nội dung đầy đủ.','quầy trực'),
        event('partner_accessed','partner_accessed_door',2,['partner'],['message_relayed'],'Người thân cận mở cửa theo dấu hiệu đã thống nhất.','cửa phụ'),
        event('culprit_entered','culprit_entered_after_relay',3,['culprit'],['partner_accessed'],'Hung thủ vào sau khi cửa được mở.','phòng phụ'),
        event('relay_audited','relay_and_access_audited',4,['witness_a','witness_b'],['message_sent','culprit_entered'],'Nhật ký tin nhắn và quyền mở cửa được đối chiếu.','bàn trực')
      ],
      evidenceEvents:{E1:'culprit_entered',E2:'partner_accessed',E3:'message_relayed',E4:'partner_accessed',E5:'message_sent',E6:'relay_audited',E7:'message_sent'},
      contradictions:[contradiction('C1','culprit','person','E5','message_sent','contact_with_partner','no','yes','message_gateway_log','{name} phủ nhận đã gửi tin cho người có quyền mở cửa.', 'Cổng tin nhắn ghi mã thiết bị của {name} gửi tín hiệu tới người mở cửa.')],
      reconstructionPath:['message_sent','message_relayed','partner_accessed','culprit_entered','relay_audited'],requiredEvidence:['E1','E4','E5','E7'],redHerring:'E6',
      redHerringType:'genuine_innocent_lie',falseLeadExplanation:'Nhân viên trung gian nói không biết người gửi vì sợ bị liên lụy; nhật ký chỉ cho thấy họ chuyển một tín hiệu không rõ nội dung.',falseLeadResolution:['E5','E1'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{},
      relationshipModel:{type:'concealed_association_via_intermediary',roles:['culprit','partner'],eventKeys:['message_sent','partner_accessed']}
    }),
    variant('shared_account',{
      initialState:'Một tài khoản liên hệ khẩn cấp và một chìa khóa dự phòng cùng được dùng bởi hai người khai rằng họ không quen nhau.',
      mechanism:'Hung thủ dựa vào quan hệ tài chính kín để mượn quyền tiếp cận, sau đó phủ nhận người đồng phạm dân sự đã mở cửa.',
      outcome:'Hồ sơ tài khoản và chìa khóa độc lập cùng nối hai người với cùng một lần vào khu vực.',
      events:[
        event('shared_account_used','shared_account_contact_used',0,['culprit','partner'],[],'Một tài khoản chung được dùng để xác nhận yêu cầu mở cửa.','bàn điện thoại'),
        event('partner_requested_access','partner_requested_access',1,['partner'],['shared_account_used'],'Người thân cận yêu cầu mở cửa bằng thông tin tài khoản.','bàn trực'),
        event('door_opened','door_opened_for_partner',2,['partner','witness_a'],['partner_requested_access'],'Nhân viên mở cửa theo quyền được xác nhận.','cửa phụ'),
        event('culprit_retrieved_item','culprit_retrieved_item',3,['culprit'],['door_opened'],'Hung thủ vào khu phụ sau khi cửa đã được mở.','kho hồ sơ'),
        event('account_and_key_compared','account_and_key_records_compared',4,['witness_a','witness_b'],['shared_account_used','culprit_retrieved_item'],'Tài khoản và sổ chìa khóa được ghép theo thời gian.','bàn trực')
      ],
      evidenceEvents:{E1:'culprit_retrieved_item',E2:'culprit_retrieved_item',E3:'door_opened',E4:'door_opened',E5:'shared_account_used',E6:'account_and_key_compared',E7:'shared_account_used'},
      contradictions:[contradiction('C1','culprit','person','E5','shared_account_used','shared_contact','no','yes','shared_account_audit','{name} nói không có tài khoản liên hệ chung với người mở cửa.', 'Bản kiểm toán cho thấy tài khoản dùng để gọi cửa được đăng ký cho {name} và người thân cận.')],
      reconstructionPath:['shared_account_used','partner_requested_access','door_opened','culprit_retrieved_item','account_and_key_compared'],requiredEvidence:['E1','E4','E5','E7'],redHerring:'E3',
      redHerringType:'innocent_suspicious_behavior',falseLeadExplanation:'Dấu chân của người mở cửa là thật nhưng họ chỉ làm theo tài khoản được xác thực; quyền lợi chung mới nối họ với hung thủ.',falseLeadResolution:['E5','E6'],falseLeadFact:null,evidenceDescriptions:{},statementOverrides:{},
      relationshipModel:{type:'concealed_shared_account',roles:['culprit','partner'],eventKeys:['shared_account_used','partner_requested_access']}
    })
  ],
  false_motive:[
    variant('real_debt_decoy',{
      initialState:'Một khoản nợ có thật khiến nghi phạm vô tội trông có động cơ, nhưng dấu vết đặt họ ở nơi khác khi món đồ biến mất.',
      mechanism:'Hung thủ dùng bí mật nợ nần có thật của người khác làm hướng nghi ngờ trong khi tự lấy món đồ bằng chìa khóa được cấp.',
      outcome:'Motive của người bị nghi là có thật nhưng không tạo cơ hội; sổ ra vào chỉ ra ai có mặt tại kho.',
      events:[
        event('debt_secret_exposed','innocent_debt_secret_exposed',0,['innocent','witness_a'],[],'Một khoản nợ riêng của nhân viên bị tiết lộ trong tranh cãi.','sảnh'),
        event('culprit_entered','culprit_entered_collection',1,['culprit'],[],'Hung thủ dùng chìa khóa được cấp để vào kho.','kho sách hiếm'),
        event('object_removed','collection_object_removed',2,['culprit'],['culprit_entered'],'Món đồ được lấy khỏi kệ.','kho sách hiếm'),
        event('innocent_location_verified','innocent_location_verified',3,['innocent','witness_b'],['debt_secret_exposed'],'Nhân chứng xác nhận người mắc nợ đang ở quầy công khai.','sảnh'),
        event('motive_and_access_compared','motive_and_access_compared',4,['witness_a','witness_b'],['object_removed','innocent_location_verified'],'Động cơ và cơ hội được so sánh riêng biệt.','bàn trực')
      ],
      evidenceEvents:{E1:'culprit_entered',E2:'object_removed',E3:'debt_secret_exposed',E4:'culprit_entered',E5:'innocent_location_verified',E6:'motive_and_access_compared',E7:'debt_secret_exposed'},
      contradictions:[contradiction('C1','culprit','object','E4','culprit_entered','collection_access','no','yes','key_entry_log','{name} phủ nhận đã dùng chìa khóa vào kho sách hiếm.', 'Sổ chìa khóa ghi {name} mở kho trong lúc người mắc nợ được xác nhận ở sảnh.')],
      reconstructionPath:['debt_secret_exposed','culprit_entered','object_removed','innocent_location_verified','motive_and_access_compared'],requiredEvidence:['E1','E2','E4','E7'],redHerring:'E3',
      redHerringType:'unrelated_secret',falseLeadExplanation:'Khoản nợ là thật nhưng nhật ký vị trí chứng minh người đó không có cơ hội; động cơ không thay thế được bằng chứng tiếp cận.',falseLeadResolution:['E1','E5'],falseLeadFact:{evidenceId:'E3',role:'innocent',eventKey:'debt_secret_exposed',predicate:'debt_dispute_present',value:'yes',source:'witnessed_conversation'},evidenceDescriptions:{E3:'Biên bản xác nhận {name} có tranh cãi về khoản nợ, nhưng không đặt họ tại kho sách hiếm.'},statementOverrides:{}
    }),
    variant('motive_note_planted',{
      initialState:'Một ghi chú nợ xuất hiện cạnh tủ ngay sau khi món đồ biến mất; mực và vị trí ghi chú không cùng thời điểm.',
      mechanism:'Hung thủ dùng một khoản nợ cũ của người vô tội, bổ sung dấu mực mới rồi đặt ghi chú cạnh tủ để biến động cơ cũ thành bằng chứng giả.',
      outcome:'Nội dung nợ là thật nhưng dấu bổ sung và quyền tiếp cận thuộc về hung thủ.',
      events:[
        event('old_debt_note_found','old_debt_note_found',0,['innocent','witness_a'],[],'Ghi chú nợ cũ được tìm trong hồ sơ cá nhân của nhân viên.','bàn hồ sơ'),
        event('collection_opened','collection_opened_by_culprit',1,['culprit'],[],'Hung thủ mở tủ bằng chìa khóa ca trực.','kho sách hiếm'),
        event('note_annotated','debt_note_annotated',2,['culprit'],['old_debt_note_found','collection_opened'],'Một dòng mực mới được thêm vào ghi chú cũ.','bàn hồ sơ'),
        event('object_removed','object_removed_during_staging',3,['culprit'],['note_annotated'],'Món đồ bị lấy khi ghi chú được đặt gần tủ.','kho sách hiếm'),
        event('ink_and_access_examined','ink_and_access_records_examined',4,['witness_b'],['note_annotated','object_removed'],'Mực, sổ chìa khóa và thời điểm mất đồ được đối chiếu.','bàn trực')
      ],
      evidenceEvents:{E1:'ink_and_access_examined',E2:'object_removed',E3:'old_debt_note_found',E4:'collection_opened',E5:'ink_and_access_examined',E6:'note_annotated',E7:'old_debt_note_found'},
      contradictions:[contradiction('C1','culprit','object','E4','collection_opened','collection_access','no','yes','key_entry_log','{name} nói mình không mở tủ trong ca trực.', 'Sổ chìa khóa ghi lượt mở của {name} trước khi dòng mực mới xuất hiện.')],
      reconstructionPath:['old_debt_note_found','collection_opened','note_annotated','object_removed','ink_and_access_examined'],requiredEvidence:['E1','E2','E4','E7'],redHerring:'E3',
      redHerringType:'false_motive',falseLeadExplanation:'Khoản nợ trên ghi chú là thật nhưng dòng liên hệ với món đồ được viết sau khi hung thủ mở tủ; ghi chú cũ không chứng minh người mắc nợ đã vào kho.',falseLeadFact:{evidenceId:'E3',role:'innocent',eventKey:'old_debt_note_found',predicate:'old_debt_exists',value:'yes',source:'personal_ledger'},evidenceDescriptions:{E3:'Sổ cá nhân xác nhận {name} từng nợ tiền; nó không ghi khoản nợ liên quan món đồ bị mất.'},statementOverrides:{}
    })
  ]
};

for(const archetype of ARCHETYPES)archetype.variants=VARIANTS[archetype.id]||[];

ARCHETYPES.resolveVariant=(archetypeId,variantId='base')=>{
  const base=ARCHETYPES.find(item=>item.id===archetypeId);
  if(!base)return null;
  if(variantId==='base')return {...base,variantId:'base'};
  const selected=base.variants.find(item=>item.variantId===variantId);
  return selected?{...base,...selected,variantId:selected.variantId}:null;
};

module.exports = ARCHETYPES;
