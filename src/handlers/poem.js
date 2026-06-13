// src/handlers/poem.js
const { EmbedBuilder } = require('discord.js');

// =========================================================
// KHO TÀNG TÁC PHẨM VĂN HỌC & THƠ CA KINH ĐIỂN
// =========================================================

const POEM_DATABASE = [
    { title: "Tràng Giang", author: "Huy Cận", content: "Sóng gợn tràng giang buồn điệp điệp,\nCon thuyền xuôi mái nước song song.\nThuyền về nước lại, sầu trăm ngả;\nCủi một cành khô lạc mấy dòng." },
    { title: "Đây Thôn Vĩ Dạ", author: "Hàn Mặc Tử", content: "Sao anh không về chơi thôn Vĩ?\nNhìn nắng hàng cau nắng mới lên.\nVườn ai mướt quá xanh như ngọc\nLá trúc che ngang mặt chữ điền." },
    { title: "Tương Tư", author: "Nguyễn Bính", content: "Thôn Đoài ngồi nhớ thôn Đông,\nMột người chín nhớ mười mong một người.\nGió mưa là bệnh của giời,\nTương tư là bệnh của tôi yêu nàng." },
    { title: "Tây Tiến", author: "Quang Dũng", content: "Tây Tiến đoàn binh không mọc tóc,\nQuân xanh màu lá dữ oai hùm.\nMắt trừng gửi mộng qua biên giới,\nĐêm mơ Hà Nội dáng kiều thơm." },
    { title: "Tiếng Thu", author: "Lưu Trọng Lư", content: "Em không nghe mùa thu\nDưới trăng mờ thổn thức?\nEm không nghe rạo rực\nHình ảnh kẻ chinh phu\nTrong lòng người cô phụ?" },
    { title: "Vội Vàng", author: "Xuân Diệu", content: "Tôi muốn tắt nắng đi\nCho màu đừng nhạt mất;\nTôi muốn buộc gió lại\nCho hương đừng bay đi.\nCủa ong bướm này đây tuần tháng mật;\nNày đây hoa của đồng nội xanh rì." },
    { title: "Chùa Hương", author: "Nguyễn Nhược Pháp", content: "Hôm nay đi chùa Hương\nHoa cỏ mờ trong sương\nCùng thầy me em dậy\nEm vấn đầu soi gương." },
    { title: "Ngậm Ngùi", author: "Huy Cận", content: "Tay vịn cây cỏ, chân đạp sương mờ,\nTóc liễu buông dài, ý tình lửng lơ.\nThôi trông chi nữa, bóng người xa xoôi,\nNghe tiếng thời gian gõ nhịp đơn côi." },
    { title: "Tiếng Đàn Mưa", author: "Bích Khê", content: "Mưa đổ bụi êm êm trên bến vắng,\nĐò lười nằm nghe nước chảy xuôi dòng.\nLòng ta như chiếc thuyền nan trống,\nChở cả mùa thu lạnh buốt lòng." },
    { title: "Quê Hương", author: "Tế Hanh", content: "Chim bay dọc biển đem tin cá,\nLàng tôi nghe gió thổi bến sông.\nCánh buồm giương to như mảnh hồn làng,\nRướn thân trắng bao la thâu góp gió." },
    { title: "Màu Tím Hoa Sim", author: "Hữu Thắng", content: "Nàng có ba người anh đi bộ đội\nNhững đứa em nàng có đứa chưa biết nói\nTóc nàng hãy còn xanh...\nTôi người vệ quốc quân xa xôi\nYêu nàng như tình yêu đồng chí." },
    { title: "Gió Đầu Mùa", author: "Thạch Lam", content: "Sáng hôm nay lạnh lắm rồi anh ơi\nCây bàng rụng lá góc sân chơi\nThương người áo rách bên sông vắng\nGió lạnh lùng qua buốt khoảng trời." },
    { title: "Đất Nước", author: "Nguyễn Khoa Điềm", content: "Khi ta lớn lên Đất Nước đã có rồi\nĐất Nước có trong những cái 'ngày xửa ngày xưa...'\nĐất Nước bắt đầu với miếng trầu bây giờ ngoại ăn\nĐất Nước lớn lên khi dân mình biết trồng tre mà đánh giặc." },
    { title: "Tre Việt Nam", author: "Nguyễn Duy", content: "Tre xanh\nXanh tự bao giờ?\nChuyện ngày xưa đã có bờ tre xanh\nThân gầy guộc, lá mong manh\nMà sao nên lũy nên thành tre ơi?" }
];

