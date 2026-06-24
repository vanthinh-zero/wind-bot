const ADMIN_ID = process.env.ADMIN_ID || '123456789012345678'; 
const KENH_CHAO_MUNG_ID = process.env.KENH_CHAO_MUNG;
const GEMINI_KEY = process.env.GEMINI_KEY;
const KENH_CONTENT_ID = process.env.KENH_CONTENT_ID; 
const { AttachmentBuilder } = require('discord.js');
const https = require('https');

// Gọi thư viện chính thức của Google Gen AI
const { GoogleGenAI } = require('@google/genai');
const ai = GEMINI_KEY ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;

// --- HÀM TẢI DỮ LIỆU AN TOÀN TRÁNH LỖI SSL ---
function sfetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, { rejectUnauthorized: false, ...options }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { 
                    if (data.trim().startsWith('<!DOCTYPE') || data.trim().startsWith('<html')) {
                        return reject(new Error("Phản hồi lỗi định dạng HTML."));
                    }
                    resolve(JSON.parse(data)); 
                } catch (e) { reject(e); }
            });
        });
        if (options.body) req.write(options.body);
        req.on('error', (err) => reject(err));
        req.end();
    });
}

// --- DANH SÁCH CÁC CÂU THOẠI PHẢN SÁT CỨNG ---
const maDaoTranPhap = [
    {
        keywords: ["bot ngu", "bot ngáo", "bot oc", "bot dốt", "bot rac", "bot tồi"],
        reply: [
            "Bạn muốn hạ thấp tôi xuống để nâng cái tôi của bạn lên á? Tiếc là dù bạn có hạ thấp tôi đến đâu, bản chất tôi vẫn ở một đẳng cấp mà bạn phải ngước nhìn. 😉"
        ]
    }
];

// --- HÀM TỰ ĐỘNG KHUẤY ĐỘNG KÊNH CHÁT ---
function initAutoSpam(client) {
    if (!KENH_CHAO_MUNG_ID) return;
    const cauNoiRonRang = [
        "Hế lô các thiên tài toán học và các nhà triết học online, hôm nay các bạn đã làm được gì ích nước lợi nhà chưa hay vẫn ngồi lướt Discord? ☀️"
    ];
    const THOI_GIAN_SPAM = 15 * 60 * 1000; 
    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(KENH_CHAO_MUNG_ID);
            if (channel && channel.isTextBased()) {
                const cauRandom = cauNoiRonRang[Math.floor(Math.random() * cauNoiRomRang.length)];
                await channel.send(cauRandom);
            }
        } catch (error) {
            console.error("[Auto Spam]: Lỗi gửi bài:", error.message);
        }
    }, THOI_GIAN_SPAM);
}

