// src/handlers/poem.js
const { EmbedBuilder } = require('discord.js');

// =========================================================
// KHO TÀNG VĂN CHƯƠNG, THƠ CA, TRIẾT LÝ & AN ỦI
// =========================================================

// 1. Kho tàng thơ ca ngẫu nhiên theo giờ hoặc lệnh (!tho)
const POEM_DATABASE = [
    { title: "Huy Hoàng Và Le Lói", content: "Thà một phút huy hoàng rồi chợt tối\nCòn hơn buồn le lói suốt trăm năm." },
    { title: "Hỏi Thế Gian", content: "Hỏi thế gian tình ái là chi\nMà đôi lứa thề nguyền sống chết." },
    { title: "Đơn Phương", content: "Ta mang cả chân tình đi đặt cược\nNgười mỉm cười nói: 'Chẳng mượn tình ta'." },
    { title: "Tự Sự Đêm Khuya", content: "Rượu đắng rượu cay rượu vẫn hết\nNgười hứa người thề người vẫn quên." },
    { title: "Lối Rẽ", content: "Người đi nửa đời quên lối cũ\nTa đứng chờ hoài giữa cơn mưa." },
    { title: "Cố Nhân", content: "Ngoảnh lại nhìn nhau cười một thoáng\nHóa ra hai ngả, bước chung đường?\nÁo nhuốm bụi trần, tâm nhuốm mỏi\nKẻ gọi cố nhân, kẻ lạ thường." },
    { title: "Hạt Bụi Nhân Sinh", content: "Trăm năm một cõi đi về\nNgười đi, người ở, người thề, người quên.\nThôi thì một kiếp bình yên\nTâm không vướng bận, muộn phiền tự qua." }
];

// 2. Kho tàng văn chương sâu sắc, đa tầng nghĩa (!tôi buồn)
const SAD_QUOTES = [
    "Có những ngày, lồng ngực vỡ đôi mà bên ngoài vẫn phải tỏ ra bình thản. Thế giới này bận rộn quá, người ta chỉ nhìn vào kết quả chứ chẳng mấy ai hỏi han quá trình. Nếu mệt rồi, cứ nép vào một góc mà khóc, không cần phải luôn tỏ ra kiên cường đâu.",
    "Bình minh luôn đến sau đêm dài tăm tối nhất. Nỗi buồn của bạn hôm nay giống như một trận mưa rào qua thung lũng, tuy có ướt át, có lạnh lẽo, nhưng chính nó sẽ nuôi dưỡng những đóa hoa kiên cường nở rộ vào ngày mai. Hãy bao dung với chính mình thêm một chút nhé.",
    "Bầu trời hoàng hôn hôm nay rất đẹp, nhưng tiếc là lòng bạn lại mang bão giông. Đừng cố ép bản thân phải quên đi hay tỏ ra ổn. Khóc không phải là yếu đuối, đó là khi tâm hồn bạn đang tự gột rửa những tổn thương mà đôi vai này đã gánh vác quá lâu.",
    "Nhân sinh như ngược lữ, đồng hành chỉ một đoạn. Hóa ra, có những người xuất hiện trong cuộc đời bạn chỉ để dạy cho bạn cách chấp nhận sự cô đơn. Bản thân việc bạn tồn tại và vượt qua được đến ngày hôm nay, đã là một điều kỳ diệu lắm rồi.",
    "Trưởng thành là một hành trình cô độc, nơi bạn phải học cách tự làm lành những vết thương không tên mà chẳng thể giải thích cùng ai. Có những đêm, thành phố rựcỡ ánh đèn, dòng người ngược xuôi tấp nập, nhưng tiếng ồn ào ấy lại càng làm bật lên sự im lặng đến đáng sợ trong lồng ngực bạn.",
    "Chúng ta dành cả thanh xuân để chạy theo những kỳ vọng của người khác: làm một đứa con ngoan, một nhân viên tốt, một người trưởng thành vững vàng. Nhưng cuối cùng, nhìn lại trong gương, bạn lại chẳng biết mình thực sự là ai, và lần cuối cùng bạn cười một cách vô tư không vướng bận là từ bao giờ?",
    "Nỗi buồn đáng sợ nhất không phải là khi ta khóc thành tiếng, mà là khi đối mặt với giông bão, ta chỉ biết im lặng. Một sự im lặng đến tê dại, khi những tổn thương đã tích tụ quá nhiều thành một khối băng dày, khiến bạn không còn muốn giải thích, không còn muốn than vãn, chỉ muốn thu mình lại bảo vệ chút hơi ấm tàn dư.",
    "Đôi khi, chúng ta cảm thấy kiệt quệ không phải vì những việc mình đang làm, mà vì những điều mình phải chịu đựng trong âm thầm. Bạn luôn dang tay ôm lấy thế giới, sưởi ấm cho người khác, nhưng lại quên mất rằng chính bản thân mình cũng đang run rẩy trong cái lạnh của sự lãng quên."
];

