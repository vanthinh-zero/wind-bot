const ADMIN_ID = process.env.ADMIN_ID || '123456789012345678'; 
const KENH_CHAO_MUNG_ID = process.env.KENH_CHAO_MUNG;
const GEMINI_KEY = process.env.GEMINI_KEY;
const KENH_CONTENT_ID = process.env.KENH_CONTENT_ID; 
const { AttachmentBuilder, PermissionsBitField } = require('discord.js');
const https = require('https');
const http = require('http'); // Khai báo thư viện http để dựng server cứu đói cho Render
const fs = require('fs');
const path = require('path');

// Đường dẫn lưu trữ stats chuẩn chỉnh trong thư mục config
const STATS_FILE = path.join(__dirname, '../config/tag_stats.json');

// Gọi thư viện chính thức của Google Gen AI đúng cấu trúc mới
const { GoogleGenAI } = require('@google/genai');
const ai = GEMINI_KEY ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;

// --- HÀM TỰ ĐỘNG DỰNG WEB SERVER CHO RENDER GÓI FREE KHÔNG BỊ "CỤP PHA" ---
function ChayWebServerChoRender() {
    const port = process.env.PORT || 3000;
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Quản gia Wind đang sống nhăn răng sếp ơi! 🚀');
    }).listen(port, () => {
        console.log(`[Render Hub]: Đã mở cổng ${port} để tiếp đón Render Health Check thành công!`);
    });
}

// Kích hoạt Server HTTP ngay khi khởi động
ChayWebServerChoRender();

// --- HÀM ĐỌC/GHI LƯỢT TAG ---
function CodeDocStats() {
    try {
        if (!fs.existsSync(STATS_FILE)) return {};
        return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    } catch (e) { return {}; }
}
function CodeGhiStats(data) {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 4));
    } catch (e) { console.error("Lỗi ghi file stats:", e); }
}

// --- HÀM TẢI DỮ LIỆU AN TOÀN ---
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

// --- HÀM XỬ LÝ LỆNH HỆ THỐNG TỐI CAO TỪ AI ---
async function executeServerAction(message, aiText) {
    if (message.author.id !== ADMIN_ID) return aiText;
    let finalBotText = aiText;

    // 1. Tạo Role: [CMD:CREATE_ROLE:Tên:Màu]
    const roleMatch = aiText.match(/\[CMD:CREATE_ROLE:(.*?):(.*?)\]/);
    if (roleMatch) {
        const rName = roleMatch[1].trim(); const rColor = roleMatch[2].trim() || 'Default';
        try {
            await message.guild.roles.create({ name: rName, color: rColor, reason: 'Lệnh Admin' });
            finalBotText = aiText.replace(roleMatch[0], `✅ Đã tạo xong role **${rName}** màu **${rColor}** Sếp nhé!`);
        } catch (err) { finalBotText = aiText.replace(roleMatch[0], `❌ Em thiếu quyền Tạo Role rồi.`); }
    }

    // 2. Dọn tin nhắn: [CMD:CLEAR_MSG:Số_lượng]
    const clearMatch = aiText.match(/\[CMD:CLEAR_MSG:(\d+)\]/);
    if (clearMatch) {
        const amount = parseInt(clearMatch[1]) + 1;
        try {
            const deleted = await message.channel.bulkDelete(Math.min(amount, 100), true);
            await message.channel.send(`🧹 Đã quét sạch ${deleted.size - 1} rác theo lệnh Sếp!`).then(m => setTimeout(() => m.delete(), 5000));
            return null;
        } catch (err) { finalBotText = aiText.replace(clearMatch[0], `❌ Tin nhắn cũ quá em không xóa nhanh được.`); }
    }

    // 3. Tạo Kênh: [CMD:CREATE_CHANNEL:Tên:Loại(text/voice)]
    const channelMatch = aiText.match(/\[CMD:CREATE_CHANNEL:(.*?):(text|voice)\]/);
    if (channelMatch) {
        const cName = channelMatch[1].trim(); const cType = channelMatch[2] === 'voice' ? 2 : 0;
        try {
            const newChan = await message.guild.channels.create({ name: cName, type: cType });
            finalBotText = aiText.replace(channelMatch[0], `✅ Em đã tạo xong kênh mới: <#${newChan.id}> cho Sếp!`);
        } catch (err) { finalBotText = aiText.replace(channelMatch[0], `❌ Em không có quyền tạo kênh rồi Sếp.`); }
    }

    // 4. Xóa Kênh Hiện Tại: [CMD:DELETE_CHANNEL]
    if (aiText.includes('[CMD:DELETE_CHANNEL]')) {
        try {
            await message.channel.send("🚨 Kênh này sẽ tự hủy sau 3 giây...");
            setTimeout(async () => { await message.channel.delete(); }, 3000);
            return null;
        } catch (err) { finalBotText = aiText.replace('[CMD:DELETE_CHANNEL]', `❌ Em không xóa kênh này được Sếp ạ.`); }
    }

    // 5. Đổi biệt danh member: [CMD:SET_NICK:ID_User:Nickname_Mới]
    const nickMatch = aiText.match(/\[CMD:SET_NICK:(\d+):(.*?)\].*?/);
    if (nickMatch) {
        const uId = nickMatch[1]; const newNick = nickMatch[2].trim();
        try {
            const member = await message.guild.members.fetch(uId);
            await member.setNickname(newNick);
            finalBotText = aiText.replace(nickMatch[0], `✅ Đã đổi biệt danh của <@${uId}> thành **${newNick}** rồi nha Sếp!`);
        } catch (err) { finalBotText = aiText.replace(nickMatch[0], `❌ Thành viên này quyền cao quá nên em chịu không đổi tên được.`); }
    }

    return finalBotText;
}