// KHO THƠ "LỐP DỰ PHÒNG" ĐẶC BIỆT KHI ANH EM GÕ !LỐP
const SPARE_TIRE_POEMS = [
    { title: "Qua Đèo Ngang", author: "Bà Huyện Thanh Quan", content: "Bước tới Đèo Ngang, bóng xế tà,\nCỏ cây chen đá, lá chen hoa.\nLom khom dưới núi, tiều vài chú,\nLác đác bên sông, chợ mấy nhà." },
    { title: "Bánh Trôi Nước", author: "Hồ Xuân Hương", content: "Thân em vừa trắng lại vừa tròn\nBảy nổi ba chìm với nước non\nRắn nát mặc dầu tay kẻ nặn\nMà em vẫn giữ tấm lòng son." },
    { title: "Tự Tình II", author: "Hồ Xuân Hương", content: "Đêm khuya văng vẳng trống canh dồn,\nTrơ cái hồng nhan với nước non.\nChén rượu hương đưa say lại tỉnh,\nVầng trăng bóng xế khuyết chưa tròn." },
    { title: "Ông Đồ", author: "Vũ Đình Liên", content: "Mỗi năm hoa đào nở\nLại thấy ông đồ già\nBày mực tàu giấy đỏ\nBên phố đông người qua." },
    { title: "Thu Điếu", author: "Nguyễn Khuyến", content: "Ao thu lạnh lẽo nước trong veo,\nMột chiếc thuyền câu bé tẻo teo.\nSóng biếc theo làn hơi gợn tí,\nLá vàng trước gió khẽ đưa vèo." }
];

const SAD_QUOTES = [
    "“Chao ôi! Đối với những người ở quanh ta, nếu ta không chú ý mà hiểu họ, thì ta chỉ thấy họ gàn dở, ngu ngốc, bần tiện, xấu xa, lý mạt... toàn những cớ để cho ta tàn nhẫn; không bao giờ ta thấy họ là những người đáng thương; không bao giờ ta thương...”\n*— Nam Cao, Lão Hạc*",
    "“Người ta khổ vì thương không phải cách, yêu sai duyên, và mến chẳng nhằm người. Có ai điên giữ ánh sáng một nụ cười? Có ai khờ gửi lòng mình cho ngọn gió?”\n*— Xuân Diệu, Trường Ca*",
    "“Tình yêu của tôi đối với nàng là một thứ tình yêu tuyệt vọng, một thứ tình yêu không dám đòi hỏi, không dám hy vọng một điều gì... Tôi chỉ biết yêu nàng, thế thôi.”\n*— Thạch Lam, Sợi Tóc*",
    "“Đời người ta không phải là một vệt thẳng, nó là những vòng tròn, những đường cong, và đôi khi là những nút thắt mà ta phải tự mình tháo gỡ trong im lặng.”\n*— Thạch Lam, Gió Lạnh Đầu Mùa*",
    "“Nước mắt không phải là dấu hiệu của sự yếu đuối, nó là bằng chứng cho thấy tâm hồn ta chưa hoàn toàn hóa đá trước những bất công và lạnh lẽo của cuộc đời này.”\n*— Nam Cao, Sống Mòn*",
    "“Cái nghèo không đáng sợ, đáng sợ là cái nghèo nó len lỏi vào tận trong tâm hồn, làm cho con người ta trở nên nhỏ nhen, ích kỷ và đánh mất đi lòng tự trọng tối thiểu.”\n*— Nam Cao, Giăng Sáng*",
    "“Ở đời này, kẻ mạnh không phải là kẻ giẫm lên vai kẻ khác để thỏa mãn lòng ích kỷ. Kẻ mạnh chính là kẻ giúp đỡ kẻ khác trên đôi vai của mình.”\n*— Nam Cao, Đời Thừa*",
    "“Có những lúc, người ta thèm một cái ôm từ một người xa lạ, thèm một ánh mắt cảm thông không phán xét, bởi vì những người thân thuộc nhất đôi khi lại là những người làm ta tổn thương sâu sắc nhất.”\n*— Thạch Lam, Tối Ba Mươi*",
    "“Người ta khổ vì quá nhớ nhung một quá khứ đã xa xôi, hoặc quá lo sợ cho một tương lai chưa định hình. Ít ai chịu sống và thở trọn vẹn cho một buổi chiều bình yên dẫu nó có tẻ nhạt.”\n*— Thạch Lam, Theo Dòng*",
    "“Cuộc đời là một chiến trường vô hình, nơi mỗi người đều phải tự chiến đấu với những bóng ma của chính mình trong bóng tối.”\n*— Vũ Trọng Phụng, Giông Tố*"
];

