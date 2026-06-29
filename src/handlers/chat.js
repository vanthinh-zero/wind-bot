// Khai báo thư viện Google Gen AI chuẩn xác
const { GoogleGenAI } = require('@google/genai');
const GEMINI_KEY = process.env.GEMINI_KEY;
// Khởi tạo đối tượng AI
const ai = GEMINI_KEY ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;

const ADMIN_ID = process.env.ADMIN_ID || '123456789012345678'; 
const KENH_CHAO_MUNG_ID = process.env.KENH_CHAO_MUNG;
const KENH_CONTENT_ID = process.env.KENH_CONTENT_ID; 
const { AttachmentBuilder, PermissionsBitField } = require('discord.js');
const https = require('https');
const http = require('http'); 
const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, '../config/tag_stats.json');

let CO_AUTO_CHAT = true;
let BOT_MOOD = 'macdinh';

function ChayWebServerChoRender() {
    const port = process.env.PORT || 3000;
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('System Online.');
    }).listen(port, () => {
        console.log(`[Render Hub]: Port ${port} open.`);
    });
}

ChayWebServerChoRender();

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

function sfetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, { rejectUnauthorized: false, ...options }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { 
                    if (data.trim().startsWith('<!DOCTYPE') || data.trim().startsWith('<html')) {
                        return reject(new Error("HTML Error Response."));
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

async function executeServerAction(message, aiText) {
    let finalBotText = aiText;

    const roleMatch = aiText.match(/\[CMD:CREATE_ROLE:(.*?):(.*?)\]/);
    if (roleMatch) {
        const rName = roleMatch[1].trim(); const rColor = roleMatch[2].trim() || 'Default';
        try {
            await message.guild.roles.create({ name: rName, color: rColor, reason: 'Lệnh từ AI tổng tài' });
            finalBotText = aiText.replace(roleMatch[0], BOT_MOOD === 'cold' ? `Đã tạo role **${rName}**.` : `✅ Đã tạo xong role **${rName}** màu **${rColor}** Sếp nhé!`);
        } catch (err) { finalBotText = aiText.replace(roleMatch[0], `❌ Thất bại. Thiếu quyền.`); }
    }

    const clearMatch = aiText.match(/\[CMD:CLEAR_MSG:(\d+)\]/);
    if (clearMatch) {
        const amount = parseInt(clearMatch[1]) + 1;
        try {
            const deleted = await message.channel.bulkDelete(Math.min(amount, 100), true);
            const msgText = BOT_MOOD === 'cold' ? `Đã dọn ${deleted.size - 1} tin nhắn.` : `🧹 Đã quét sạch ${deleted.size - 1} rác theo lệnh Sếp!`;
            await message.channel.send(msgText).then(m => setTimeout(() => m.delete(), 5000));
            return null;
        } catch (err) { finalBotText = aiText.replace(clearMatch[0], `❌ Thất bại. Tin nhắn quá cũ.`); }
    }

    const channelMatch = aiText.match(/\[CMD:CREATE_CHANNEL:(.*?):(text|voice)\]/);
    if (channelMatch) {
        const cName = channelMatch[1].trim(); const cType = channelMatch[2] === 'voice' ? 2 : 0;
        try {
            const newChan = await message.guild.channels.create({ name: cName, type: cType });
            finalBotText = aiText.replace(channelMatch[0], BOT_MOOD === 'cold' ? `Đã tạo kênh <#${newChan.id}>.` : `✅ Em đã tạo xong kênh mới: <#${newChan.id}> cho Sếp!`);
        } catch (err) { finalBotText = aiText.replace(channelMatch[0], `❌ Thất bại. Thiếu quyền.`); }
    }

    if (aiText.includes('[CMD:DELETE_CHANNEL]')) {
        try {
            await message.channel.send(BOT_MOOD === 'cold' ? "Kênh tự hủy sau 3 giây..." : "🚨 Kênh này sẽ tự hủy sau 3 giây...");
            setTimeout(async () => { await message.channel.delete(); }, 3000);
            return null;
        } catch (err) { finalBotText = aiText.replace('[CMD:DELETE_CHANNEL]', `❌ Không thể xóa kênh.`); }
    }

    const nickMatch = aiText.match(/\[CMD:SET_NICK:(\d+):(.*?)\].*?/);
    if (nickMatch) {
        const uId = nickMatch[1]; const newNick = nickMatch[2].trim();
        try {
            const member = await message.guild.members.fetch(uId);
            await member.setNickname(newNick);
            finalBotText = aiText.replace(nickMatch[0], BOT_MOOD === 'cold' ? `Đã đổi biệt danh <@${uId}> thành **${newNick}**.` : `✅ Đã đổi biệt danh của <@${uId}> thành **${newNick}** rồi nha Sếp!`);
        } catch (err) { finalBotText = aiText.replace(nickMatch[0], `❌ Thất bại. Quyền hạn cao hơn.`); }
    }

    return finalBotText;
}

function initAutoSpam(client) {
    if (!KENH_CHAO_MUNG_ID) return;
    const THOI_GIAN_SPAM = 60 * 60 * 1000; 
    setInterval(async () => {
        if (!CO_AUTO_CHAT) return;
        try {
            const channel = await client.channels.fetch(KENH_CHAO_MUNG_ID);
            if (channel && channel.isTextBased()) {
                const spamText = BOT_MOOD === 'cold' 
                    ? "Tập trung làm việc đi." 
                    : "Hế lô các thiên tài toán học và các nhà triết học online, hôm nay các bạn đã làm được gì ích nước lợi nhà chưa? ☀️";
                await channel.send(spamText);
            }
        } catch (error) { console.error("[Auto Spam] Error:", error.message); }
    }, THOI_GIAN_SPAM);
}

async function handleChatInteraction(message) {
    if (message.author.bot) return false;

    const content = message.content.trim();
    const contentLower = content.toLowerCase();
    const clientUser = message.client.user;

    // Lệnh hệ thống cơ bản
    if (contentLower === "!autochat on") {
        CO_AUTO_CHAT = true;
        await message.reply(BOT_MOOD === 'cold' ? "AutoChat: ON." : "🚀 **[Hệ thống]**: Đã kích hoạt lại chế độ AutoChat!");
        return true;
    }
    if (contentLower === "!autochat off") {
        CO_AUTO_CHAT = false;
        await message.reply(BOT_MOOD === 'cold' ? "AutoChat: OFF." : "🤫 **[Hệ thống]**: Đã tạm dừng hoạt động AutoChat.");
        return true;
    }
    if (contentLower === "!mood cold") {
        BOT_MOOD = 'cold';
        await message.reply("Đã chuyển đổi cấu hình hệ thống: tôi ở đây.");
        return true;
    }
    if (contentLower === "!mood macdinh") {
        BOT_MOOD = 'macdinh';
        await message.reply("Đã quay về phong cách mặc định, lém lỉnh vâng lệnh sếp!");
        return true;
    }

    const isMentioned = message.mentions.has(clientUser) && !message.mentions.everyone;
    const isCalledName = contentLower.startsWith("wind ơi") || contentLower.startsWith("wind ");

    if (isMentioned || isCalledName) {
        let stats = CodeDocStats();
        const mId = message.author.id;
        stats[mId] = (stats[mId] || 0) + 1;
        CodeGhiStats(stats);
    }

    if (contentLower === "!thongketag") {
        const stats = CodeDocStats();
        const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return await message.reply("Chưa ghi nhận dữ liệu tag.");
        
        let bieuDo = BOT_MOOD === 'cold' ? "📊 **Thống kê lượt tag:**\n" : "📊 **BẢNG XẾP HẠNG GHI PHẠM:**\n---------------------------------------\n";
        for (let i = 0; i < Math.min(sorted.length, 10); i++) {
            bieuDo += `${i + 1}. <@${sorted[i][0]}>: ${sorted[i][1]} lần\n`;
        }
        await message.reply(bieuDo);
        return true;
    }

    const tuKhoaQuyenLuc = ["anh", "sếp", "wind", "giúp", "tạo", "xóa", "đổi"];
    const adminKichHoatTuKhoa = tuKhoaQuyenLuc.some(tu => contentLower.includes(tu));

    // NỚI LỎNG ĐIỀU KIỆN: Khi sếp tag trực tiếp bot thì không cần check ID cứng nữa để tránh lỗi môi trường local
    if ((isMentioned || isCalledName || adminKichHoatTuKhoa) && !contentLower.startsWith("!taocontent")) {
        if (!ai) {
            await message.reply("Hệ thống chưa cấu hình GEMINI_KEY.");
            return true;
        }

        try {
            await message.channel.sendTyping();
            
            let userPrompt = content.replace(new RegExp(`<@!?${clientUser.id}>`, 'g'), '').trim();
            if (userPrompt.toLowerCase().startsWith("wind")) {
                userPrompt = userPrompt.slice(4).trim();
            }

            const systemInstruction = BOT_MOOD === 'cold'
                ? `Bạn là "wind" - trợ lý tổng tài, lạnh lùng, ít nói, chỉ trung thành với Admin ${message.author.username}.
                   Trả lời cực kỳ ngắn gọn, súc tích, nghiêm túc và có uy lực. Không dùng icon, không dùng từ ngữ thừa thãi.
                   Hãy phân tích câu nói của Admin để chèn mã lệnh hệ thống sau nếu cần:
                   - Tạo Role: [CMD:CREATE_ROLE:Tên Role:Màu]
                   - Dọn tin nhắn: [CMD:CLEAR_MSG:Số lượng]
                   - Tạo Kênh: [CMD:CREATE_CHANNEL:Tên Kênh:text hoặc voice]
                   - Xóa kênh: [CMD:DELETE_CHANNEL]
                   - Đổi biệt danh: [CMD:SET_NICK:ID_MEMBER:Biệt danh mới].`
                : `Bạn là "wind" - trợ lý tối cao có thực quyền của Admin ${message.author.username} tại server "ĐÀN BÒ BIẾT BAY".
                   Bạn chỉ vâng lệnh một mình Admin. Hãy trả lời bằng phong cách lém lỉnh, trung thành tuyệt đối.
                   Chèn mã hệ thống nếu cần: [CMD:CREATE_ROLE...], [CMD:CLEAR_MSG...], [CMD:CREATE_CHANNEL...], [CMD:DELETE_CHANNEL], [CMD:SET_NICK...].`;

            const targetUser = message.mentions.users.first();
            let promptText = `Admin nói: "${userPrompt}"`;
            if (targetUser) promptText += `\n(ID đối tượng: ${targetUser.id})`;

            let response;
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `${systemInstruction}\n\n${promptText}`,
                });
            } catch (apiErr) {
                console.error("Lỗi kết nối Google:", apiErr.message);
                await message.reply(BOT_MOOD === 'cold' ? "Hệ thống nghẽn." : "📡 Máy chủ quá tải sếp ơi!");
                return true;
            }

            let botReply = response.text || (BOT_MOOD === 'cold' ? "Rõ." : "Em nghe sếp ơi!");
            const processedReply = await executeServerAction(message, botReply);
            if (processedReply) await message.reply(processedReply);
            return true;
        } catch (error) { console.error(error); return true; }
    }

    if (contentLower.startsWith("!taocontent")) {
        if (KENH_CONTENT_ID && message.channel.id !== KENH_CONTENT_ID) {
            await message.reply(BOT_MOOD === 'cold' ? `Sai kênh.` : `Sếp ơi, lệnh này chỉ dùng ở kênh <#${KENH_CONTENT_ID}> thôi nhé!`); 
            return true;
        }
        const topic = content.slice(11).trim();
        if (!topic) { await message.reply(BOT_MOOD === 'cold' ? "Thiếu chủ đề." : "Sếp thiếu chủ đề rồi!"); return true; }
        try {
            await message.channel.sendTyping();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Lên kịch bản TikTok chi tiết cho chủ đề: ${topic}`,
            });
            await message.channel.send(response.text || "No data."); return true;
        } catch (e) { 
            await message.reply("API Error.");
            return true; 
        }
    }

    if (contentLower.includes("tiktok.com")) {
        const urlRegex = /(https?:\/\/[^\s]+)/g; const tiktokUrl = content.match(urlRegex)?.[0];
        if (tiktokUrl) {
            try {
                const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`;
                const responseData = await sfetch(apiUrl, { method: 'GET' });
                const videoUrl = responseData?.data?.play;
                if (videoUrl) {
                    const videoAttachment = new AttachmentBuilder(videoUrl, { name: 'tiktok-video.mp4' });
                    await message.channel.send({ content: BOT_MOOD === 'cold' ? `Video từ **${message.author.username}**:` : `🎬 Video TikTok từ **${message.author.username}**:`, files: [videoAttachment] });
                    if (message.deletable) await message.delete().catch(() => null);
                }
            } catch (error) { const embedLink = tiktokUrl.replace(/tiktok\.com/g, "tnktok.com"); await message.reply(`Link thay thế:\n${embedLink}`); }
        }
    }

    return false;
}

module.exports = { initAutoSpam, handleChatInteraction };