// 3. Kho tàng thơ ca chạm tới tâm can về tình yêu (!tôi muốn được yêu)
const LOVE_POEMS = [
    { title: "Chân Tình Sót Lại", content: "Ta đem lòng thương một người không thương nữa\nGom hết chân tình đốt thành tàn tro.\nNgười đi qua phố, người quên lối cũ\nTa đứng bên đường, đếm những tàn dư." },
    { title: "Ước Nguyện Tầm Thường", content: "Muốn làm một nhành hoa dại bên đường\nĐược người thương ghé mắt nhìn một thoáng.\nChẳng cầu oanh liệt, chẳng cầu trăm năm\nChỉ mong một lần, tim người có ta." },
    { title: "Kẻ Lội Ngược Dòng", content: "Thế giới bảy tỉ người đang hối hả\nTa chỉ muốn dừng lại phía sau lưng.\nNhìn người hạnh phúc bên tình yêu mới\nNuốt ngược lệ sầu, chúc chữ 'bình an'." },
    { title: "Chờ Đợi Vô Vọng", content: "Người bảo người muốn được yêu thương lắm\nNhưng khi ta đến, người lại quay đi.\nHóa ra người cần một hình bóng khác\nChẳng phải chân tình, càng chẳng phải ta." },
    { title: "Nghịch Lý Đơn Phương", content: "Ta giấu tên người trong từng hơi thở\nMượn chút bóng hình vẽ bức tranh mơ.\nNhưng đời tàn nhẫn, người đâu biết\nKẻ thức thâu đêm viết vần thơ khờ." },
    { title: "Mưa Qua Tim", content: "Phố cũ chiều nay mưa giăng lối\nTình cũ giờ đây hóa mây trôi.\nNgười tìm bến đỗ, người vui mới\nTa giữ riêng mình đắng bờ môi." },
    { title: "Mượn Một Đoạn Tình", content: "Mượn người một cái ôm thật khẽ\nMượn chút dịu dàng thuở đôi mươi.\nTrả người một kiếp đời lặng lẽ\nXóa hết ân tình, tắt nụ cười." }
];

// 4. Kho tàng triết lý nhân sinh vô thường (!triết lí)
const PHILOSOPHY_QUOTES = [
    "Nghịch lý của cuộc đời là chúng ta thường dùng sức khỏe để đổi lấy tiền tài, rồi lại dùng tiền tài để cố mua lại sức khỏe. Cát bụi rồi lại về với cát bụi, danh vọng hay hào quang bên ngoài xét cho cùng cũng chỉ là tấm áo khoác mượn tạm của nhân gian. Sống thanh thản ở hiện tại mới là đỉnh cao của tu hành.",
    "Bản chất của đau khổ không nằm ở những gì xảy ra với bạn, mà nằm ở cách bạn phản ứng với nó và độ bám chấp của bạn vào quá khứ. Khi bạn hiểu rằng vạn vật trên thế gian này đều có kỳ hạn, sự gặp gỡ là duyên, sự ly biệt là lẽ thường, tâm bạn tự khắc sẽ như dòng nước phẳng lặng.",
    "Người ta thường nhìn vào những thứ mình chưa có rồi sinh lòng oán hận, mà quên mất rằng những thứ mình đang sở hữu từng là niềm mơ ước của biết bao người. Biết đủ chính là phú quý, tâm an chính là thái bình. Thắng được vạn người không bằng tự chiến thắng chính bản thân mình.",
    "Đừng quá để tâm đến lời người khác nói, bởi vì họ chỉ đứng ở góc độ cá nhân để phán xét một phần cuộc đời bạn. Cuộc sống của bạn giống như một cuốn sách, bạn là tác giả chứ không phải là người đọc. Hãy sống sao cho đến ngày nhắm mắt, bạn không phải tiếc nuối vì đã sống hộ cuộc đời của một ai khác.",
    "Nước càng sâu càng tĩnh, người càng hiểu biết càng khiêm nhường. Đường đời dài rộng, những kẻ vội vã huênh hoang thường ngã đau ở khúc cua lộ liễu. Tu dưỡng lớn nhất của một đời người là giữ được cái đầu lạnh trước cám dỗ và một trái tim ấm áp trước những mảnh đời gian truân.",
    "Hóa ra, đỉnh cao của sự trưởng thành không phải là khi bạn trở nên sắc sảo, thích tranh luận đúng sai với cả thế giới. Mà là khi bạn nhìn thấy những điều chướng tai gai mắt, nhìn thấy lòng người nóng lạnh tráo trở, bạn chỉ mỉm cười, bình thản bước qua và tập trung vào hành trình của riêng mình."
];

