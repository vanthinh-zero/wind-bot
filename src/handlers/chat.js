const { PermissionsBitField, AttachmentBuilder } = require('discord.js');
// 🚀 Tích hợp thư viện Google Gen AI SDK mới nhất
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Khởi tạo thực thể AI an toàn từ file môi trường .env
const apiKey = process.env.GEMINI_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey: apiKey }) : null;

// Định nghĩa các biến cấu hình hệ thống dự phòng
let CO_AUTO_CHAT = true;
let BOT_MOOD = 'macdinh'; 
let KENH_CONTENT_ID = process.env.KENH_CONTENT_ID || null;

// --- 📂 BỔ SUNG: LƯU TRỮ VÀ QUẢN LÝ TỪ KHÓA TỰ ĐỘNG ---
const tukhoaFilePath = path.join(__dirname, 'tukhoa.json');

// Hàm đọc danh sách từ khóa từ file JSON
function CodeDocTuKhoa() {
    try {
        if (!fs.existsSync(tukhoaFilePath)) {
            fs.writeFileSync(tukhoaFilePath, JSON.stringify({}, null, 4));
            return {};
        }
        const data = fs.readFileSync(tukhoaFilePath, 'utf8');
        return JSON.parse(data || '{}');
    } catch (e) {
        console.error("❌ Lỗi đọc file tukhoa.json:", e);
        return {};
    }
}

// Hàm ghi danh sách từ khóa vào file JSON
function CodeGhiTuKhoa(data) {
    try {
        fs.writeFileSync(tukhoaFilePath, JSON.stringify(data, null, 4));
    } catch (e) {
        console.error("❌ Lỗi ghi file tukhoa.json:", e);
    }
}
// -----------------------------------------------------

// Giả lập hoặc bọc các hàm hệ thống lưu trữ thống kê tránh lỗi crash
function CodeDocStats() {
    if (global.CodeDocStats && typeof global.CodeDocStats === 'function') return global.CodeDocStats();
    if (!global.statsMemory) global.statsMemory = {};
    return global.statsMemory;
}

function CodeGhiStats(newStats) {
    if (global.CodeGhiStats && typeof global.CodeGhiStats === 'function') return global.CodeGhiStats(newStats);
    global.statsMemory = newStats;
}

async function executeServerAction(message, botReply) {
    if (global.executeServerAction && typeof global.executeServerAction === 'function') {
        return await global.executeServerAction(message, botReply);
    }
    return botReply;
}

async function sfetch(url, options) {
    if (global.sfetch && typeof global.sfetch === 'function') return await global.sfetch(url, options);
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const res = await fetch(url, options);
    return await res.json();
}

function initAutoSpam(client) {
    try {
        console.log('💬 [System Check]: Module Auto Spam rộn ràng đã khởi chạy thành công!');
    } catch (error) {
        console.error('❌ Lỗi trong hàm initAutoSpam:', error);
    }
}