const LOVE_POEMS_SAD = [
    { title: "Yêu", author: "Xuân Diệu", content: "Yêu, là chết trong lòng một ít,\nVì mấy khi yêu mà chắc được yêu?\nCho rất nhiều, song nhận chẳng bao nhiêu:\nNgười ta phụ, hoặc thờ ơ, chẳng biết." },
    { title: "Duyên Lạ", author: "Hàn Mặc Tử", content: "Ai hãy làm thinh chớ nói nhiều\nĐể nghe dưới đáy nước hồ reo\nĐể nghe tơ liễu run trong gió\nVà để xem người ta ốm vì yêu." },
    { title: "Chân Quê", author: "Nguyễn Bính", content: "Nào đâu cái yếm lụa sồi?\nCái dây lưng đũi nhuộm hồi sang xuân?\nNào đâu cái áo tứ thân?\nCái khăn mỏ quạ, cái quần nilon?" },
    { title: "Ngơ Ngác", author: "Huy Cận", content: "Em đi qua đời anh nhẹ nhàng như cơn gió,\nĐể lại trong lòng một khoảng trống mênh mông.\nAnh đứng lại giữa dòng đời hối hả,\nHỏi thầm lòng: Người có nhớ ta không?" },
    { title: "Tình Trao", author: "Vũ Hoàng Chương", content: "Ta gom hết chút tơ lòng sót lại,\nGửi về em qua vạn nẻo mây mờ.\nNhưng em hỡi, tình em như khói nổi,\nĐến làm chi rồi đi chẳng đợi chờ?" },
    { title: "Giọt Lệ Tình", author: "Hàn Mặc Tử", content: "Người đi một nửa hồn tôi mất,\nMột nửa hồn tôi bỗng dại khờ.\nTôi nhớ người người đâu có nhớ,\nGieo tình chi để gặt vần thơ." }
];