// 5. Kho tàng văn tự sự ủi an tâm hồn khi kiệt sức (!mệt)
const COMFORT_QUOTES = [
    "Tôi biết bạn đã có một ngày thật dài với những guồng quay mệt mỏi, vai áo đã nặng trĩu những lo toan mà chẳng thể thở than cùng ai. Nghe tôi này, hôm nay bạn đã làm rất tốt rồi. Nếu thế giới ngoài kia khắc nghiệt quá, hãy đóng cửa phòng lại, thả lỏng đôi vai, uống một ngụm nước ấm và cho phép mình được lười biếng một tối. Ngày mai tính sau, đêm nay hãy chỉ dịu dàng với chính mình thôi nhé.",
    "Đôi khi, việc cảm thấy kiệt sức không có nghĩa là bạn yếu đuối, mà là vì bạn đã phải mạnh mẽ trong một thời gian quá dài. Bạn không cần phải luôn nở nụ cười, cũng không cần phải tràn đầy năng lượng mỗi ngày. Cuộc đời có nhịp điệu của nó, có lúc thăng thì phải có lúc trầm. Hãy coi sự mệt mỏi này như một tín hiệu từ cơ thể, nhắc bạn rằng đã đến lúc dừng lại, nghỉ ngơi và sạc lại năng lượng rồi.",
    "Bạn đang cảm thấy bất lực vì mọi chuyện không đi theo ý muốn đúng không? Có cảm giác như bản thân đã cố hết sức nhưng đổi lại chỉ là sự bế tắc. Đừng vội nản lòng, đôi khi vũ trụ bắt bạn dừng lại không phải để từ bỏ, mà là để bạn nhìn nhận lại mọi thứ rõ ràng hơn. Một cái cây muốn vươn cao thì rễ phải cắm thật sâu vào lòng đất tối. Giai đoạn mỏi mệt này chính là lúc rễ của bạn đang cắm sâu hơn đấy. Nghỉ một chút đi, rồi chúng ta lại bước tiếp.",
    "Thành phố này có hàng vạn ánh đèn, nhưng đôi khi chẳng có ánh đèn nào thấu hiểu được nỗi cô đơn và sự mệt mỏi của bạn. Người ta chỉ hỏi bạn lương tháng bao nhiêu, công việc thế nào, mua được gì rồi, chứ chẳng mấy ai hỏi bạn có mệt không. Nhưng ở đây, chiếc bot này luôn sẵn sàng lắng nghe. Bạn mệt rồi đúng không? Vậy thì cứ nghỉ đi, không cần gồng mình lên nữa. Bạn đã đi một chặng đường rất dài rồi, xứng đáng được yêu thương và bao dung.",
    "Hãy để lại tất cả những deadline, những lời phán xét, những áp lực vô hình ngoài cánh cửa. Đêm nay, bạn không cần phải làm một người trưởng thành hoàn hảo đầy trách nhiệm nữa. Hãy cứ là một đứa trẻ được quyền mỏi mệt, được quyền từ chối cả thế giới để chìm vào một giấc ngủ thật sâu. Mọi giông bão ngoài kia, cứ để ngày mai xử lý. Chúc bạn có một đêm bình yên."
];

// =========================================================
// HÀM BỔ TRỢ TẠO EMBED
// =========================================================
function getRandomPoemEmbed() {
    const randomPoem = POEM_DATABASE[Math.floor(Math.random() * POEM_DATABASE.length)];
    return new EmbedBuilder()
        .setColor('#ff99cc')
        .setTitle(`${randomPoem.title}`)
        .setDescription(`*${randomPoem.content.replace(/\n/g, '*\n*')}*`)
        .setFooter({ text: '💭 Thả một nhành hoa cho tâm hồn thanh thản...' })
        .setTimestamp();
}

// =========================================================
// HÀM XỬ LÝ CHÍNH XUẤT KHẨU RA NGOÀI
// =========================================================

// 🕒 HÀM 1: CHẠY NGẦM TỰ ĐỘNG THẢ THƠ THEO GIỜ
function startAutoPoem(client) {
    const channelId = process.env.KENH_NGAM_THO;
    if (!channelId) return console.log("⚠️ Chưa cấu hình KENH_NGAM_THO trong file .env");

    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(channelId);
            if (channel) {
                const embed = getRandomPoemEmbed();
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error("❌ Lỗi khi tự động gửi thơ:", error);
        }
    }, 60 * 60 * 1000); // Cứ 1 tiếng gửi 1 bài
}

