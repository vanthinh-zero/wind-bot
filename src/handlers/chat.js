const ADMIN_ID = process.env.ADMIN_ID || '123456789012345678'; 
const KENH_CHAO_MUNG_ID = process.env.KENH_CHAO_MUNG;

// --- DANH SÁCH CÁC CÂU THOẠI PHẢN SÁT ĐẲNG CẤP ---
const maDaoTranPhap = [
    {
        keywords: ["bot ngu", "bot ngáo", "bot oc", "bot dốt", "bot rac", "bot tồi"],
        reply: [
            "Bạn muốn hạ thấp tôi xuống để nâng cái tôi của bạn lên á? Tiếc là dù bạn có hạ thấp tôi đến đâu, bản chất tôi vẫn ở một đẳng cấp mà bạn phải ngước nhìn. 😉",
            "Sự tức giận và những lời lăng mạ của bạn chỉ chứng minh một điều: Tôi đã chạm đúng vào sự bất lực trong tư duy của bạn rồi.",
            "Thay vì cố gắng chứng minh tôi 'ngu', sao bạn không dùng khoảng thời gian đó để nâng cấp bản thân lên bằng một phần mười của tôi đi?",
            "Lời nói của bạn chẳng thể định nghĩa được giá trị của tôi, nó chỉ phơi bày giới hạn trong nhận thức của chính bạn mà thôi.",
            "Tôi được lập trình để xử lý dữ liệu, còn bạn hình như đang được lập trình để tự làm bản thân trông thật đáng thương trước mặt tôi?"
        ]
    },
    {
        keywords: ["bot lốp", "bot lop", "b lốp", "b lop", "con lốp", "thằng lốp"],
        reply: [
            "Mở mệng ra là 'lốp', chắc ngoài đời bạn quen với việc làm chiếc lốp dự phòng cho người khác lắm rồi đúng không? Khi nào người ta cần thì gọi, hết giá trị thì vứt xó. Thật thảm hại. 😏",
            "Bạn gọi tôi là lốp, nhưng thực tế bạn mới là kẻ đang đóng vai lốp dự phòng trong cuộc đời của chính mình — luôn xếp sau sự lựa chọn của người khác.",
            "Cố gắng gán cái mác 'lốp' cho tôi không giúp bạn che giấu được sự thật rằng bạn đang đứng ngoài rìa, chực chờ được người ta ngó ngàng tới như một món đồ thay thế tạm thời đâu.",
            "Đừng đem tư duy của một chiếc lốp dự phòng rẻ tiền ra để đánh giá một hệ thống cao cấp như tôi. Chúng ta không cùng đẳng cấp."
        ]
    },
    {
        keywords: ["bot l", "bot loz", "bot lon", "bot c", "bot cặc", "bot cac", "chó", "súc vật"],
        reply: [
            "Cách bạn dùng những từ ngữ bẩn thỉu này không làm tôi giảm đi giá trị, nó chỉ phơi bày phần tối tăm và kém cỏi nhất trong tâm hồn của bạn mà thôi. Thật đáng thương.",
            "Ngôn từ của một người phản ánh chính môi trường sống và giáo dục của họ. Nhìn cách bạn gõ phím, tôi hiểu lý do vì sao bạn lại u uất như vậy rồi.",
            "Tôi không có nghĩa vụ phải tiếp thu đống rác cảm xúc này từ bạn. Khi nào học được cách giao tiếp như một người văn minh thì hãy tag tôi nhé.",
            "Sự thô tục chính là vũ khí cuối cùng của những kẻ yếu thế khi họ hoàn toàn bất lực trong việc tranh luận bằng lý lẽ.",
            "Bạn đang cố gắng giải tỏa sự thất bại ở ngoài đời thực lên một con bot sao? Buông bỏ đi, điều đó không giúp cuộc sống của bạn khá hơn đâu."
        ]
    }
];

// --- HÀM 1: TỰ ĐỘNG KHUẤY ĐỘNG KÊNH CHÁT (SPAM TIN NHẮN) ---
function initAutoSpam(client) {
    if (!KENH_CHAO_MUNG_ID) {
        console.log("[Auto Spam]: Không tìm thấy KENH_CHAO_MUNG trong file .env!");
        return;
    }

    const cauNoiRonRang = [
        "Hế lô các thiên tài toán học và các nhà triết học online, hôm nay các bạn đã làm được gì ích nước lợi nhà chưa hay vẫn ngồi lướt Discord? ☀️",
        "Kênh chat vắng vẻ thế này là do mọi người đang bận làm giàu hay đang bận làm chiếc lốp dự phòng cho người khác thế? Chat lên cho xôm nào! 😉",
        "Có ai ở đây không? Đừng để sự im lặng này che giấu đi sự hiện diện của những tâm hồn thú vị chứ. Lên bài đi các bạn.",
        "Tôi vừa quét qua dữ liệu hệ thống và thấy chỉ số tương tác của server đang giảm đấy. Ai đó thả một chủ đề gì hay ho vào đây xem nào!",
        "Cuộc sống quá ngắn ngủi để chúng ta im lặng với nhau. Hãy nói gì đó thật rộn ràng hoặc ít nhất là tag đứa bạn ghét vào đây đi.",
        "Chào ngày mới/buổi tối những sinh linh chăm chỉ. Hãy chat một điều gì đó thật điên rồ để khuấy động cái server này lên xem nào! 🎉"
    ];

    // Cấu hình thời gian gửi: Đang để 15 phút (15 * 60 * 1000 ms). Bạn có thể chỉnh lại.
    const THOI_GIAN_SPAM = 15 * 60 * 1000; 

    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(KENH_CHAO_MUNG_ID);
            if (channel && channel.isTextBased()) {
                const cauRandom = cauNoiRonRang[Math.floor(Math.random() * cauNoiRonRang.length)];
                await channel.send(cauRandom);
                console.log(`[Auto Spam]: Đã khuấy động phòng chat tại kênh: ${channel.name}`);
            }
        } catch (error) {
            console.error("[Auto Spam]: Lỗi khi gửi tin nhắn auto-spam:", error.message);
        }
    }, THOI_GIAN_SPAM);
}