async function handleChatInteraction(message) {
    if (message.author.bot) return false;

    const content = message.content.trim();
    const contentLower = content.toLowerCase();
    const clientUser = message.client.user;

    // 1. KIỂM TRA QUYỀN TRUY CẬP (TÍCH HỢP ID ROLE TỪ .ENV)
    const isAdmin = message.author.id === process.env.ADMIN_ID || message.member?.permissions.has(PermissionsBitField.Flags.Administrator);
    
    // 💡 Tích hợp ID Role từ .env
    const roleStaffId = process.env.ROLE_STAFF;
    const roleLeTanId = process.env.ROLE_CAN_THONG_BAO;

    // Dự phòng kiểm tra theo Tên Role cũ (nếu .env chưa cấu hình ID)
    const danhSachRoleNameHopLe = ['bò quản trị', 'bò thân thiện', 'bo than thien'];

    const isStaff = message.member?.roles.cache.some(role => 
        (roleStaffId && role.id === roleStaffId) || 
        (roleLeTanId && role.id === roleLeTanId) || 
        danhSachRoleNameHopLe.includes(role.name.toLowerCase())
    );

    // --- ⚙️ HỆ THỐNG QUẢN LÝ TỪ KHÓA (!tukhoa) ---
    if (contentLower.startsWith("!tukhoa")) {
        if (!isAdmin && !isStaff) {
            await message.reply("❌ Bạn không có quyền sử dụng lệnh quản lý từ khóa!");
            return true;
        }

        let danhSachTuKhoa = CodeDocTuKhoa();
        const restContent = content.slice(7).trim();
        const firstSpaceIndex = restContent.search(/\s/);
        const action = (firstSpaceIndex === -1 ? restContent : restContent.slice(0, firstSpaceIndex)).toLowerCase();

        // 1. Xem danh sách từ khóa: !tukhoa list
        if (action === "list") {
            const keys = Object.keys(danhSachTuKhoa);
            if (keys.length === 0) {
                await message.reply("📝 Chưa có từ khóa nào được thiết lập.");
                return true;
            }
            let listMsg = "📋 **DANH SÁCH TỪ KHÓA TỰ ĐỘNG PHẢN HỒI:**\n";
            keys.forEach((key, index) => {
                listMsg += `**${index + 1}.** \`${key}\` ➡️\n${danhSachTuKhoa[key]}\n-------------------\n`;
            });
            await message.reply(listMsg);
            return true;
        }

        // 2. Thêm từ khóa: !tukhoa add
        if (action === "add") {
            let tuKhoaNew = "";
            let phanHoiNew = "";

            if (restContent.includes("|")) {
                const parts = restContent.split("|").map(item => item.trim());
                tuKhoaNew = parts[1]?.toLowerCase();
                phanHoiNew = parts.slice(2).join("|").trim();
            } else {
                const afterAdd = restContent.slice(3).trim(); 
                const matchKey = afterAdd.match(/^([^\s]+)\s+([\s\S]+)/); 
                
                if (matchKey) {
                    tuKhoaNew = matchKey[1].toLowerCase();
                    phanHoiNew = matchKey[2].trim();
                }
            }

            if (!tuKhoaNew || !phanHoiNew) {
                await message.reply("⚠️ **Cú pháp sai!** Dùng: `!tukhoa add <từ khóa> <câu phản hồi>`");
                return true;
            }

            phanHoiNew = phanHoiNew.replace(/\\n/g, '\n');
            danhSachTuKhoa[tuKhoaNew] = phanHoiNew;
            CodeGhiTuKhoa(danhSachTuKhoa);
            await message.reply(`✅ Đã thêm từ khóa \`${tuKhoaNew}\` với câu phản hồi:\n${phanHoiNew}`);
            return true;
        }

        // 3. Xóa từ khóa: !tukhoa del
        if (action === "del" || action === "delete") {
            let tuKhoaDel = "";
            if (restContent.includes("|")) {
                const parts = restContent.split("|").map(item => item.trim());
                tuKhoaDel = parts[1]?.toLowerCase();
            } else {
                const parts = restContent.split(/\s+/);
                tuKhoaDel = parts[1]?.toLowerCase();
            }

            if (!tuKhoaDel) {
                await message.reply("⚠️ **Cú pháp sai!** Dùng: `!tukhoa del <từ khóa>`");
                return true;
            }

            if (!danhSachTuKhoa[tuKhoaDel]) {
                await message.reply(`❌ Từ khóa \`${tuKhoaDel}\` không tồn tại.`);
                return true;
            }

            delete danhSachTuKhoa[tuKhoaDel];
            CodeGhiTuKhoa(danhSachTuKhoa);
            await message.reply(`🗑️ Đã xóa từ khóa \`${tuKhoaDel}\` thành công!`);
            return true;
        }

        await message.reply(
            "💡 **HƯỚNG DẪN SỬ DỤNG LỆNH !TUKHOA:**\n" +
            "• **Thêm:** `!tukhoa add <từ khóa> <câu trả lời>`\n" +
            "• **Xóa:** `!tukhoa del <từ khóa>`\n" +
            "• **Xem danh sách:** `!tukhoa list`"
        );
        return true;
    }

    // --- 🤖 TỰ ĐỘNG PHẢN HỒI TỪ KHÓA ---
    const danhSachTuKhoa = CodeDocTuKhoa();
    if (danhSachTuKhoa[contentLower]) {
        await message.reply(`${danhSachTuKhoa[contentLower]}`);
        return true;
    }

    // 2. CÁC LỆNH CẤU HÌNH HỆ THỐNG (Chỉ DUY NHẤT Admin)
    if (['!autochat on', '!autochat off', '!mood cold', '!mood macdinh'].includes(contentLower)) {
        if (!isAdmin) {
            await message.reply("❌ Quyền lực của bạn không đủ để cấu hình hệ thống!");
            return true;
        }
        
        if (contentLower === "!autochat on") {
            CO_AUTO_CHAT = true;
            await message.reply(BOT_MOOD === 'cold' ? "AutoChat: ON." : "🚀 **[Hệ thống]**: Đã kích hoạt lại chế độ AutoChat!");
        } else if (contentLower === "!autochat off") {
            CO_AUTO_CHAT = false;
            await message.reply(BOT_MOOD === 'cold' ? "AutoChat: OFF." : "🤫 **[Hệ thống]**: Đã tạm dừng hoạt động AutoChat.");
        } else if (contentLower === "!mood cold") {
            BOT_MOOD = 'cold';
            await message.reply("Đã chuyển đổi cấu hình hệ thống: tôi ở đây.");
        } else if (contentLower === "!mood macdinh") {
            BOT_MOOD = 'macdinh';
            await message.reply("Đã quay về phong cách mặc định, lém lỉnh vâng lệnh sếp!");
        }
        return true;
    }

    // 💡 LỆNH TRA THÔNG TIN NGƯỜI DÙNG (!trathongtin @User hoặc ID)
    if (contentLower.startsWith("!trathongtin")) {
        if (!isAdmin && !isStaff) {
            await message.reply("❌ Bạn không có quyền sử dụng lệnh tra cứu thông tin!");
            return true;
        }

        const match = content.match(/!trathongtin\s+(?:<@!?(\d+)>|(\d+))/i);
        
        if (!match) {
            await message.reply("⚠️ **Cú pháp sai!** Dùng: `!trathongtin @user` hoặc `!trathongtin <ID>`");
            return true;
        }

        const targetId = match[1] || match[2];

        await message.reply("tôi sẽ gửi thông tin qua hộp thư sau ít phút");

        (async () => {
            try {
                const member = await message.guild?.members.fetch(targetId).catch(() => null);
                const user = member ? member.user : await message.client.users.fetch(targetId).catch(() => null);

                if (!user) {
                    return await message.author.send(`❌ Không tìm thấy thông tin của ID/User: \`${targetId}\`.`);
                }

                const stats = CodeDocStats();
                const tagCount = stats[targetId] || 0;

                let fullInfo = `📂 **HỒ SƠ THÔNG TIN CHI TIẾT NGƯỜI DÙNG**\n`;
                fullInfo += `===================================\n`;
                fullInfo += `👤 **Tên tài khoản (Tag):** ${user.tag}\n`;
                fullInfo += `📛 **Tên hiển thị:** ${user.globalName || user.username}\n`;
                fullInfo += `🆔 **ID Người dùng:** \`${user.id}\`\n`;
                fullInfo += `🤖 **Tài khoản Bot:** ${user.bot ? 'Có' : 'Không'}\n`;
                fullInfo += `🗓️ **Ngày tạo tài khoản:** <t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)\n`;

                if (member) {
                    fullInfo += `📥 **Ngày tham gia Server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)\n`;
                    
                    const rolesList = member.roles.cache
                        .filter(r => r.name !== '@everyone')
                        .map(r => r.name)
                        .join(', ') || 'Không có vai trò riêng';
                        
                    fullInfo += `🏷️ **Chức vụ trong Server:** ${rolesList}\n`;
                    fullInfo += `👑 **Biệt danh Server:** ${member.nickname || 'Không đặt'}\n`;
                } else {
                    fullInfo += `⚠️ **Trạng thái Server:** Người dùng này không còn ở trong Server.\n`;
                }

                fullInfo += `-----------------------------------\n`;
                fullInfo += `📊 **Dữ liệu thống kê Bot ghi nhận:** ${tagCount} lần gọi/tag bot\n`;
                fullInfo += `🖼️ **Ảnh đại diện:** ${user.displayAvatarURL({ dynamic: true, size: 1024 })}\n`;
                fullInfo += `===================================`;

                await message.author.send(fullInfo);

            } catch (err) {
                console.error("Lỗi gửi tin nhắn riêng:", err);
                await message.channel.send(`⚠️ <@${message.author.id}>, bot không thể gửi tin nhắn riêng cho bạn. Hãy mở tính năng nhận tin nhắn riêng (Allow Direct Messages) trong cài đặt Server nhé!`).catch(() => null);
            }
        })();

        return true;
    }

    // Chặn người dùng thường tương tác với các tính năng bên dưới nếu không có quyền
    if (!isAdmin && !isStaff) return false;

    // Lệnh thống kê tag
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

    // 3. XỬ LÝ TƯƠNG TÁC VỚI BOT AI (GEMINI)
    const isMentioned = message.mentions.has(clientUser) && !message.mentions.everyone;
    const isCalledName = contentLower.startsWith("wind ơi") || contentLower.startsWith("wind ");
    const tuKhoaQuyenLuc = ["anh", "sếp", "wind", "giúp", "tạo", "xóa", "đổi"];
    const adminKichHoatTuKhoa = tuKhoaQuyenLuc.some(tu => contentLower.includes(tu));

    if ((isMentioned || isCalledName || adminKichHoatTuKhoa) && !contentLower.startsWith("!taocontent")) {
        if (!ai) {
            await message.reply("Hệ thống chưa cấu hình hoặc cấu hình sai biến GEMINI_KEY tại file .env.");
            return true;
        }

        let stats = CodeDocStats();
        const mId = message.author.id;
        stats[mId] = (stats[mId] || 0) + 1;
        CodeGhiStats(stats);

        try {
            await message.channel.sendTyping();
            
            let userPrompt = content.replace(new RegExp(`<@!?${clientUser.id}>`, 'g'), '').trim();
            if (userPrompt.toLowerCase().startsWith("wind")) {
                userPrompt = userPrompt.slice(4).trim();
            }

            const roleUserText = isAdmin ? "Admin tối cao" : "Staff / Lễ tân";

            const systemInstruction = BOT_MOOD === 'cold'
                ? `Bạn là "wind" - trợ lý tổng tài, lạnh lùng, ít nói. Bạn đang trò chuyện với ${message.author.username} (Chức vụ: ${roleUserText}).
                   Trả lời cực kỳ ngắn gọn, súc tích, nghiêm túc. Không dùng icon.
                   *Lưu ý quan trọng*: Chỉ khi người chat là "Admin tối cao", bạn mới được phép chèn các mã lệnh hệ thống sau:
                   - Tạo Role: [CMD:CREATE_ROLE:Tên Role:Màu]
                   - Dọn tin nhắn: [CMD:CLEAR_MSG:Số lượng]
                   - Tạo Kênh: [CMD:CREATE_CHANNEL:Tên Kênh:text hoặc voice]
                   - Xóa kênh: [CMD:DELETE_CHANNEL]
                   - Đổi biệt danh: [CMD:SET_NICK:ID_MEMBER:Biệt danh mới].
                   Nếu chức vụ của họ là Staff/Lễ tân, TUYỆT ĐỐI KHÔNG chèn các mã lệnh trên.`
                : `Bạn là "wind" - trợ lý của server "ĐÀN BÒ BIẾT BAY". Bạn đang trò chuyện với ${message.author.username} (Chức vụ: ${roleUserText}).
                   Hãy trả lời bằng phong cách lém lỉnh, trung thành.
                   *Lưu ý quan trọng*: Chỉ khi chức vụ là "Admin tối cao" bạn mới được chèn mã hệ thống thực thi lệnh: [CMD:CREATE_ROLE...], [CMD:CLEAR_MSG...], [CMD:CREATE_CHANNEL...], [CMD:DELETE_CHANNEL], [CMD:SET_NICK...].
                   Nếu họ là Staff/Lễ tân, tuyệt đối không chèn mã lệnh phá cấu hình server.`;

            const targetUser = message.mentions.users.first();
            let promptText = `${roleUserText} nói: "${userPrompt}"`;
            if (targetUser) promptText += `\n(ID đối tượng: ${targetUser.id})`;

            let response;
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `${systemInstruction}\n\n${promptText}`,
                });
            } catch (apiErr) {
                console.error("Lỗi kết nối Google Gemini:", apiErr.message);
                await message.reply(BOT_MOOD === 'cold' ? "Hệ thống nghẽn." : "📡 Máy chủ quá tải hoặc API Key hết hạn sếp ơi!");
                return true;
            }

            let botReply = response.text || (BOT_MOOD === 'cold' ? "Rõ." : "Em nghe đây ạ!");

            const containsCommand = botReply.includes('[CMD:');
            if (containsCommand && !isAdmin) {
                botReply = botReply.replace(/\[CMD:.*?\]/g, '').trim(); 
                botReply += BOT_MOOD === 'cold' ? "\n(Yêu cầu thực thi lệnh bị từ chối do thiếu quyền)." : "\n*(Lệnh hệ thống bị hủy vì Nhân viên/Lễ tân không có quyền cấu hình server nhé!)*";
                await message.reply(botReply);
                return true;
            }

            const processedReply = await executeServerAction(message, botReply);
            if (processedReply) await message.reply(processedReply);
            return true;
        } catch (error) { console.error(error); return true; }
    }

    // Lệnh tạo content
    if (contentLower.startsWith("!taocontent")) {
        if (KENH_CONTENT_ID && message.channel.id !== KENH_CONTENT_ID) {
            await message.reply(BOT_MOOD === 'cold' ? `Sai kênh.` : `Sếp/Staff ơi, lệnh này chỉ dùng ở kênh <#${KENH_CONTENT_ID}> thôi nhé!`); 
            return true;
        }
        const topic = content.slice(11).trim();
        if (!topic) { await message.reply(BOT_MOOD === 'cold' ? "Thiếu chủ đề." : "Thiếu chủ đề rồi kìa!"); return true; }
        try {
            if (!ai) return await message.reply("Hệ thống chưa nạp API Key.");
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

    // Auto lấy video TikTok
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

module.exports = {
    handleChatInteraction,
    initAutoSpam
};