const LOVE_POEMS_SWEET = [
    { title: "Thuyền Và Biển", author: "Xuân Quỳnh", content: "Từ ngày thương em anh mới biết\nLòng biển rộng dài đến nhường bao\nNếu phải cách xa em, anh chỉ còn bão tố\nNếu phải cách xa em, anh chỉ còn sóng gào." },
    { title: "Sóng", author: "Xuân Quỳnh", content: "Con sóng dưới lòng sâu\nCon sóng trên mặt nước\nÔi con sóng nhớ bờ\nNgày đêm không ngủ được\nLòng em nhớ đến anh\nCả trong mơ còn thức." },
    { title: "Thơ Duyên", author: "Xuân Diệu", content: "Chiều mộng hòa thơ trên nhánh duyên,\nCây me ríu rít cặp chim chuyền.\nĐổ trời xanh ngọc qua muôn lá,\nThu đến - nơi nơi động tiếng huyền." },
    { title: "Mùa Hoa Cải", author: "Nghiêm Thị Hằng", content: "Có một mùa hoa cải\nNở vàng bên bến sông\nEm đi lấy chồng rồi\nAnh lau dòng nước mắt." },
    { title: "Hương Thầm", author: "Phan Thị Thanh Nhàn", content: "Khung cửa sổ hai nhà cuối phố\nChẳng ai cam lòng nói một câu.\nChùm hoa bưởi bừng lên hương muộn,\nGió đưa tình vào trong mắt sâu." },
    { title: "Anh Yêu Em", author: "Xuân Diệu", content: "Anh yêu em vì em là tất cả\nLà cỏ cây, là nắng ấm, là hoa\nLà bài thơ anh viết thuở ban đầu\nLà hạnh phúc đi qua đời bão tố." }
];

const LOVE_QUOTES_SWEET = [
    "“Tôi thấy nàng đẹp quá, một vẻ đẹp dịu dàng và thuần khiết như một đóa hoa nhài buổi sớm. Trong khoảnh khắc ấy, tôi biết rằng tâm hồn mình đã vĩnh viễn thuộc về nơi có bóng hình nàng.”\n*— Thạch Lam, Trong Bóng Tối Buổi Chiều*",
    "“Yêu là sự đồng điệu dịu dàng của hai tâm hồn, như hai dòng nước mát gặp nhau giữa mùa hè oi ả, hòa vào làm một và chảy mãi về phía bình yên.”\n*— Khái Hưng, Hồn Bướm Mơ Tiên*",
    "“Thế giới này rộng lớn là thế, nhưng chỉ cần có em ở bên, góc phòng chật hẹp này cũng hóa thành thiên đường bình yên nhất của cuộc đời anh.”\n*— Nhất Linh, Gánh Hàng Hoa*",
    "“Cái thuở ban đầu ấy, tình yêu như một mầm non mới nhú sau cơn mưa xuân, mỏng manh nhưng đầy sức sống, chỉ cần một cái chạm tay nhẹ cũng đủ làm cả tâm hồn rung động.”\n*— Thạch Lam, Gió Lạnh Đầu Mùa*"
];

const PHILOSOPHY_QUOTES = [
    "“Bắt đầu từ thế kỷ này, nhân loại sẽ thấy rõ rằng một kẻ khôn ngoan chỉ là một kẻ biết sống hạnh phúc với những cái mình có, chứ không phải là kẻ điên cuồng đi tìm những cái mình thiếu.”\n*— Vũ Trọng Phụng, Số Đỏ*",
    "“Cái bản tính của con người là thế: khi người ta sung sướng quá, người ta thường sinh ra tàn nhẫn, người ta quên mất những nỗi khổ đau của kẻ khác.”\n*— Thạch Lam, Gió Lạnh Đầu Mùa*",
    "“Thân như bóng chớp có rồi không,\nCây xuân tươi tốt thu đượm hồng.\nXem xét thịnh suy đừng sợ hãi,\nThịnh suy như cỏ rọt sương đông.”\n*— Vạn Hạnh Thiền Sư, Thị Đệ Tử*",
    "“Đường đi khó, không khó vì ngăn sông cách núi, mà khó vì lòng người ngại núi e sông.”\n*— Nguyễn Bá Học*",
    "“Sự đời không thể nhìn một cách xuôi chiều. Kẻ tưởng như bất hạnh đôi khi lại tìm thấy sự thanh thản trong tâm hồn, còn người ngồi trên vinh hoa lại thức trắng đêm vì lo sợ vỡ tan.”\n*— Vũ Trọng Phụng, Giông Tố*",
    "“Kẻ thức thời là kẻ biết buông bỏ những hư vinh giả tạo của cuộc đời để đổi lấy một ngày tâm an. Danh vọng như mây nổi, thoảng qua rồi mất, chỉ có cái tâm tĩnh lặng mới là vĩnh cửu.”\n*— Nguyễn Tuân, Vang Bóng Một Thời*",
    "“Đến một độ tuổi nào đó, người ta sẽ nhận ra rằng thắng thua không còn quan trọng nữa. Điều quan trọng duy nhất là khi đêm xuống, bạn có thể kê cao gối mà ngủ một giấc không mộng mị.”\n*— Nam Cao, Sống Mòn*"
];