// --- HÀM TỰ ĐỘNG KHUẤY ĐỘNG KÊNH CHÁT (Mỗi 1 tiếng) ---
function initAutoSpam(client) {
    if (!KENH_CHAO_MUNG_ID) return;
    const THOI_GIAN_SPAM = 60 * 60 * 1000; 
    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(KENH_CHAO_MUNG_ID);
            if (channel && channel.isTextBased()) {
                await channel.send("Hế lô các thiên tài toán học và các nhà triết học online, hôm nay các bạn đã làm được gì ích nước lợi nhà chưa? ☀️");
            }
        } catch (error) { console.error("[Auto Spam]: Lỗi:", error.message); }
    }, THOI_GIAN_SPAM);
}

// --- HÀM XỬ LÝ TƯƠNG TÁC CHAT ---
async function handleChatInteraction(message) {
    if (message.author.bot) return false;
    const content = message.content.trim();
    const contentLower = content.toLowerCase();
    const clientUser = message.client.user;

    const isMentioned = message.mentions.has(clientUser) && !message.mentions.everyone;
    const isCalledName = contentLower.startsWith("wind ơi") || contentLower.startsWith("wind ");

    // 📊 Ghi nhận lượt tag ngầm của Member thông thường
    if (isMentioned || isCalledName) {
        let stats = CodeDocStats();
        const mId = message.author.id;
        stats[mId] = (stats[mId] || 0) + 1;
        CodeGhiStats(stats);
    }

    // 📈 LỆNH ĐỘC QUYỀN ADMIN: XEM THỐNG KÊ LƯỢT TAG
    if (contentLower === "!thongketag" && message.author.id === ADMIN_ID) {
        const stats = CodeDocStats();
        const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return await message.reply("Chưa có ai dám tag em Sếp ơi!");
        
        let bieuDo = "📊 **BẢNG XẾP HẠNG GHI PHẠM (LƯỢT TAG BOT WIND):**\n---------------------------------------\n";
        for (let i = 0; i < Math.min(sorted.length, 10); i++) {
            bieuDo += `${i + 1}. <@${sorted[i][0]}> đã gan dạ tag em: **${sorted[i][1]}** lần\n`;
        }
        await message.reply(bieuDo);
        return true;
    }

    // 🔥 MẢNG TỪ KHÓA BẬT NÃO AI ĐỘC QUYỀN CHO ADMIN (KHÔNG CẦN TAG)
    const tuKhoaQuyenLuc = ["anh", "sếp", "wind", "giúp", "tạo", "xóa", "đổi"];
    const adminKichHoatTuKhoa = message.author.id === ADMIN_ID && tuKhoaQuyenLuc.some(tu => contentLower.includes(tu));

    // Kích hoạt khi Sếp tag, Sếp gọi tên, HOẶC Sếp chat chứa từ khóa quyền lực
    if ((isMentioned || isCalledName || adminKichHoatTuKhoa) && !contentLower.startsWith("!taocontent")) {
        if (message.author.id !== ADMIN_ID) return false; 
        if (!ai) return true;

        try {
            await message.channel.sendTyping();
            
            let userPrompt = content.replace(new RegExp(`<@!?${clientUser.id}>`, 'g'), '').trim();
            if (userPrompt.toLowerCase().startsWith("wind")) {
                userPrompt = userPrompt.slice(4).trim();
            }

            const systemInstruction = `Bạn là "wind" - trợ lý tối cao có thực quyền của Admin ${message.author.username} tại server "ĐÀN BÒ BIẾT BAY".
            Bạn chỉ vâng lệnh một mình Admin. Hãy phân tích câu nói của Admin để chèn các mã lệnh hệ thống sau nếu cần:
            - Tạo Role: [CMD:CREATE_ROLE:Tên Role:Mã màu hoặc tên màu tiếng Anh]
            - Dọn tin nhắn: [CMD:CLEAR_MSG:Số lượng]
            - Tạo Kênh mới: [CMD:CREATE_CHANNEL:Tên Kênh:text hoặc voice]
            - Xóa kênh hiện tại: [CMD:DELETE_CHANNEL]
            - Đổi tên/biệt danh của ai đó: [CMD:SET_NICK:ID_MEMBER:Biệt danh mới].
            Hãy trả lời bằng phong cách lém lỉnh, trung thành tuyệt đối.`;

            const targetUser = message.mentions.users.first();
            let promptText = `Admin nói: "${userPrompt}"`;
            if (targetUser) promptText += `\n(ID của người được nhắc tới trong câu là: ${targetUser.id})`;

            // Gọi model gemini-2.5-flash kèm khiên bọc try/catch thông minh
            let response;
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `${systemInstruction}\n\n${promptText}`,
                });
            } catch (apiErr) {
                console.error("Lỗi kết nối Google:", apiErr.message);
                await message.reply("📡 Máy chủ Google đang bị quá tải nhẹ rồi Sếp ơi, đợi em tầm 5 giây rồi gõ lệnh lại nha!");
                return true;
            }

            let botReply = response.text || "Em nghe sếp ơi!";
            const processedReply = await executeServerAction(message, botReply);
            if (processedReply) await message.reply(processedReply);
            return true;
        } catch (error) { console.error(error); return true; }
    }

    // 🔥 LỆNH TẠO CONTENT 
    if (contentLower.startsWith("!taocontent")) {
        if (KENH_CONTENT_ID && message.channel.id !== KENH_CONTENT_ID) {
            await message.reply(`Sếp ơi, lệnh này chỉ dùng ở kênh <#${KENH_CONTENT_ID}> thôi nhé!`); return true;
        }
        if (message.author.id !== ADMIN_ID) return true;
        const topic = content.slice(11).trim();
        if (!topic) { await message.reply("Sếp thiếu chủ đề rồi!"); return true; }
        try {
            await message.channel.sendTyping();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Lên kịch bản TikTok chi tiết cho chủ đề: ${topic}`,
            });
            await message.channel.send(response.text || "Lỗi dữ liệu."); return true;
        } catch (e) { 
            await message.reply("📡 Google đang nghẽn mạch lệnh tạo nội dung rồi Sếp ạ, thử lại sau ít giây nhé!");
            return true; 
        }
    }

    // === TỰ ĐỘNG TẢI VIDEO TIKTOK ===
    if (contentLower.includes("tiktok.com")) {
        const urlRegex = /(https?:\/\/[^\s]+)/g; const tiktokUrl = content.match(urlRegex)?.[0];
        if (tiktokUrl) {
            try {
                const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`;
                const responseData = await sfetch(apiUrl, { method: 'GET' });
                const videoUrl = responseData?.data?.play;
                if (videoUrl) {
                    const videoAttachment = new AttachmentBuilder(videoUrl, { name: 'tiktok-video.mp4' });
                    await message.channel.send({ content: `🎬 Video TikTok từ **${message.author.username}**:`, files: [videoAttachment] });
                    if (message.deletable) await message.delete().catch(() => null);
                }
            } catch (error) { const embedLink = tiktokUrl.replace(/tiktok\.com/g, "tnktok.com"); await message.reply(`Xem tạm tại đây:\n${embedLink}`); }
        }
    }

    return false;
}

module.exports = { initAutoSpam, handleChatInteraction };