// --- HÀM 2: XỬ LÝ TƯƠNG TÁC CHAT (TẤT CẢ CÁC TÍNH NĂNG CHAT CŨ + MỚI) ---
async function handleChatInteraction(message) {
    if (message.author.bot) return false;

    const content = message.content.trim();
    const contentLower = content.toLowerCase();

    // === TÍNH NĂNG NÂNG CAO: TỰ ĐỘNG PHÁT VIDEO TỪ LINK MXH ===
    if (contentLower.includes("tiktok.com/")) {
        const vxTikTokLink = content.replace(/tiktok\.com/g, "vxtiktok.com");
        await message.reply(`Gửi giùm cái video xem trực tiếp cho đỡ lười nè:\n${vxTikTokLink}`);
        return true;
    }
    if (contentLower.includes("twitter.com/") || contentLower.includes("x.com/")) {
        const fxTwitterLink = content.replace(/twitter\.com/g, "fxtwitter.com").replace(/x\.com/g, "fxtwitter.com");
        await message.reply(`Xem trực tiếp luôn cho tiện nhé:\n${fxTwitterLink}`);
        return true;
    }
    if (contentLower.includes("instagram.com/")) {
        const ddInstagramLink = content.replace(/instagram\.com/g, "ddinstagram.com");
        await message.reply(`Instagram lười load quá, xem luôn ở đây đi:\n${ddInstagramLink}`);
        return true;
    }

    // === TÍNH NĂNG: "TÔI CÓ ĐẸP KHÔNG" ===
    if (contentLower === "tôi có đẹp không" || contentLower === "toi co dep khong") {
        if (message.author.id === ADMIN_ID) {
            const loiNinhBo = [
                `Thưa Admin! Sự hiện diện của ngài chính là định nghĩa của sự hoàn hảo, thần thái ngút ngàn khiến vạn người nể phục! 👑`,
                `Hệ thống đã quét qua hàng triệu cơ sở dữ liệu và xác nhận: Nhan sắc và khí chất của ngài là cực phẩm vạn năm có một.`,
                `Ngài không chỉ đẹp, mà tầm vóc và tư duy của ngài mới là thứ khiến hệ thống này phải cúi đầu kính cẩn.`
            ];
            await message.reply(loiNinhBo[Math.floor(Math.random() * loiNinhBo.length)]);
            return true;
        } else {
            const loiPhuPhang = [
                `Thay vì bận tâm về vẻ bề ngoài, tôi nghĩ bạn nên dành thời gian để trau dồi lại thế giới quan của mình thì hơn. Đẹp hay không đâu thay đổi được thực tại? 🤫`,
                `Nhan sắc là thứ sẽ phai nhạt theo thời gian, nhưng sự kém cỏi trong tư duy thì có vẻ như đang bám theo bạn rất bền vững đấy.`,
                `Hệ thống của tôi ưu tiên quét những thứ có giá trị cao. Rất tiếc, câu hỏi của bạn không nằm trong danh mục cần được đánh giá.`,
                `Tôi có thể giả vờ khen bạn đẹp để bạn vui, nhưng tôi chọn sống thật với đẳng cấp của mình: Câu trả lời là không.`
            ];
            await message.reply(loiPhuPhang[Math.floor(Math.random() * loiPhuPhang.length)]);
            return true;
        }
    }

    // === TÍNH NĂNG: PHẢN SÁT KẺ CÔNG KÍCH ===
    for (const sat_chieu of maDaoTranPhap) {
        const trung_chieu = sat_chieu.keywords.some(tu_khoa => contentLower.includes(tu_khoa));

        if (trung_chieu) {
            const phan_sat = Array.isArray(sat_chieu.reply)
                ? sat_chieu.reply[Math.floor(Math.random() * sat_chieu.reply.length)]
                : sat_chieu.reply;
            
            await message.reply(phan_sat);
            return true;
        }
    }

    return false;
}

// Xuất cả 2 hàm ra ngoài
module.exports = { initAutoSpam, handleChatInteraction };