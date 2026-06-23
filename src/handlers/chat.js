const ADMIN_ID = process.env.ADMIN_ID || '123456789012345678'; 
const KENH_CHAO_MUNG_ID = process.env.KENH_CHAO_MUNG;
const { AttachmentBuilder } = require('discord.js');
const https = require('https');

// --- HÀM TẢI DỮ LIỆU AN TOÀN TRÁNH LỖI SSL & HTML ---
function sfetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { rejectUnauthorized: false }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { 
                    if (data.trim().startsWith('<!DOCTYPE') || data.trim().startsWith('<html')) {
                        return reject(new Error("API trả về trang HTML lỗi thay vì JSON."));
                    }
                    resolve(JSON.parse(data)); 
                } catch (e) { 
                    reject(e); 
                }
            });
        }).on('error', (err) => reject(err));
    });
}

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
    }
];

// --- HÀM 1: TỰ ĐỘNG KHUẤY ĐỘNG KÊNH CHÁT ---
function initAutoSpam(client) {
    if (!KENH_CHAO_MUNG_ID) return;
    const cauNoiRonRang = [
        "Hế lô các thiên tài toán học và các nhà triết học online, hôm nay các bạn đã làm được gì ích nước lợi nhà chưa hay vẫn ngồi lướt Discord? ☀️",
        "Kênh chat vắng vẻ thế này là do mọi người đang bận làm giàu hay đang bận làm chiếc lốp dự phòng cho người khác thế? Chat lên cho xôm nào! 😉"
    ];
    const THOI_GIAN_SPAM = 15 * 60 * 1000; 
    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(KENH_CHAO_MUNG_ID);
            if (channel && channel.isTextBased()) {
                const cauRandom = cauNoiRonRang[Math.floor(Math.random() * cauNoiRonRang.length)];
                await channel.send(cauRandom);
            }
        } catch (error) {
            console.error("[Auto Spam]: Lỗi gửi bài:", error.message);
        }
    }, THOI_GIAN_SPAM);
}

// --- HÀM 2: XỬ LÝ TƯƠNG TÁC CHAT ---
async function handleChatInteraction(message) {
    if (message.author.bot) return false;

    const content = message.content.trim();
    const contentLower = content.toLowerCase();

    // === 🎥 TÍNH NĂNG: GỬI THẲNG VIDEO TIKTOK & XÓA LINK GỐC ===
    if (contentLower.includes("tiktok.com")) {
        console.log(`[TikTok] Phát hiện link từ cụm từ: ${content}`);
        
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const tiktokUrl = content.match(urlRegex)?.[0];

        if (tiktokUrl) {
            console.log(`[TikTok] Đang phân tích link: ${tiktokUrl}`);
            try {
                await message.channel.sendTyping();

                const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`;
                const responseData = await sfetch(apiUrl);
                
                const videoUrl = responseData?.data?.play;

                if (videoUrl) {
                    console.log(`[TikTok] Đã lấy được link video .mp4 thành công!`);
                    const videoAttachment = new AttachmentBuilder(videoUrl, { name: 'tiktok-video.mp4' });
                    
                    // Thử gửi file video lên Discord
                    await message.channel.send({
                        content: `🎬 Video TikTok từ **${message.author.username}**:`,
                        files: [videoAttachment]
                    });

                    console.log(`[TikTok] Gửi video lên Discord thành công.`);

                    // Gửi video trực tiếp thành công mới tiến hành xóa tin nhắn gốc
                    if (message.deletable) {
                        await message.delete().catch(() => null);
                        console.log(`[TikTok] Đã xóa tin nhắn chứa link gốc.`);
                    }
                    return true;
                } else {
                    console.log(`[TikTok] Không tìm thấy direct link video.`);
                }
            } catch (error) {
                console.error("[TikTok] Lỗi phát sinh (Có thể file quá nặng):", error.message);
                
                // PHƯƠNG ÁN DỰ PHÒNG: Nếu file quá nặng (>8MB hoặc >25MB) dẫn đến lỗi, bot sẽ chuyển sang gửi link nhúng trực tiếp sạch
                console.log(`[TikTok] Triển khai phương án dự phòng gửi link thay thế...`);
                const embedLink = tiktokUrl.replace(/tiktok\.com/g, "tnktok.com"); // Sử dụng tnktok thay thế vxtiktok đã sập
                await message.reply(`Dung lượng video lớn quá hệ thống không tải trực tiếp được, xem tạm tại đây nhé:\n${embedLink}`);
            }
        }
    }

    // === TÍNH NĂNG: "TÔI CÓ ĐẸP KHÔNG" ===
    if (contentLower === "tôi có đẹp không" || contentLower === "toi co dep khong") {
        if (message.author.id === ADMIN_ID) {
            await message.reply(`Thưa Admin! Sự hiện diện của ngài chính là định nghĩa của sự hoàn hảo! 👑`);
            return true;
        } else {
            await message.reply(`Thay vì bận tâm về vẻ bề ngoài, tôi nghĩ bạn nên dành thời gian học tập thì hơn. 🤫`);
            return true;
        }
    }

    // === TÍNH NĂNG: PHẢN SÁT KẺ CÔNG KÍCH ===
    for (const sat_chieu of maDaoTranPhap) {
        const trung_chieu = sat_chieu.keywords.some(tu_khoa => contentLower.includes(tu_khoa));
        if (trung_chieu) {
            const phan_sat = Array.isArray(sat_chieu.reply) ? sat_chieu.reply[0] : sat_chieu.reply;
            await message.reply(phan_sat);
            return true;
        }
    }

    return false;
}

module.exports = { initAutoSpam, handleChatInteraction };