const COMFORT_QUOTES = [
    "“Hãy để cho tâm hồn mình thanh thản như mặt nước hồ thu, những muộn phiền ngoài kia xét cho cùng cũng chỉ là gió thoảng qua bờ liễu. Ngủ một giấc đi, ngày mai bình minh lại sưởi ấm hiên nhà.”\n*— Nhất Linh, Đoạn Tuyệt*",
    "“Đời người ta có những lúc phải dừng lại, không phải để từ bỏ, mà để nhìn lại con đường đã qua, ngắm một nhành hoa dại bên đường và mỉm cười vì mình vẫn còn sống, vẫn còn biết đau và biết thương.”\n*— Thạch Lam, Hà Nội Băm Sáu Phố Phường*",
    "“Khi tâm hồn bạn mỏi mệt giữa phố thị rực rỡ ánh đèn, hãy quay về với những giá trị bình dị nhất. Một ngụm trà ấm, một trang sách cũ, và một tiếng thở phào nhẹ nhõm cho một ngày dài đã qua.”\n*— Nguyễn Tuân, Vang Bóng Một Thời*",
    "“Đừng buồn vì những chuyện đã qua, cũng đừng lo lắng về những điều chưa tới. Hãy sống trọn vẹn cho khoảnh khắc này, vì hiên nhà tối nay vẫn còn thoang thoảng mùi hương hoa nhài thanh mát.”\n*— Thạch Lam, Nắng Trong Vườn*",
    "“Hãy cứ để những giọt mưa gột rửa đi mọi bụi bặm của ngày hôm nay. Ngày mai, khi nắng lên, bạn sẽ lại thấy một bầu trời trong vắt và một tâm hồn kiên cường hơn trước.”\n*— Nguyễn Tuân, Tùy Bút Kháng Chiến*"
];

const BREAKUP_POEMS = [
    { title: "Ý Tình", author: "Xuân Diệu", content: "Tôi gửi hồn tôi gửi ý tôi\nĐể theo chân bạn bước muôn nơi.\nNhưng mà bạn hỡi, hồn tôi lạnh\nBạn có bao giờ sưởi ấm đôi?" },
    { title: "Giăng Tơ", author: "Huy Cận", content: "Đêm mưa làm nhớ phòng xưa\nNhớ tình sưởi ấm những giờ lạnh lùng.\nĐến nay tình đã mịt mùng\nNgười đi đường rộng, kẻ trông phòng nghèo." },
    { title: "Tình Sầu", author: "Vũ Hoàng Chương", content: "Đã lỡ duyên tình thuở ban đầu,\nĐường đi hai ngả khuất bóng nhau.\nNgười về gác phượng vui duyên mới,\nKẻ ở phòng tiêu nhỏ lệ sầu." },
    { title: "Biệt Ly", author: "Thâm Tâm", content: "Đưa người ta không đưa qua sông,\nSao có tiếng sóng ở trong lòng?\nBóng chiều không thắm, không vàng vọt,\nNhuộm cả lòng người một sắc dong." }
];

