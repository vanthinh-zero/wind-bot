const { EmbedBuilder } = require('discord.js');

// Biến lưu trữ bài viết vừa gửi gần nhất để chống trùng lặp
let indexBaiTruocDo = -1;

// Danh sách 6 bài văn tự sự dài (>600 từ) đầy đủ cung bậc cảm xúc
const danhSachDoanVan = [
    {
        tieuDe: "🌿 Cơn Mưa Rào Mang Tên Thanh Xuân",
        noiDung: `Người ta thường ví thanh xuân như một cơn mưa rào, dẫu có bị cảm lạnh vì ướt đẫm, ai cũng muốn được đắm mình trong cơn mưa ấy một lần nữa. Giữa dòng đời hối hả của tuổi trưởng thành, khi những toan tính lo âu dần lấp đầy khoảng trống của tâm hồn, tôi lại chợt nhớ về những ngày tháng năm mộng mơ ấy. Một thời mà chúng ta chẳng có gì ngoài một trái tim ngông cuồng, một đôi mắt trong veo và một tình cảm thuần khiết đến khờ dại. Điều khiến thanh xuân trở nên thiêng liêng nhất không phải là những ngày nắng đẹp lung linh, mà là một bóng hình, một nụ cười ta đã vô tình để lạc mất giữa những sân ga của thời gian.\n\nKý ức về những năm tháng ấy luôn bắt đầu bằng một mùa hạ đầy nắng và tiếng ve râm ran khắp các vòm lá bằng lăng tím. Tôi nhớ chiếc áo đồng phục lấm lem vệt mực, nhớ gói xôi chia đôi ăn vội dưới hốc bàn trước giờ vào lớp, và cả chiếc tai nghe chia đôi phát đi phát lại một bản tình ca cũ kỹ. Ngày ấy, thế giới của chúng tôi nhỏ bé lắm, nó chỉ gói gọn trong khoảng sân trường đầy lá rụng, trong ánh mắt ngại ngùng nhìn trộm ai đó từ dãy bàn bên cạnh. Chúng tôi đã từng cùng nhau đi qua những buổi chiều muộn, đứng dưới mái hiên của quán nước quen thuộc để đợi một cơn dông đi qua, tiếng cười giòn tan hòa vào tiếng mưa rơi rả rích trên mái tôn. \n\nNhưng có những điều chỉ khi đi qua rồi người ta mới biết nó quý giá đến nhường nào. Chúng ta của những năm tháng đó, có tất cả mọi thứ: thời gian, hoài bão, và một tình yêu chân thành nhất, nhưng lại thiếu đi một thứ duy nhất — đó chính là sự dũng cảm. Sự dũng cảm để nói ra câu thương một người, sự dũng cảm để giữ chặt một bàn tay trước khi bánh xe thời gian nghiền nát những lời hẹn ước. Để rồi khi mùa hạ cuối cùng ập đến, tiếng trống trường vang lên một hồi dài như tiếng thở dài của năm tháng, chúng tôi phải ôm lấy nhau mà khóc, nhận ra mỗi người rồi sẽ phải rẽ sang một ngả đường riêng. Chiếc ghế đá quen thuộc giờ nằm im lìm dưới gốc phượng già, vạt nắng cuối chiều nhẹ nhàng đổ xuống khoảng trống vô hình mà người ra đi để lại. Những lời hứa về một ngày gặp lại cứ thế nhạt nhòa dần theo những trang lưu bút sờn gáy, trở thành một góc khuất im lặng trong tim.\n\nThành phố hôm nay lại đổ mưa, một cơn mưa bất chợt khiến lòng tôi chợt thắt lại. Thanh xuân đã qua đi, chuyến tàu một chiều ấy chưa từng và sẽ không bao giờ có vé khứ hồi. Sẽ có người lên xe, có người xuống bến, có người chỉ đồng hành cùng ta qua một đoạn đường ngắn ngủi rồi biến mất mãi mãi vào dòng người ngược xuôi. Thế nhưng, tôi không còn cảm thấy đau buồn hay tiếc nuối nữa. Tôi mỉm cười vì biết rằng, giữa hàng tỷ người trên thế giới này, chúng ta đã từng chọn ngồi cạnh nhau ở đoạn đường đẹp nhất của cuộc đời. Tình cảm sâu đậm năm ấy sẽ mãi là một đốm lửa nhỏ, âm thầm sưởi ấm tâm hồn tôi giữa những ngày giông bão của cuộc đời trưởng thành.`
    },
    {
        tieuDe: "⏳ Tiếng Thở Dài Của Thời Gian Và Kỷ Niệm",
        noiDung: `Có bao giờ bạn giật mình nhìn lại một bức ảnh cũ, nghe lại một giai điệu quen thuộc và chợt nhận ra thời gian đã tàn nhẫn mang đi quá nhiều thứ? Thời gian giống như một dải cát mịn, ta càng muốn nắm chặt thì nó lại càng len lỏi qua từng kẽ tay rồi biến mất vào hư không. Những nỗi đau, những vết thương lòng của tuổi trẻ thường đến từ sự ngộ nhận rằng ngày mai vẫn sẽ giống như ngày hôm nay, rằng người bên cạnh ta sẽ mãi mãi chẳng thay đổi. Để rồi khi những tháng năm tươi đẹp nhất lùi xa vào dĩ vãng, ta mới nhận ra bản thân đã bỏ lỡ những điều thiêng liêng nhất của một thời thanh xuân cuồng nhiệt.\n\nTôi nhớ về những đêm muộn ngồi bên bậu cửa sổ, nhìn những giọt mực nhòe trên trang giấy trắng khi cố viết ra những dòng tâm sự không thể gửi cho một người. Tình cảm tuổi trẻ luôn mang một màu sắc vừa rực rỡ lại vừa u buồn như vạt nắng cuối chiều tà. Đó là những ngày ta sẵn sàng đạp xe qua mười cây số chỉ để nhìn thấy bóng dáng ai đó lướt qua dưới hiên nhà, là những khi đứng chôn chân dưới mưa chỉ mong nhận được một cái gật đầu. Nhưng thời gian lại là một thỏi nam châm của ký ức, nó vừa hút mọi kỷ niệm về gần, nhưng cũng vừa đẩy những con người từng xem nhau là tất cả ra xa hai cực của cuộc đời.\n\nKhi trưởng thành, chúng ta cuốn vào vòng xoáy của cơm áo gạo tiền, của những mối quan hệ xã giao đầy mệt mỏi. Những người bạn từng thề nguyền dẫu có đi đến chân trời góc bể cũng không quên nhau, giờ đây ngay cả một tin nhắn chúc mừng sinh nhật cũng trở nên gượng gạo. Nỗi buồn lớn nhất không phải là sự chia ly bằng nước mắt, mà là sự im lặng đáng sợ của thời gian, khi hai con người từng biết rõ từng thói quen của nhau giờ lại nhìn nhau như hai người xa lạ trên phố. Những hờn giận, những tổn thương ngày cũ giờ đây hóa thành một vết sẹo mờ, không còn đau nhức nhối nhưng mỗi khi chạm vào vẫn khiến lòng ta nhói lên một nhịp trầm buồn. Kỷ niệm giống như một thước phim tài liệu cũ kỹ, dù có bật đi bật lại bao nhiêu lần thì cái kết cục chia xa vẫn chẳng thể nào thay đổi được.\n\nKhi những trang nhật ký năm nào đã ngả sang màu vàng úa, tôi mới hiểu ra rằng giá trị của thời gian không nằm ở chỗ nó kéo dài bao lâu, mà là ta đã từng trân trọng nó như thế nào. Những đau buồn, tiếc nuối của ngày hôm qua chính là chất liệu để nhào nặn nên một bản thân kiên cường của ngày hôm nay. Thanh xuân có thể đóng cửa, thời gian có thể trôi đi không bao giờ trở lại, nhưng tình cảm sâu đậm và chân thành mà chúng ta từng trao đi sẽ mãi là một nốt trầm dịu dàng trong bản nhạc cuộc đời, nhắc nhở ta rằng mình đã từng có một thời tuổi trẻ đáng sống đến như thế.`
    },
    {
        tieuDe: "🥀 Góc Khuyết Của Những Lời Chưa Nói",
        noiDung: `Nỗi đau lớn nhất của cuộc đời không phải là khi tình yêu kết thúc trong sự phản bội, mà là khi nó khép lại trong sự im lặng của những lời chưa kịp nói. Bạn đã bao giờ trải qua cảm giác đứng trước một người mà lồng ngực thắt lại, nghẹn ngào đến mức không thể thốt ra một câu đơn giản nhất chưa? Khi ấy, chúng ta tự hứa với lòng mình rằng 'để lần sau', 'để khi khác thích hợp hơn'. Thế nhưng cuộc đời này làm gì có nhiều 'lần sau' đến thế, một cái quay lưng của ngày hôm ấy đã vô tình trở thành cái quay lưng của cả một đời người.\n\nTôi nhớ mãi ga tàu điện ngầm ngày cuối năm, dòng người chen chúc hối hả ngược xuôi. Người ấy đứng đó, mắt long lanh như chứa cả một trời tâm sự, còn tôi thì cứ ngập ngừng giấu chặt đôi bàn tay run rẩy vào túi áo khoác. Tôi muốn nói rằng tôi sợ những ngày tháng sắp tới không có người ở bên, tôi muốn nói rằng hãy ở lại vì tôi cần người. Nhưng sự kiêu ngạo nực nội của cái gọi là 'bản ngã tuổi trẻ' đã giữ chân tôi lại. Tôi chỉ biết đứng nhìn bóng lưng ấy mờ dần sau làn kính cửa tàu, và tiếng còi tàu vang lên xé toạc không gian như một dấu chấm hết lạnh lùng cho một mối tình chưa kịp nở.\n\nNăm tháng trôi qua, tôi đã đi qua rất nhiều con phố, gặp gỡ rất nhiều người, nhưng vị trí bên cạnh tôi vẫn luôn trống trải một cách kỳ lạ. Hóa ra, khi bạn đã dành trọn vẹn sự chân thành của những năm tháng đầu đời để thương một người, thì những người đến sau chỉ còn là sự chắp vá, là những hình bóng nhạt nhòa phản chiếu từ một quá khứ quá đỗi sâu đậm. Có những đêm nằm nghe tiếng mưa rơi buốt giá, tôi tự hỏi nếu ngày ấy mình can đảm hơn một chút, nếu mình hạ bớt cái tôi xuống một chút, liệu cái kết của chúng ta có khác đi không? Nhưng câu trả lời mãi mãi chỉ là sự im lặng của màn đêm lạnh lẽo.\n\nĐến cuối cùng, chúng ta buộc phải học cách chấp nhận rằng có những người xuất hiện trong cuộc đời chỉ để dạy cho ta biết thế nào là nuối tiếc. Lời chưa nói sẽ mãi mãi nằm lại ở mùa hạ năm mười tám tuổi, hóa thành những hạt bụi lấp lánh trong miền ký ức. Ta không thể quay đầu lại để sửa chữa sai lầm, chỉ có thể mang theo vết thương ấy như một hành trang để nhắc nhở bản thân rằng: ở những chặng đường tiếp theo, nếu gặp được người mình thương, nhất định phải dũng cảm giữ lấy, đừng để thời gian cướp đi một lần nữa.`
    },
    {
        tieuDe: "🍂 Ngược Dòng Ký Ức Chiều Cuối Hạ",
        noiDung: `Mỗi khi những chiếc lá bàng đầu tiên chuyển sang màu đỏ rực và những đợt gió heo may chớm lạnh tràn về, lòng tôi lại cuộn lên một cảm giác chênh vênh khó tả. Đó là lúc mùa hạ sắp sửa lùi xa để nhường chỗ cho mùa thu, cũng là khoảng thời gian mà lòng người dễ tổn thương và yếu mềm nhất. Đối với tôi, những chiều cuối hạ luôn mang một nỗi buồn man mác, một nỗi buồn không tên nhưng thấm đẫm vào từng hơi thở, từng nhành cây góc phố. Đó là thời điểm nhắc nhở tôi về những cuộc chia ly, những lời từ biệt không bao giờ có ngày hội ngộ.\n\nNhìn những quán cà phê cũ kỹ ven đường, nơi chúng tôi từng ngồi hàng giờ liền để tranh luận về những điều viển vông, tôi chợt nhận ra mọi thứ vẫn ở đây, chỉ có con người là thay đổi. Chiếc bàn gỗ cũ kỹ, khung cửa sổ nhìn ra tán cây phượng già, tất cả vẫn vẹn nguyên như thế. Nhưng tiếng cười đùa tinh nghịch của đám bạn năm nào giờ đã được thay thế bằng tiếng nhạc ballad trầm buồn phát ra từ chiếc loa nhỏ. Những người bạn từng kề vai sát cánh, từng hứa sẽ cùng nhau đi qua mọi giông bão, giờ đây mỗi người đã có một khoảng trời riêng, một cuộc sống riêng đầy bận rộn. Chúng ta không còn giận hờn, không còn cãi vã, chúng ta chỉ lặng lẽ biến mất khỏi cuộc đời nhau.\n\nSự tàn nhẫn của sự trưởng thành nằm ở chỗ nó tước đi của chúng ta quyền được vô tư. Chúng ta phải học cách mỉm cười khi trong lòng đang tan nát, học cách nói 'tôi ổn' khi thực ra đang rất cần một cái ôm. Những tình cảm sâu đậm, những gắn bó keo sơn một thời giờ chỉ còn có thể tìm thấy trong những tấm ảnh đã bắt đầu nhòe màu theo năm tháng. Đôi khi, tôi tự hỏi liệu có ai trong số họ, vào một buổi chiều muộn thế này, cũng chợt nhớ về tôi như cách tôi đang nhớ về họ hay không? Hay tất cả đã bị cơn lốc của cuộc sống hiện đại cuốn trôi đi mất rồi?\n\nHoàng hôn buông xuống, nhuộm đỏ cả một góc trời bằng thứ ánh sáng lộng lẫy nhưng tịch liêu. Tôi tự nhủ với lòng mình rằng, thanh xuân dẫu có nhiều đau buồn và tiếc nuối thì nó vẫn là quãng thời gian đẹp nhất mà tôi có được. Những vết thương lòng năm ấy không làm tôi gục ngã, mà nó giúp tôi biết trân trọng hơn những hạnh phúc giản đơn ở hiện tại. Xin gửi lại những ký ức chiều cuối hạ vào một ngăn tủ khóa chặt của con tim, để mỗi khi mệt mỏi, tôi lại có một chốn bình yên để tìm về.`
    },
    {
        tieuDe: "🌌 Những Vết Thương Giấu Kín Của Trưởng Thành",
        noiDung: `Trưởng thành thực chất là một quá trình ly biệt đầy đau đớn, nơi ta phải học cách nói lời tạm biệt với chính những ngây thơ của bản thân. Khi còn nhỏ, chúng ta luôn ao ước được lớn lên thật nhanh để được tự do làm những điều mình thích. Nhưng khi đứng ở ngưỡng cửa của thế giới người lớn, đối mặt với những áp lực vô hình, những mối quan hệ đầy rẫy sự đề phòng và lọc lừa, ta mới bàng hoàng nhận ra mình đã đánh đổi một báu vật vô giá để lấy về những tổn thương sâu sắc. Cái giá của sự trưởng thành, đôi khi là những giọt nước mắt lặng lẽ rơi giữa đêm muộn mà không dám để ai hay biết.\n\nTôi đã từng nghĩ rằng mình đủ mạnh mẽ để chống chọi với cả thế giới, nhưng cuộc đời lại luôn biết cách dội những gáo nước lạnh vào sự tự tin ấy. Có những ngày đi làm về với cơ thể rã rời, bước vào căn phòng trống trải lạnh lẽo, tôi chỉ muốn vứt bỏ tất cả để quay về sà vào lòng mẹ mà khóc như một đứa trẻ. Nhưng nhìn vào chiếc gương, nhìn thấy những nếp nhăn mệt mỏi trên gương mặt, tôi biết mình không thể. Người lớn không có quyền được gục ngã một cách tùy tiện, bởi sau lưng chúng ta còn là trách nhiệm, là gia đình, là những kỳ vọng mà ta buộc phải gánh vác.\n\nNhững nỗi đau của tuổi trưởng thành thường không có hình hài, nó không phải là một vết thương rỉ máu để người ta có thể băng bó hay nhận được sự thương hại. Nó là sự cô đơn tột cùng khi đứng giữa đám đông phố thị tấp nập, là cảm giác bất lực khi nhìn thấy những ước mơ hoài bão ngày xưa cứ rụng rơi dần theo cơm áo gạo tiền. Chúng ta bắt đầu giấu kín những cảm xúc thật của mình sau một lớp mặt nạ bình thản, cười nói với những người ta không thích và gật đầu trước những bất công của cuộc đời. Tình cảm sâu đậm ngày xưa giờ trở thành một thứ xa xỉ phẩm mà ta chẳng dám chạm vào, vì sợ rằng sự yếu mềm sẽ làm lung lay ý chí chiến đấu.\n\nNhưng bạn ơi, đừng vì những vết sẹo ấy mà khép chặt lòng mình với thế giới. Vết thương nào rồi cũng sẽ lành, nỗi đau nào rồi cũng sẽ qua đi, để lại sau lưng một phiên bản kiên cường và bao dung hơn của chính bạn. Những ngày giông bão sẽ dạy cho ta biết trân quý những ngày nắng ấm. Hãy cứ khóc thật to nếu lòng quá nghẹn ngào, rồi ngày mai khi bình minh lên, lại lau khô nước mắt, tiếp tục bước đi trên con đường mình đã chọn, bởi vì cuộc đời này vẫn còn nhiều điều tốt đẹp đang chờ ta phía trước.`
    },
    {
        tieuDe: "🎞️ Thước Phim Cũ Và Người Cũ Không Hẹn Ngày Gặp Lại",
        noiDung: `Trong ngăn kéo bàn làm việc của tôi có một chiếc hộp thiếc nhỏ gỉ sét, bên trong chứa vài tấm vé xem phim đã mờ chữ, một chiếc móc khóa đôi bị gãy và một chiếc băng cassette cũ. Đó là tất cả những gì còn sót lại của một mối tình kéo dài suốt những năm tháng đại học — một mối tình mà tôi đã từng nghĩ sẽ có một cái kết viên mãn bằng một đám cưới trong mơ. Nhưng cuộc đời vốn dĩ luôn chứa đựng những ngã rẽ bất ngờ mà không một ai có thể lường trước được, để rồi người từng là cả thế giới của ta giờ chỉ còn là một cái tên thoảng qua trong những câu chuyện trà dư tửu hậu.\n\nChúng tôi đã từng có những ngày tháng gắn bó đến mức tưởng như hơi thở của người này đã hòa vào làm một với người kia. Tôi nhớ những buổi tối chở nhau trên chiếc xe máy cà tàng đi khắp các ngõ hẻm Hà Nội, nhớ những bát mì tôm úp vội những đêm cùng nhau thức cày deadline, và nhớ cả ánh mắt ấm áp người ấy nhìn tôi khi nói về tương lai của hai đứa. Khi đó, chúng tôi nghèo khó nhưng giàu có vô cùng về mặt tình cảm. Chúng tôi tin rằng chỉ cần có tình yêu, mọi thử thách đều có thể vượt qua. Thế nhưng, chúng tôi lại quên mất rằng tình yêu dẫu có lớn đến đâu cũng có thể bị bào mòn bởi những vụn vặt của cuộc sống thường nhật.\n\nSự rạn nứt đến một cách âm thầm, bắt đầu từ những cuộc gọi nhỡ không có người gọi lại, những lời than vãn về sự mệt mỏi trong công việc, và những khoảng lặng kéo dài trong các buổi hẹn hò. Chúng tôi không còn tìm thấy tiếng nói chung, không còn những chia sẻ thấu hiểu như ngày xưa nữa. Và rồi, một buổi chiều mưa, câu nói chia tay được thốt ra một cách nhẹ nhàng đến đáng sợ. Không có cãi vã, không có oán trách, chỉ có hai tâm hồn đã quá mệt mỏi tự giải thoát cho nhau. Người ấy bước xuống xe, đi thẳng vào màn mưa, còn tôi thì cứ ngồi chết trân nhìn theo, cảm giác như một phần linh hồn của mình vừa bị xé toạc ra vậy.\n\nĐã nhiều năm trôi qua, người ấy giờ chắc đã yên bề gia thất ở một thành phố khác, còn tôi cũng đã tìm được con đường đi cho riêng mình. Thước phim cũ ấy thi thoảng vẫn quay lại trong những giấc mơ của tôi, không còn mang lại sự đau đớn tột cùng như xưa, mà chỉ còn là một nỗi nhớ dịu dàng, xa xăm. Người cũ không hẹn ngày gặp lại, và có lẽ không gặp lại mới là cái kết đẹp nhất cho cả hai. Cảm ơn người vì đã xuất hiện trong những năm tháng thanh xuân của tôi, đã dạy cho tôi biết cách yêu và được yêu một cách trọn vẹn nhất.`
    }
];