// 💬 HÀM 2: LUỒNG ĐÓN NHẬN VÀ XỬ LÝ CÁC MẬT LỆNH CHAT
async function handlePoemCommand(message) {
    const content = message.content.trim().toLowerCase();
    
    // Khai báo danh sách lệnh để lọc tin nhắn nhanh (Đã đổi !poem thành !tho)
    const targetCommands = [
        '!tho', 
        '!tôi buồn', '!toi buon', 
        '!tôi muốn được yêu', '!toi muon duoc yeu',
        '!triết lí', '!triet li', '!triết lý', '!triet ly',
        '!mệt', '!met'
    ];
    if (!targetCommands.includes(content)) return false;

    const channelId = process.env.KENH_NGAM_THO;
    
    // Khóa kênh: Nếu gõ sai kênh quy định, nhắc nhở chuyển kênh
    if (channelId && message.channel.id !== channelId) {
        return message.reply(`❌ Đạo hữu muốn thưởng thơ hay chia sẻ nỗi lòng vui lòng di chuyển qua kênh <#${channelId}> nhé!`).catch(() => {});
    }

    // Luồng xử lý lệnh 1: !tho (Đã cập nhật lệnh mới)
    if (content === '!tho') {
        const embed = getRandomPoemEmbed();
        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // Luồng xử lý lệnh 2: !tôi buồn
    if (content === '!tôi buồn' || content === '!toi buon') {
        const randomSad = SAD_QUOTES[Math.floor(Math.random() * SAD_QUOTES.length)];
        const embed = new EmbedBuilder()
            .setColor('#4a90e2') // Màu xanh biển trầm buồn sâu thẳm
            .setTitle('🌊 Trải Lòng Cùng Nhân Sinh')
            .setDescription(`${randomSad}`)
            .setFooter({ text: `Gửi từ trái tim đến ${message.author.username} • Hãy bao dung với chính mình.` })
            .setTimestamp();

        await message.reply({ embeds: [embed] }).catch(() => {});
        return true;
    }

    // Luồng xử lý lệnh 3: !tôi muốn được yêu
    if (content === '!tôi muốn được yêu' || content === '!toi muon duoc yeu') {
        const randomLove = LOVE_POEMS[Math.floor(Math.random() * LOVE_POEMS.length)];
        const embed = new EmbedBuilder()
            .setColor('#e06666') // Màu đỏ hoài niệm day dứt
            .setTitle(`💔 Tình Khắc Tâm Can: ${randomLove.title}`)
            .setDescription(`*${randomLove.content.replace(/\n/g, '*\n*')}*`)
            .setFooter({ text: `Lắng nghe tiếng lòng đơn côi của ${message.author.username}...` })
            .setTimestamp();

        await message.reply({ embeds: [embed] }).catch(() => {});
        return true;
    }

    // Luồng xử lý lệnh 4: !triết lí
    if (['!triết lí', '!triet li', '!triết lý', '!triet ly'].includes(content)) {
        const randomPhilosophy = PHILOSOPHY_QUOTES[Math.floor(Math.random() * PHILOSOPHY_QUOTES.length)];
        const embed = new EmbedBuilder()
            .setColor('#a881af') // Màu tím phong sương, triết lý cổ kính
            .setTitle('🔮 Triết Lý Nhân Sinh & Vô Thường')
            .setDescription(`${randomPhilosophy}`)
            .setFooter({ text: `Ngẫm nghĩ cùng đạo hữu ${message.author.username} • Tâm an vạn sự an.` })
            .setTimestamp();

        await message.reply({ embeds: [embed] }).catch(() => {});
        return true;
    }

    // Luồng xử lý lệnh 5: !mệt
    if (content === '!mệt' || content === '!met') {
        const randomComfort = COMFORT_QUOTES[Math.floor(Math.random() * COMFORT_QUOTES.length)];
        const embed = new EmbedBuilder()
            .setColor('#2ecc71') // Màu xanh lá nhẹ nhàng, mang lại cảm giác an yên, xoa dịu
            .setTitle('🍃 Một Chút Vỗ Về Cho Đêm Mỏi Mệt')
            .setDescription(`${randomComfort}`)
            .setFooter({ text: `Đồng cảm cùng áp lực của ${message.author.username} • Hôm nay bạn làm tốt rồi.` })
            .setTimestamp();

        await message.reply({ embeds: [embed] }).catch(() => {});
        return true;
    }

    return false;
}

module.exports = { startAutoPoem, handlePoemCommand };