const MISSING_POEMS = [
    { title: "Nhớ Rừng", author: "Thế Lữ", content: "Ta sống mãi trong tình thương nỗi nhớ,\nThuở tung hoành hống hách những ngày xưa.\nNhớ cảnh sơn lâm, bóng cả, cây già,\nVới tiếng gió gào ngàn, với giọng nguồn hét núi." },
    { title: "Mưa Xuân", author: "Nguyễn Bính", content: "Lòng thấy giăng tơ một vạn sợi\nTình theo dải lụa tới ngàn trùng\nNgười đi xây dựng bờ sông mới\nCó nhớ tình tôi một thuở cùng?" },
    { title: "Trầm Tưởng", author: "Chế Lan Viên", content: "Tôi nhớ vầng trăng thuở ấu thơ,\nNhớ tà áo trắng dệt mộng mơ.\nNgười đi phương ấy phương trời thẳm,\nCó nhớ ga nghèo đứng đợi chờ?" },
    { title: "Núi Đôi", author: "Vũ Cao", content: "Anh đi bộ đội sao trên mũ\nMãi mãi là đi theo cánh sao.\nEm ở hậu phương hoài ngóng đợi,\nNúi đôi đứng đó, lệ tuôn trào." }
];

const INTROS = [
    "Lật mở một trang sách cũ, tìm lại chút dư hương của văn chương nước nhà...",
    "Xin mượn dòng mực của những bậc đại tài để nói hộ tiếng lòng bạn lúc này...",
    "Giữa thế giới xô bồ, hãy để những câu chữ kinh điển này xoa dịu tâm hồn bạn...",
    "Lắng nghe thanh âm của thời gian vang vọng qua những áng văn bất hủ..."
];

const COMFORT_OUTROS = [
    "Gấp lại trang sách, chúc bạn một ngày an yên.",
    "Chữ nghĩa muôn đời vẫn thức để bầu bạn cùng bạn.",
    "Mong rằng chút dư vị văn học này làm lòng bạn nhẹ tênh."
];

function getRandomColor(type) {
    const colors = {
        poem: '#f4a261', sad: '#2a4365', phil: '#6b46c1', 
        comfort: '#2f855a', breakup: '#865439', missing: '#355c7d', spare: '#d946ef'
    };
    return colors[type] || '#ffffff';
}

// =========================================================
// QUẢN LÝ VÒNG LẶP (MẶC ĐỊNH LÀ BẬT KHI KHỞI ĐỘNG BOT)
// =========================================================
let poemIntervalId = null;
let isLoopActive = true; // Mặc định bật ngay khi chạy bot!

function startAutoPoem(client) {
    const channelId = process.env.KENH_NGAM_THO;
    if (!channelId) return;

    if (poemIntervalId) clearInterval(poemIntervalId);

    // Kích hoạt chạy ngầm định kỳ
    poemIntervalId = setInterval(async () => {
        if (!isLoopActive) return; // Nếu bị tạm dừng bằng lệnh !loop thì không gửi

        try {
            const channel = await client.channels.fetch(channelId);
            if (channel) {
                const randomPoem = POEM_DATABASE[Math.floor(Math.random() * POEM_DATABASE.length)];
                const embed = new EmbedBuilder()
                    .setColor(getRandomColor('poem'))
                    .setTitle(`📜 Áng Văn Bất Hủ: ${randomPoem.title}`)
                    .setDescription(`*Tác giả: ${randomPoem.author}*\n\n*${randomPoem.content.replace(/\n/g, '*\n*')}*`)
                    .setFooter({ text: "🔄 Thơ gửi tự động định kỳ mỗi tiếng. Gõ !loop để tạm dừng." })
                    .setTimestamp();
                await channel.send({ embeds: [embed] });
            }
        } catch (e) { console.error("Lỗi gửi thơ tự động:", e); }
    }, 60 * 60 * 1000); 
}