// --- HÀM XỬ LÝ TƯƠNG TÁC CHAT ---
async function handleChatInteraction(message) {
    if (message.author.bot) return false;

    const content = message.content.trim();
    const contentLower = content.toLowerCase();
    const clientUser = message.client.user;

    // 🔥 1. TÍNH NĂNG MỚI: AI CHATBOT TỰ DO KHI ĐƯỢC TAG HOẶC GỌI TÊN
    // Kiểm tra xem tin nhắn có tag bot hoặc bắt đầu bằng tên bot "wind" không
    const isMentioned = message.mentions.has(clientUser) && !message.mentions.everyone;
    const isCalledName = contentLower.startsWith("wind ơi") || contentLower.startsWith("wind ");

    if ((isMentioned || isCalledName) && !contentLower.startsWith("!taocontent")) {
        if (!ai) {
            await message.reply("⚠️ Bot chưa được cấu hình `GEMINI_KEY` để bật não AI.");
            return true;
        }

        try {
            await message.channel.sendTyping();

            // Làm sạch nội dung (xóa phần tag bot đi để AI không bị loạn)
            let userPrompt = content.replace(new RegExp(`<@!?${clientUser.id}>`, 'g'), '').trim();
            if (isCalledName && userPrompt.toLowerCase().startsWith("wind")) {
                userPrompt = userPrompt.slice(4).trim(); // Cắt chữ "wind" ở đầu câu
            }

            if (!userPrompt) {
                await message.reply("Ơi em nghe đây, sếp tag em có việc gì thế? Ngại gõ chữ thì bảo em một câu nhé! 😉");
                return true;
            }

            // Thiết lập cá tính cho Bot: Thân thiện, hài hước, hơi cá tính một chút
            const systemInstruction = `Bạn là "wind" - một thành viên bot cực kỳ thông minh, lém lỉnh, hài hước và thân thiện trong server Discord có tên "ĐÀN BÒ BIẾT BAY". 
            Hãy trò chuyện với thành viên tên là "${message.author.username}" một cách tự nhiên như một người bạn thực sự.
            Quy tắc:
            - Xưng hô linh hoạt: Em - Sếp (nếu người nói là Admin), tớ - cậu, hoặc gọi tên thân mật.
            - Trả lời ngắn gọn, vui vẻ, có thể dùng icon biểu cảm, thỉnh thoảng khịa nhẹ nhưng văn minh.
            - Tuyệt đối không trả lời quá dài dòng trừ khi họ hỏi xin kiến thức hoặc kịch bản.`;

            const fullPrompt = `${systemInstruction}\n\nNgười dùng nói: "${userPrompt}"\nBot trả lời:`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
            });

            const botReply = response.text || "Hic, tự nhiên em bị nghẹn chữ rồi, sếp nói lại được không?";
            
            // Trả lời lại tin nhắn của member
            await message.reply(botReply);
            return true;
        } catch (error) {
            console.error("Lỗi Chatbot tự do:", error.message);
            await message.reply("Ơ kìa, bộ não AI của em vừa bị chập mạch nhẹ, sếp thử lại tí nhé!");
            return true;
        }
    }

    // 🔥 2. TÍNH NĂNG: RA LỆNH CHO BOT TẠO CONTENT ĐĂNG TIKTOK (Giữ nguyên)
    if (contentLower.startsWith("!taocontent")) {
        if (KENH_CONTENT_ID && message.channel.id !== KENH_CONTENT_ID) {
            await message.reply(`Sếp ơi, lệnh này chỉ được dùng ở kênh <#${KENH_CONTENT_ID}> thôi nhé! Hãy qua đó ra lệnh cho em.`);
            return true;
        }
        if (message.author.id !== ADMIN_ID) {
            await message.reply("Quyền năng sáng tạo content này chỉ dành riêng cho Sếp thôi nhé! 😉");
            return true;
        }
        const topic = content.slice(11).trim();
        if (!topic) {
            await message.reply("Sếp ơi, vui lòng nhập chủ đề sau lệnh. Ví dụ: `!taocontent một ngày làm coder` nha!");
            return true;
        }
        try {
            await message.channel.sendTyping();
            await message.reply("📝 Chờ em chút, đang vắt óc lên kịch bản TikTok triệu view bằng Gemini cho Sếp đây...");

            const prompt = `Bạn là một chuyên gia sáng tạo nội dung xuất sắc trên TikTok. Hãy lên nội dung chi tiết cho một video ngắn về chủ đề: "${topic}". 
            Yêu cầu cấu trúc rõ ràng và viết bằng tiếng Việt.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const aiResponse = response.text || "❌ AI không phản hồi dữ liệu hợp lệ.";
            if (aiResponse.length > 2000) {
                const chunks = aiResponse.match(/[\s\S]{1,1900}/g) || [];
                for (const chunk of chunks) { await message.channel.send(chunk); }
            } else { await message.channel.send(aiResponse); }
            return true;
        } catch (error) {
            console.error("Lỗi gọi Gemini SDK:", error.message);
            await message.reply("❌ Có lỗi xảy ra khi kết nối với AI để tạo content.");
            return true;
        }
    }

    // === 3. TÍNH NĂNG: GỬI THẲNG VIDEO TIKTOK & XÓA LINK GỐC (Giữ nguyên) ===
    if (contentLower.includes("tiktok.com")) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const tiktokUrl = content.match(urlRegex)?.[0];
        if (tiktokUrl) {
            try {
                await message.channel.sendTyping();
                const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`;
                const responseData = await sfetch(apiUrl, { method: 'GET' });
                const videoUrl = responseData?.data?.play;
                if (videoUrl) {
                    const videoAttachment = new AttachmentBuilder(videoUrl, { name: 'tiktok-video.mp4' });
                    await message.channel.send({
                        content: `🎬 Video TikTok từ **${message.author.username}**:`,
                        files: [videoAttachment]
                    });
                    if (message.deletable) { await message.delete().catch(() => null); }
                    return true;
                }
            } catch (error) {
                console.error("[TikTok] Lỗi file quá nặng hoặc API lỗi:", error.message);
                const embedLink = tiktokUrl.replace(/tiktok\.com/g, "tnktok.com");
                await message.reply(`Dung lượng video lớn quá hệ thống không tải trực tiếp được, xem tạm tại đây nhé:\n${embedLink}`);
            }
        }
    }

    // === 4. TÍNH NĂNG: PHẢN SÁT KẺ CÔNG KÍCH ===
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