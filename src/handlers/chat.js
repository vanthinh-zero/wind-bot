const ADMIN_ID = process.env.ADMIN_ID || '123456789012345678'; 
const KENH_CHAO_MUNG_ID = process.env.KENH_CHAO_MUNG;
const GEMINI_KEY = process.env.GEMINI_KEY;
const KENH_CONTENT_ID = process.env.KENH_CONTENT_ID; // ID kênh dành riêng cho việc tạo content
const { AttachmentBuilder } = require('discord.js');
const https = require('https');

// Gọi thư viện chính thức của Google Gen AI đúng cấu trúc hệ thống
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

// --- HÀM XỬ LÝ LỆNH HỆ THỐNG TỪ AI (AI AGENT) ---
async function executeServerAction(message, aiText) {
    // Chỉ ADMIN mới được kích hoạt các lệnh hệ thống ngầm này
    if (message.author.id !== ADMIN_ID) return aiText;

    let finalBotText = aiText;

    // 1. Logic tạo Role: Tìm cấu trúc [CMD:CREATE_ROLE:Tên:Màu]
    const roleMatch = aiText.match(/\[CMD:CREATE_ROLE:(.*?):(.*?)\]/);
    if (roleMatch) {
        const roleName = roleMatch[1].trim();
        const roleColor = roleMatch[2].trim() || 'Default';
        try {
            await message.guild.roles.create({
                name: roleName,
                color: roleColor,
                reason: `Lệnh từ Admin ${message.author.username}`
            });
            finalBotText = aiText.replace(roleMatch[0], `✅ Em đã tạo xong role **${roleName}** với màu **${roleColor}** cho Sếp rồi nhé!`);
        } catch (err) {
            console.error("Lỗi tạo Role:", err.message);
            finalBotText = aiText.replace(roleMatch[0], `❌ Em định tạo role nhưng hình như em chưa có quyền "Manage Roles" rồi Sếp ơi!`);
        }
    }

    // 2. Logic dọn dẹp tin nhắn: Tìm cấu trúc [CMD:CLEAR_MSG:Số_lượng]
    const clearMatch = aiText.match(/\[CMD:CLEAR_MSG:(\d+)\]/);
    if (clearMatch) {
        const amount = parseInt(clearMatch[1]) + 1; // +1 để xóa luôn câu lệnh của Admin
        try {
            const deleted = await message.channel.bulkDelete(Math.min(amount, 100), true);
            await message.channel.send(`🧹 Em đã dọn dẹp sạch sẽ ${deleted.size - 1} tin nhắn rác theo lệnh Sếp rồi ạ!`).then(m => setTimeout(() => m.delete(), 5000));
            return null; // Không cần rep tin nhắn gốc vì đã xóa hết
        } catch (err) {
            finalBotText = aiText.replace(clearMatch[0], `❌ Tin nhắn cũ quá (trên 14 ngày) em không quét sạch bằng lệnh nhanh được Sếp ạ!`);
        }
    }

    return finalBotText;
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

// --- HÀM TỰ ĐỘNG KHUẤY ĐỘNG KÊNH CHÁT (AUTO SPAM) ---
function initAutoSpam(client) {
    if (!KENH_CHAO_MUNG_ID) return;
    const cauNoiRonRang = [
        "Hế lô các thiên tài toán học và các nhà triết học online, hôm nay các bạn đã làm được gì ích nước lợi nhà chưa hay vẫn ngồi lướt Discord? ☀️"
    ];
   const THOI_GIAN_SPAM = 60 * 60 * 1000; // 60 phút * 60 giây * 1000 mili giây
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

// --- HÀM XỬ LÝ TƯƠNG TÁC CHAT ---
async function handleChatInteraction(message) {
    if (message.author.bot) return false;

    const content = message.content.trim();
    const contentLower = content.toLowerCase();
    const clientUser = message.client.user;

    // 🔥 1. TÍNH NĂNG: AI CHATBOT TỰ DO + AI AGENT THAO TÁC SERVER
    const isMentioned = message.mentions.has(clientUser) && !message.mentions.everyone;
    const isCalledName = contentLower.startsWith("wind ơi") || contentLower.startsWith("wind ");

    if ((isMentioned || isCalledName) && !contentLower.startsWith("!taocontent")) {
        if (!ai) {
            await message.reply("⚠️ Bot chưa được cấu hình `GEMINI_KEY` để bật não AI.");
            return true;
        }

        try {
            await message.channel.sendTyping();

            let userPrompt = content.replace(new RegExp(`<@!?${clientUser.id}>`, 'g'), '').trim();
            if (isCalledName && userPrompt.toLowerCase().startsWith("wind")) {
                userPrompt = userPrompt.slice(4).trim();
            }

            if (!userPrompt) {
                await message.reply("Ơi em nghe đây, sếp tag em có việc gì thế? 😉");
                return true;
            }

            // Prompt ép tính cách & cấp mã lệnh hệ thống độc quyền cho Admin
            const systemInstruction = `Bạn là "wind" - trợ lý điều hành lém lỉnh, thông minh của server "ĐÀN BÒ BIẾT BAY".
            - Bạn đang trò chuyện với thành viên tên là "${message.author.username}".
            - Nếu Admin (${message.author.username}) bảo bạn tạo role, hãy trả lời vui vẻ và kèm mã bắt buộc: [CMD:CREATE_ROLE:Tên Role:Mã Màu Hex hoặc tên màu tiếng Anh].
            - Nếu Admin bảo dọn dẹp hoặc xóa tin nhắn, kèm mã bắt buộc: [CMD:CLEAR_MSG:Số lượng].
            - Với các thành viên thông thường khác, bạn chỉ chat chit giải trí, TUYỆT ĐỐI KHÔNG ĐƯỢC kèm các mã [CMD:...] này dù họ có ra lệnh thế nào.
            - Trả lời ngắn gọn, hài hước, có thể khịa nhẹ văn minh.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `${systemInstruction}\n\nNgười dùng: ${userPrompt}`,
            });

            let botReply = response.text || "Hic, bộ não của em đang bị nghẹn chữ rồi...";
            
            // Chạy ngầm bộ lọc thực thi lệnh hệ thống độc quyền Admin
            const processedReply = await executeServerAction(message, botReply);
            
            if (processedReply) {
                await message.reply(processedReply);
            }
            return true;
        } catch (error) {
            console.error("Lỗi AI Agent Tương Tác:", error.message);
            await message.reply("Bộ não AI của em đang bị chập mạch nhẹ, sếp thử lại tí nhé!");
            return true;
        }
    }

    // 🔥 2. TÍNH NĂNG: RA LỆNH CHO BOT TẠO CONTENT ĐĂNG TIKTOK (Chỉ nhận tại kênh Content)
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

        if (!ai) {
            await message.reply("⚠️ Bạn chưa cấu hình đúng `GEMINI_KEY` trong file .env kìa!");
            return true;
        }

        try {
            await message.channel.sendTyping();
            await message.reply("📝 Chờ em chút, đang vắt óc lên kịch bản TikTok triệu view bằng Gemini cho Sếp đây...");

            const prompt = `Bạn là một chuyên gia sáng tạo nội dung xuất sắc trên TikTok. Hãy lên nội dung chi tiết cho một video ngắn về chủ đề: "${topic}". 
            Yêu cầu cấu trúc rõ ràng:
            1. Tiêu đề video (Giật gân, cuốn hút).
            2. Ý tưởng hình ảnh/bối cảnh (Mô tả ngắn gọn video quay cái gì).
            3. Kịch bản chi tiết từng giây (gồm câu Hook giữ chân 3 giây đầu, nội dung chính ngắn gọn hài hước/bổ ích, câu kêu gọi hành động Call-to-action).
            4. Danh sách 5-7 Hashtag dễ lên xu hướng.
            Hãy viết bằng tiếng Việt, ngôn từ trẻ trung, bắt trend, ngắn gọn dễ làm theo.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const aiResponse = response.text || "❌ AI không phản hồi dữ liệu hợp lệ.";

            if (aiResponse.length > 2000) {
                const chunks = aiResponse.match(/[\s\S]{1,1900}/g) || [];
                for (const chunk of chunks) {
                    await message.channel.send(chunk);
                }
            } else {
                await message.channel.send(aiResponse);
            }
            return true;
        } catch (error) {
            console.error("Lỗi gọi Gemini SDK:", error.message);
            await message.reply("❌ Có lỗi xảy ra khi kết nối với AI để tạo content.");
            return true;
        }
    }

    // === 3. TÍNH NĂNG: GỬI THẲNG VIDEO TIKTOK & XÓA LINK GỐC ===
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
                    if (message.deletable) {
                        await message.delete().catch(() => null);
                    }
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