/**
 * Hàm xử lý khi người dùng gõ lệnh !chualanh
 * @param {Message} message - Message object từ discord.js
 */
async function handleChuaLanhCommand(message) {
    if (message.content !== '!chualanh') return false;

    const KENH_CHUA_LANH = process.env.KENH_CHUA_LANH;

    // Kiểm tra kênh riêng biệt
    if (KENH_CHUA_LANH && message.channel.id !== KENH_CHUA_LANH) {
        const reply = await message.reply({ 
            content: `⚠️ Lệnh này chỉ được sử dụng tại kênh dành riêng cho Chữa Lành! (<#${KENH_CHUA_LANH}>)`,
        }).catch(() => {});
        
        if (reply) {
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        }
        return true; 
    }

    try {
        let indexNgauNhien;

        // Vòng lặp lấy ngẫu nhiên cho đến khi ra bài khác với bài vừa gõ trước đó
        do {
            indexNgauNhien = Math.floor(Math.random() * danhSachDoanVan.length);
        } while (indexNgauNhien === indexBaiTruocDo && danhSachDoanVan.length > 1);

        // Lưu lại vị trí bài này để lần sau không bị trùng
        indexBaiTruocDo = indexNgauNhien;

        const baiVan = danhSachDoanVan[indexNgauNhien];

        // Tạo giao diện Embed gửi bài văn
        const embed = new EmbedBuilder()
            .setTitle(baiVan.tieuDe)
            .setDescription(baiVan.noiDung)
            .setColor('#E8A0A0') // Màu hồng pastel nhẹ nhàng chữa lành
            .setTimestamp()
            .setFooter({ 
                text: `✍️ Trích dòng tự sự • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        await message.channel.send({ embeds: [embed] });
        return true;

    } catch (error) {
        console.error('❌ Lỗi xử lý lệnh !chualanh:', error);
        return false;
    }
}

module.exports = { handleChuaLanhCommand };