async function handlePoemCommand(message) {
    const content = message.content.trim().toLowerCase();
    
    // Tích hợp đầy đủ tất cả các lệnh cần bắt
    const targetCommands = [
        '!tho', '!tôi buồn', '!toi buon', '!yeu', '!yêu', 
        '!triết lí', '!triet li', '!triết lý', '!triet ly',
        '!mệt', '!met', '!thattinh', '!nhớ', '!nho',
        '!lốp', '!lop', '!loop'
    ];
    if (!targetCommands.includes(content)) return false;

    const channelId = process.env.KENH_NGAM_THO;
    if (channelId && message.channel.id !== channelId) {
        return message.reply(`❌ Đạo hữu vui lòng di chuyển qua kênh <#${channelId}> để sử dụng lệnh nhé!`).catch(() => {});
    }

    const randomIntro = INTROS[Math.floor(Math.random() * INTROS.length)];
    const randomOutro = COMFORT_OUTROS[Math.floor(Math.random() * COMFORT_OUTROS.length)];

    // =========================================================
    // XỬ LÝ LỆNH CONTROL LOOP (!LOOP) -> ĐIỀU KHIỂN BẬT/TẮT CHẠY TỰ ĐỘNG
    // =========================================================
    if (content === '!loop') {
        isLoopActive = !isLoopActive; // Đảo trạng thái Bật <-> Tắt

        const statusEmbed = new EmbedBuilder()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        if (isLoopActive) {
            statusEmbed.setColor('#2f855a')
                .setTitle('🔄 Vòng Lặp Tự Động: ĐÃ TIẾP TỤC!')
                .setDescription('Bot sẽ tiếp tục tự động ngâm thơ định kỳ mỗi tiếng tại kênh này như cũ.');
        } else {
            statusEmbed.setColor('#e53e3e')
                .setTitle('🛑 Vòng Lặp Tự Động: ĐÃ TẠM DỪNG!')
                .setDescription('Đã tạm thời dừng việc tự động gửi thơ mỗi tiếng. Gõ lại `!loop` để bot tiếp tục chạy ngầm.');
        }

        await message.reply({ embeds: [statusEmbed] });
        return true;
    }

    // =========================================================
    // XỬ LÝ LỆNH LỐP DỰ PHÒNG (!LỐP / !LOP) -> GỌI THƠ DỰ PHÒNG CỨU NGUY
    // =========================================================
    if (content === '!lốp' || content === '!lop') {
        const p = SPARE_TIRE_POEMS[Math.floor(Math.random() * SPARE_TIRE_POEMS.length)];
        const embed = new EmbedBuilder()
            .setColor(getRandomColor('spare'))
            .setAuthor({ name: `Lốp dự phòng cứu nguy cho ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTitle(`🛠️ Thơ Dự Phòng: ${p.title} (${p.author})`)
            .setDescription(`*Đường xa lốp hỏng đã có thơ hay thế chỗ...*\n\n*${p.content.replace(/\n/g, '*\n*')}*`)
            .setFooter({ text: `💭 ${randomOutro}` }).setTimestamp();
        await message.reply({ embeds: [embed] });
        return true;
    }

    // Lệnh !tho
    if (content === '!tho') {
        const p = POEM_DATABASE[Math.floor(Math.random() * POEM_DATABASE.length)];
        const embed = new EmbedBuilder()
            .setColor(getRandomColor('poem'))
            .setTitle(`📜 Tác phẩm: ${p.title} (${p.author})`)
            .setDescription(`*${randomIntro}*\n\n*${p.content.replace(/\n/g, '*\n*')}*`)
            .setFooter({ text: `💭 ${randomOutro}` }).setTimestamp();
        await message.reply({ embeds: [embed] });
        return true;
    }

    // Lệnh !tôi buồn
    if (content === '!tôi buồn' || content === '!toi buon') {
        const q = SAD_QUOTES[Math.floor(Math.random() * SAD_QUOTES.length)];
        const embed = new EmbedBuilder()
            .setColor(getRandomColor('sad'))
            .setTitle('🌊 Nỗi Sầu Nhân Sinh Qua Trang Sách')
            .setDescription(`*${randomIntro}*\n\n${q}`)
            .setFooter({ text: `💭 ${randomOutro}` }).setTimestamp();
        await message.reply({ embeds: [embed] });
        return true;
    }

    // Lệnh !yêu
    if (content === '!yeu' || content === '!yêu') {
        const rate = Math.random();
        const embed = new EmbedBuilder().setTimestamp().setFooter({ text: `💭 ${randomOutro}` });
        if (rate < 0.4) {
            const p = LOVE_POEMS_SAD[Math.floor(Math.random() * LOVE_POEMS_SAD.length)];
            embed.setColor('#6c5b7b').setTitle(`🥀 Tình Sầu Văn Học: ${p.title} (${p.author})`)
                 .setDescription(`*${randomIntro}*\n\n*${p.content.replace(/\n/g, '*\n*')}*`);
        } else if (rate < 0.8) {
            const p = LOVE_POEMS_SWEET[Math.floor(Math.random() * LOVE_POEMS_SWEET.length)];
            embed.setColor('#ffb7b2').setTitle(`💖 Khúc Tình Ca Kinh Điển: ${p.title} (${p.author})`)
                 .setDescription(`*${randomIntro}*\n\n*${p.content.replace(/\n/g, '*\n*')}*`);
        } else {
            const q = LOVE_QUOTES_SWEET[Math.floor(Math.random() * LOVE_QUOTES_SWEET.length)];
            embed.setColor('#ffc6ff').setTitle(`💌 Trích Đoạn Tình Yêu Thuyết Thục`).setDescription(`*${randomIntro}*\n\n${q}`);
        }
        await message.reply({ embeds: [embed] });
        return true;
    }

    // Lệnh !trietly
    if (['!triết lí', '!triet li', '!triết lý', '!triet ly'].includes(content)) {
        const q = PHILOSOPHY_QUOTES[Math.floor(Math.random() * PHILOSOPHY_QUOTES.length)];
        const embed = new EmbedBuilder()
            .setColor(getRandomColor('phil'))
            .setTitle('🔮 Triết Lý Nhân Sinh Trong Văn Học')
            .setDescription(`*${randomIntro}*\n\n${q}`)
            .setFooter({ text: `💭 ${randomOutro}` }).setTimestamp();
        await message.reply({ embeds: [embed] });
        return true;
    }

    // Lệnh !met
    if (content === '!mệt' || content === '!met') {
        const q = COMFORT_QUOTES[Math.floor(Math.random() * COMFORT_QUOTES.length)];
        const embed = new EmbedBuilder()
            .setColor(getRandomColor('comfort'))
            .setTitle('🍃 Trạm Dừng Xoa Dịu Tâm Hồn')
            .setDescription(`*${randomIntro}*\n\n${q}`)
            .setFooter({ text: `💭 ${randomOutro}` }).setTimestamp();
        await message.reply({ embeds: [embed] });
        return true;
    }

    // Lệnh !thattinh
    if (content === '!thattinh') {
        const p = BREAKUP_POEMS[Math.floor(Math.random() * BREAKUP_POEMS.length)];
        const embed = new EmbedBuilder()
            .setColor(getRandomColor('breakup'))
            .setTitle(`🥀 Đoạn Tuyệt Duyên Tình: ${p.title} (${p.author})`)
            .setDescription(`*${randomIntro}*\n\n*${p.content.replace(/\n/g, '*\n*')}*`)
            .setFooter({ text: `💭 ${randomOutro}` }).setTimestamp();
        await message.reply({ embeds: [embed] });
        return true;
    }

    // Lệnh !nhớ
    if (content === '!nhớ' || content === '!nho') {
        const p = MISSING_POEMS[Math.floor(Math.random() * MISSING_POEMS.length)];
        const embed = new EmbedBuilder()
            .setColor(getRandomColor('missing'))
            .setTitle(`🌙 Nỗi Nhớ Hoài Niệm: ${p.title} (${p.author})`)
            .setDescription(`*${randomIntro}*\n\n*${p.content.replace(/\n/g, '*\n*')}*`)
            .setFooter({ text: `💭 ${randomOutro}` }).setTimestamp();
        await message.reply({ embeds: [embed] });
        return true;
    }

    return false;
}

module.exports = { startAutoPoem, handlePoemCommand };