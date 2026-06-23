const { EmbedBuilder } = require('discord.js');

// Biến lưu trữ bài viết vừa gửi gần nhất để chống trùng lặp tuyệt đối
let indexBaiTruocDo = -1;

// Danh sách 22 bài viết với tiêu đề thấm thía, xoa dịu và chữa lành tận sâu tâm hồn
const danhSachDoanVan = [
    {
        tieuDe: "🦋 Đi qua những chật hẹp, bạn mới biết mình có thể bay xa",
        noiDung: "Cái kén không giam cầm con bướm, nó đang âm thầm dạy nó cách trưởng thành.\n\nKhoảnh khắc con bướm nỗ lực cựa quậy, ép mình để chui ra khỏi chiếc kén chật hẹp chính là lúc chất lỏng trong cơ thể được đẩy vào đôi cánh. Nếu không có áp lực tự thân đó, đôi cánh sẽ mãi mãi mềm yếu. Những giai đoạn chông chênh khó khăn không phải là cái bẫy giam cầm, mà là lúc nội lực của bạn đang được mài giũa âm thầm nhất."
    },
    {
        tieuDe: "🌱 Có những ngày tăm tối, chỉ là để bạn cắm rễ sâu hơn",
        noiDung: "Hạt giống không bị chôn vùi dưới bùn lầy, nó đang học cách cắm rễ thật sâu trước khi vươn mình đón nắng.\n\nBóng tối và sự ngột ngạt dưới lòng đất không phải để tiêu diệt hạt mầm, mà là khoảng lặng bắt buộc để nó tích lũy dưỡng chất. Đừng sợ những giai đoạn tăm tối của cuộc đời, đó là lúc bạn đang cắm rễ thật sâu để chuẩn bị cho một sự trỗi dậy vững chãi trước giông bão."
    },
    {
        tieuDe: "🥚 Đừng sợ tổn thương, đó là lúc một sinh mệnh mới bắt đầu",
        noiDung: "Vỏ trứng vỡ từ bên ngoài là thức ăn, vỡ từ bên trong mới là sinh mệnh.\n\nÁp lực từ thế giới bên ngoài đôi khi khiến chúng ta cảm thấy tổn thương và tan vỡ. Nhưng nếu sự phá vỡ đó xuất phát từ nỗ lực và khát vọng bên trong của chính bạn, đó là lúc một phiên bản mạnh mẽ hơn được khai sinh. Đừng sợ những vết nứt, vì đó là nơi ánh sáng và sức mạnh bắt đầu lộ diện."
    },
    {
        tieuDe: "💎 Những va đập mệt nhoài hôm nay đang tạo nên một viên kim cương",
        noiDung: "Than đá và kim cương đều cấu tạo từ carbon, nhưng kim cương chịu được những áp lực mà than đá từ chối.\n\nSự khác biệt giữa một cuộc đời bình thường và một cuộc đời rực rỡ nằm ở khả năng đối diện với thử thách. Những áp lực nặng nề nhất không phải để nghiền nát bạn, mà là để mài giũa bạn từ một khối than thô kệch trở thành một viên kim cương kiên cường và sáng giá."
    },
    {
        tieuDe: "🍁 Cây cối còn biết trút lá mùa đông, sao bạn chưa chịu để lòng mình nghỉ ngơi?",
        noiDung: "Cây cối trút lá vào mùa đông không phải vì nó kiệt quệ, mà để tiết kiệm năng lượng cho một mùa xuân đâm chồi.\n\nSự lùi lại, sự im lặng hay những mất mát tạm thời thực chất là sự chuẩn bị thông minh của cơ thể và tâm trí. Khi bạn cảm thấy mình trống rỗng và chững lại, hãy nhớ thiên nhiên cũng cần mùa đông để nghỉ ngơi trước khi tích lũy đủ nội lực cho một mùa nở hoa rực rỡ."
    },
    {
        tieuDe: "🌊 Dòng đời xô bồ chỉ muốn gọt bớt những nét xù xì tổn thương",
        noiDung: "Dòng nước xiết không làm tổn thương viên đá, nó đang gọt giũa những góc cạnh xù xì để biến nó thành viên cuội mịn màng.\n\nNhững va vấp hay hoàn cảnh ngặt nghèo giống như dòng nước dữ dội của con suối. Thay vì oán trách tại sao cuộc đời quá gai góc, hãy hiểu rằng dòng đời đang giúp bạn gọt bớt đi sự nóng nảy, xù xì, để lại một phiên bản bao dung và chín chắn hơn."
    },
    {
        tieuDe: "🧱 Những cánh cửa đóng lại chỉ để dẫn bạn đến một lối đi bình yên hơn",
        noiDung: "Bức tường dựng lên không phải để ngăn bạn lại, nó chỉ muốn hỏi xem bạn thực sự khao khát điều ở phía sau đến mức nào.\n\nSự từ chối của cuộc đời đôi khi là một sự bảo vệ ngầm, hoặc là một bài kiểm tra tư cách. Nó buộc bạn phải dừng lại, tư duy khác đi, tìm một lối đi sáng tạo hơn thay vì cứ lao đầu vào một lối mòn cũ. Thất bại chỉ là một dấu phẩy để bạn lấy hơi trước khi viết tiếp."
    },
    {
        tieuDe: "👤 Hãy dịu dàng với chính mình trong những khoảng lặng cô đơn",
        noiDung: "Sự cô đơn không phải là một hình phạt, đó là khoảng thời gian định vị lại bản thân để không bị lạc giữa đám đông.\n\nChính những lúc cô độc nhất lại là lúc bạn nghe rõ tiếng lòng mình nhất. Đó là thời điểm bạn dọn dẹp lại những hỗn độn trong tâm trí, nhận ra mình thực sự cần gì, muốn gì và là ai, thay vì cứ mãi chạy theo kỳ vọng và định nghĩa về hạnh phúc của người khác."
    },
    {
        tieuDe: "🩹 Vết nứt là nơi để ánh sáng chở che đi vào tâm hồn bạn",
        noiDung: "Vết nứt trên chiếc bát gốm không làm mất đi giá trị của nó, người Nhật dùng vàng để hàn gắn nó và biến nó thành một tác phẩm độc nhất.\n\nAi trong đời cũng có những đổ vỡ và vết sẹo trong tim. Đừng cố che giấu hay xấu hổ vì chúng. Chính cách bạn đối diện, chữa lành và trao cho nó 'chất liệu vàng' của sự bao dung mới là thứ tạo nên một phiên bản sâu sắc, độc bản của chính bạn hôm nay."
    },
    {
        tieuDe: "⏳ Bạn không hề chậm trễ, bông hoa của bạn sẽ nở đúng mùa",
        noiDung: "Bạn không bị chậm trễ, bạn đang đi đúng múi giờ của cuộc đời mình.\n\nCuộc đời không phải là cuộc chạy marathon có chung một vạch đích. Hoa hồng không nở cùng mùa với hoa mai. Có người thành công ở tuổi 20 nhưng sớm kiệt quệ, có người 40 tuổi mới khởi nghiệp và hạnh phúc. Hãy cứ kiên trì đi trên con đường của mình, hoa của bạn sẽ nở vào đúng mùa của nó."
    },
    {
        tieuDe: "🩸 Buông tay không phải là bỏ cuộc, mà là ôm lấy chính mình",
        noiDung: "Cố chấp nắm chặt một chiếc xương rồng chỉ làm tay bạn rỉ máu, buông tay không phải là bỏ cuộc, mà là giải thoát cho chính mình.\n\nĐôi khi chúng ta nhầm tưởng kiên trì là cố giữ lấy một mối quan hệ độc hại, một công việc bào mòn hay một quá khứ đã qua. Buông bỏ đòi hỏi một lòng dũng cảm lớn hơn cả nắm giữ. Chỉ khi dám buông tay, bạn mới có khoảng trống để đón nhận những điều tốt đẹp hơn."
    },
    {
        tieuDe: "⚓ Trú chân ở bến cảng một chút thôi, rồi ta lại vững vàng ra khơi",
        noiDung: "Con tàu neo đậu ở cảng thì an toàn, nhưng đó không phải là lý do người ta đóng vịnh cho tàu.\n\nViệc bạn dừng lại ở một 'bến cảng' tạm thời là để trùng tu, bảo dưỡng và nạp nhiên liệu. Đừng để sự an toàn làm cùn đi ý chí của bạn, nhưng cũng đừng vội vã ra khơi khi giông bão bên ngoài chưa dứt. Hãy di chuyển khi con tàu của bạn đã thực sự sẵn sàng."
    },
    {
        tieuDe: "👁️ Học cách bao dung với những điều không hoàn hảo của thực tại",
        noiDung: "Nước quá trong thì không có cá, người quá cầu toàn thì chẳng có niềm vui.\n\nChúng ta đau khổ không phải vì thực tại tồi tệ, mà vì nó không diễn ra đúng như cái khuôn mẫu hoàn hảo ta tự vẽ ra. Chấp nhận những vết xước của thực tại, bao dung với khuyết điểm của bản thân không phải là thỏa hiệp, mà là cách bạn cởi trói cho tâm hồn mình khỏi áp lực vô hình."
    },
    {
        tieuDe: "🥀 Biết thương người, nhưng xin bạn nhớ thương cả bản thân",
        noiDung: "Nếu bạn luôn là người thắp sáng cho người khác, hãy đảm bảo rằng bạn không phải là người duy nhất bị thiêu rụi.\n\nLuôn nghĩ cho người khác là tốt, nhưng nếu không có ranh giới, lòng tốt sẽ biến thành sự tự ngược đãi. Đôi khi việc nói 'Không' với người khác chính là câu nói 'Có' mạnh mẽ nhất dành cho chính bạn. Muốn yêu thương thế giới, bạn phải đổ đầy chiếc bình năng lượng của mình trước."
    },
    {
        tieuDe: "🕳️ Cuốn sách cũ đã khép, hãy tự tay viết nên chương mới cuộc đời",
        noiDung: "Bạn không thể lật lại trang sách cũ và mong đợi một cái kết khác đi.\n\nDằn vặt vì hai chữ 'giá như' là cách nhanh nhất hủy hoại hiện tại. Những sai lầm quá khứ là những gì tốt nhất mà phiên bản lúc đó có thể làm với nhận thức họ có. Hãy biết ơn họ vì đã gánh chịu hậu quả để bạn có sự khôn ngoan hôm nay. Trang sách cũ đã khép, cây bút viết chương mới đang ở tay bạn."
    },
    {
        tieuDe: "🎭 Cứ là ngọn nến nhỏ, sưởi ấm góc phòng theo cách của riêng bạn",
        noiDung: "Ngọn nến không cần phải cố gắng bắt chước ánh sáng của mặt trời để chứng minh nó có ích, nó chỉ cần thắp sáng góc phòng tối của riêng mình.\n\nCố gắng trở thành một 'bản sao' thành đạt theo tiêu chuẩn của đám đông chỉ khiến bạn kiệt sức. Sứ mệnh của bạn trong cuộc đời này không phải là vượt qua tất cả mọi người, mà là tìm ra giá trị độc bản của mình và tỏa sáng trong tầm ảnh hưởng của riêng bạn."
    },
    {
        tieuDe: "🤝 Giải thoát cho một người cũng là lúc giải phóng cho trái tim ta",
        noiDung: "Có những mối quan hệ kéo dài không phải vì tình yêu, mà vì cả hai đều sợ cảm giác phải bắt đầu lại từ con số không.\n\nNíu giữ một người đã nguội lạnh chỉ là cách bạn kéo dài bản án tổn thương cho cả hai. Sự quen thuộc đôi khi là cái bẫy tâm lý êm ái khiến bạn nhầm tưởng đó là bình yên. Dũng cảm bước ra khỏi vùng đổ vỡ cũ mới là lúc bạn trả lại sự tôn nghiêm cho chính cuộc đời mình."
    },
    {
        tieuDe: "🌪️ Đừng trốn chạy giông bão, hãy tin vào sức mạnh nội tại bên trong",
        noiDung: "Cách duy nhất để chế ngự nỗi sợ hãi là lao thẳng vào nó, thay vì đứng ở rìa ngoài và cầu nguyện giông bão qua đi.\n\nTrốn tránh thử thách chỉ làm nỗi sợ trong tâm trí bạn phình to ra. Khi bạn dám đứng đối diện với viễn cảnh tồi tệ nhất, bạn sẽ nhận ra mọi việc thực chất không đáng sợ đến thế. Tâm bão luôn là nơi lặng gió nhất, và bình yên chỉ đến khi bạn có đủ bản lĩnh để đi xuyên qua nó."
    },
    {
        tieuDe: "🗣️ Hãy mỉm cười với thế gian, nhưng giữ tâm mình tĩnh lặng",
        noiDung: "Cố gắng sống vừa mắt tất cả mọi người là cách nhanh nhất để bạn đánh mất đi bản sắc của chính mình.\n\nMiệng đời là một chiếc túi không đáy, bạn có tốt đẹp đến đâu cũng sẽ có những phiên bản méo mó về bạn qua lời kể của kẻ khác. Hãy học cách phớt lờ những phán xét độc hại. Miễn là bạn sống không thẹn với lòng, sự quay lưng của đám đông ngoài kia thực chất lại là một bộ lọc tự nhiên giúp bạn giữ lại những người thực sự xứng đáng."
    },
    {
        tieuDe: "🕯️ Khi màn đêm buông xuống, sự giàu có đích thực nằm ở bình yên",
        noiDung: "Vật chất rực rỡ bên ngoài không khỏa lấp được sự nghèo nàn và trống rỗng trong thế giới nội tâm.\n\nChúng ta lao vào những món đồ xa xỉ, những danh xưng hào nobility cốt chỉ để tìm kiếm sự công nhận từ những người ta thậm chí còn chẳng hề yêu quý. Khi màn đêm buông xuống và lớp ngụy trang cởi bỏ, sự cô độc vẫn vẹn nguyên ở đó. Đầu tư vào tri thức, sự thấu hiểu và bình yên nội tại mới là tài sản duy nhất không bị mất giá theo thời gian."
    },
    {
        tieuDe: "♟️ Bạn là người nắm giữ cây bút vẽ nên bức tranh cuộc đời mình",
        noiDung: "Nếu bạn không tự định đoạt và thiết kế cuộc đời mình, bạn sẽ mãi là một quân cờ trong kế hoạch của kẻ khác.\n\nSự thụ động, luôn chờ đợi người khác chỉ lối hay dựa dẫm vào hoàn cảnh sẽ biến bạn thành nạn nhân của định mệnh. Dù quyết định của bạn có dẫn đến sai lầm, thì cái sai đó cũng mang lại cho bạn bài học xương máu quý giá. Hãy cầm lấy quyền tự quyết, chấp nhận rủi ro và chịu trách nhiệm 100% với vận mệnh của mình."
    },
    {
        tieuDe: "⚖️ Cho đi bằng cả sự chân thành, nhận lại sự thanh thản vô ngần",
        noiDung: "Cho đi mà luôn mong cầu sự đền đáp thì đó không phải là lòng tốt, đó là một giao dịch thương mại độc hại.\n\nKhi bạn kỳ vọng quá nhiều vào việc người khác phải biết ơn hay đối xử lại tương tự với mình, bạn đang tự giao chìa khóa cảm xúc của mình vào tay họ. Hãy cho đi bằng sự tự nguyện, hoặc dừng lại nếu thấy năng lượng của bản thân bị lợi dụng. Sự thanh thản chỉ xuất hiện khi tâm bạn không còn vướng bận bởi hai chữ 'sòng phẳng'."
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

        // VÒNG LẶP (LOOP): Random liên tục cho tới khi ra bài khác với bài vừa gọi liền trước
        do {
            indexNgauNhien = Math.floor(Math.random() * danhSachDoanVan.length);
        } while (indexNgauNhien === indexBaiTruocDo && danhSachDoanVan.length > 1);

        // Ghi đè bài vừa lấy vào lịch sử để vòng lặp (loop) lượt tiếp theo đối chiếu
        indexBaiTruocDo = indexNgauNhien;

        const baiVan = danhSachDoanVan[indexNgauNhien];

        // Giao diện Embed nhẹ nhàng, êm dịu thích hợp cho việc chữa lành
        const embed = new EmbedBuilder()
            .setTitle(baiVan.tieuDe)
            .setDescription(baiVan.noiDung)
            .setColor('#E3C4A8') // Đổi sang màu nâu be/vàng cát ấm áp, đem lại sự an tâm, nhẹ nhàng
            .setTimestamp()
            .setFooter({ 
                text: `🌿 Chậm lại một chút để vỗ về tâm hồn • Yêu cầu bởi ${message.author.username}`, 
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