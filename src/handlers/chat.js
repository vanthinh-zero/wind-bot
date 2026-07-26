const { PermissionsBitField, AttachmentBuilder, ChannelType } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// =========================================================================
// 1. CẤU HÌNH ADMIN ROLE & GEMINI AI
// =========================================================================
const apiKey = process.env.GEMINI_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey: apiKey }) : null;

// Lấy danh sách ID Role Admin từ file .env (Hỗ trợ 1 hoặc nhiều Role ID phân cách bằng dấu phẩy)
const ADMIN_ROLE_IDS = process.env.ADMIN_ROLE_ID 
    ? process.env.ADMIN_ROLE_ID.split(',').map(id => id.trim()).filter(Boolean)
    : [];

let CO_AUTO_CHAT = true;
let BOT_MOOD = 'macdinh'; 

// =========================================================================
// 2. ĐỌC / GHI FILE TỪ KHÓA (tukhoa.json)
// =========================================================================
const tukhoaFilePath = path.join(__dirname, 'tukhoa.json');

function docTuKhoa() {
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

function ghiTuKhoa(data) {
    try {
        fs.writeFileSync(tukhoaFilePath, JSON.stringify(data, null, 4));
    } catch (e) {
        console.error("❌ Lỗi ghi file tukhoa.json:", e);
    }
}

// =========================================================================
// 3. HÀM TRỢ GIÚP HỆ THỐNG
// =========================================================================
function CodeDocStats() {
    if (global.CodeDocStats && typeof global.CodeDocStats === 'function') return global.CodeDocStats();
    if (!global.statsMemory) global.statsMemory = {};
    return global.statsMemory;
}

async function sfetch(url, options) {
    if (global.sfetch && typeof global.sfetch === 'function') return await global.sfetch(url, options);
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const res = await fetch(url, options);
    return await res.json();
}

function initAutoSpam(client) {
    console.log('💬 [System]: Bot Wind đã sẵn sàng!');
}

// =========================================================================
// 4. XỬ LÝ LỆNH THAO TÁC SERVER TỪ GEMINI AI
// =========================================================================
async function executeServerAction(message, botReply) {
    if (!botReply || typeof botReply !== 'string') return botReply;
    const guild = message.guild;
    if (!guild) return botReply;

    // [CMD:CREATE_ROLE:Tên:Màu]
    const createRoleMatch = botReply.match(/\[CMD:CREATE_ROLE[:\s]+([^:\]]+)(?::([^\]]+))?\]/i);
    if (createRoleMatch) {
        const roleName = createRoleMatch[1].trim();
        const roleColor = createRoleMatch[2] ? createRoleMatch[2].trim() : '#99aab5';
        try {
            const createdRole = await guild.roles.create({ name: roleName, color: roleColor, reason: 'Tạo bởi Wind AI' });
            botReply = botReply.replace(createRoleMatch[0], `\n✅ **[Hệ thống]**: Đã tạo Role \`${createdRole.name}\`!`);
        } catch (err) {
            botReply = botReply.replace(createRoleMatch[0], `\n❌ **[Lỗi]**: Bot thiếu quyền tạo Role.`);
        }
    }

    // [CMD:DELETE_ROLE:Tên]
    const deleteRoleMatch = botReply.match(/\[CMD:DELETE_ROLE[:\s]+([^\]]+)\]/i);
    if (deleteRoleMatch) {
        const target = deleteRoleMatch[1].trim().toLowerCase();
        try {
            const role = guild.roles.cache.find(r => r.id === target || r.name.toLowerCase() === target);
            if (role) {
                await role.delete('Xóa bởi Wind AI');
                botReply = botReply.replace(deleteRoleMatch[0], `\n🗑️ **[Hệ thống]**: Đã xóa Role \`${role.name}\`!`);
            } else {
                botReply = botReply.replace(deleteRoleMatch[0], `\n⚠️ **[Hệ thống]**: Không tìm thấy Role \`${target}\`.`);
            }
        } catch (err) {
            botReply = botReply.replace(deleteRoleMatch[0], `\n❌ **[Lỗi]**: Không thể xóa Role này.`);
        }
    }

    // [CMD:ADD_ROLE:ID_User:Tên_Role]
    const addRoleMatch = botReply.match(/\[CMD:ADD_ROLE[:\s]+([^:]+):([^\]]+)\]/i);
    if (addRoleMatch) {
        const targetId = addRoleMatch[1].trim();
        const roleTarget = addRoleMatch[2].trim().toLowerCase();
        try {
            const member = await guild.members.fetch(targetId);
            const role = guild.roles.cache.find(r => r.id === roleTarget || r.name.toLowerCase() === roleTarget);
            if (member && role) {
                await member.roles.add(role);
                botReply = botReply.replace(addRoleMatch[0], `\n✅ **[Hệ thống]**: Đã gắn Role \`${role.name}\` cho <@${member.id}>!`);
            }
        } catch (err) {
            botReply = botReply.replace(addRoleMatch[0], `\n❌ **[Lỗi]**: Gắn Role thất bại.`);
        }
    }

    // [CMD:REMOVE_ROLE:ID_User:Tên_Role]
    const removeRoleMatch = botReply.match(/\[CMD:REMOVE_ROLE[:\s]+([^:]+):([^\]]+)\]/i);
    if (removeRoleMatch) {
        const targetId = removeRoleMatch[1].trim();
        const roleTarget = removeRoleMatch[2].trim().toLowerCase();
        try {
            const member = await guild.members.fetch(targetId);
            const role = guild.roles.cache.find(r => r.id === roleTarget || r.name.toLowerCase() === roleTarget);
            if (member && role) {
                await member.roles.remove(role);
                botReply = botReply.replace(removeRoleMatch[0], `\n🗑️ **[Hệ thống]**: Đã gỡ Role \`${role.name}\` khỏi <@${member.id}>!`);
            }
        } catch (err) {
            botReply = botReply.replace(removeRoleMatch[0], `\n❌ **[Lỗi]**: Gỡ Role thất bại.`);
        }
    }

    // [CMD:CREATE_CHANNEL:Tên:type]
    const createChannelMatch = botReply.match(/\[CMD:CREATE_CHANNEL[:\s]+([^:\]]+)(?::([^\]]+))?\]/i);
    if (createChannelMatch) {
        const channelName = createChannelMatch[1].trim();
        const channelType = (createChannelMatch[2] || '').trim().toLowerCase() === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
        try {
            const newChannel = await guild.channels.create({ name: channelName, type: channelType });
            botReply = botReply.replace(createChannelMatch[0], `\n✅ **[Hệ thống]**: Đã tạo kênh <#${newChannel.id}>!`);
        } catch (err) {
            botReply = botReply.replace(createChannelMatch[0], `\n❌ **[Lỗi]**: Tạo kênh thất bại.`);
        }
    }

    // [CMD:DELETE_CHANNEL]
    const deleteChannelMatch = botReply.match(/\[CMD:DELETE_CHANNEL(?::|[\s]+)?([^\]]+)?\]/i);
    if (deleteChannelMatch) {
        const channelId = deleteChannelMatch[1] ? deleteChannelMatch[1].trim() : message.channel.id;
        try {
            const ch = guild.channels.cache.get(channelId);
            if (ch) {
                botReply = botReply.replace(deleteChannelMatch[0], `\n🔥 **[Hệ thống]**: Đã xóa kênh \`${ch.name}\`!`);
                await message.reply(botReply);
                await ch.delete('Xóa bởi Wind AI');
                return null;
            }
        } catch (err) {
            botReply = botReply.replace(deleteChannelMatch[0], `\n❌ **[Lỗi]**: Không thể xóa kênh.`);
        }
    }

    // [CMD:CLEAR_MSG:Số_Lượng]
    const clearMsgMatch = botReply.match(/\[CMD:CLEAR_MSG[:\s]+(\d+)\]/i);
    if (clearMsgMatch) {
        const amount = parseInt(clearMsgMatch[1]);
        try {
            if (amount > 0 && amount <= 100) {
                await message.channel.bulkDelete(amount + 1, true);
                botReply = botReply.replace(clearMsgMatch[0], `\n🧹 **[Hệ thống]**: Đã dọn dẹp ${amount} tin nhắn!`);
            }
        } catch (err) {
            botReply = botReply.replace(clearMsgMatch[0], `\n❌ **[Lỗi]**: Không thể xóa tin nhắn cũ quá 14 ngày.`);
        }
    }

    return botReply;
}

// =========================================================================
// 5. HÀM XỬ LÝ CHÍNH (MAIN INTERACTION)
// =========================================================================
async function handleChatInteraction(message) {
    if (message.author.bot) return false;

    // 🛑 XÁC THỰC QUYỀN HẠN BẰNG ADMIN_ROLE_ID TỪ FILE .ENV
    const memberRoles = message.member?.roles.cache;
    const hasAdminRole = memberRoles && ADMIN_ROLE_IDS.some(roleId => memberRoles.has(roleId));

    if (!hasAdminRole) return false;

    const content = message.content.trim();
    const contentLower = content.toLowerCase();
    const clientUser = message.client.user;

    // -------------------------------------------------------------------------
    // A. LỆNH CẤU HÌNH HỆ THỐNG (!chat, !mood)
    // -------------------------------------------------------------------------
    if (['!chat on', '!chat off', '!autochat on', '!autochat off', '!mood cold', '!mood macdinh'].includes(contentLower)) {
        if (contentLower.includes('on')) {
            CO_AUTO_CHAT = true;
            await message.reply(BOT_MOOD === 'cold' ? "Chat: ON." : "🚀 **[Hệ thống]**: Đã bật phản hồi tự động!");
        } else if (contentLower.includes('off')) {
            CO_AUTO_CHAT = false;
            await message.reply(BOT_MOOD === 'cold' ? "Chat: OFF." : "🤫 **[Hệ thống]**: Đã tắt phản hồi tự động!");
        } else if (contentLower === "!mood cold") {
            BOT_MOOD = 'cold';
            await message.reply("Đã chuyển đổi sang phong cách lạnh lùng.");
        } else if (contentLower === "!mood macdinh") {
            BOT_MOOD = 'macdinh';
            await message.reply("Đã quay về phong cách mặc định.");
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // B. LỆNH QUẢN LÝ TỪ KHÓA (!tukhoa)
    // -------------------------------------------------------------------------
    if (contentLower.startsWith("!tukhoa")) {
        try {
            let danhSach = docTuKhoa();
            const args = content.split(/\s+/);
            const action = args[1] ? args[1].toLowerCase() : "list";

            // 1. Xem danh sách (!tukhoa hoặc !tukhoa list)
            if (action === "list" || args.length === 1) {
                const keys = Object.keys(danhSach);
                if (keys.length === 0) {
                    await message.reply("📝 Chưa có từ khóa nào được thiết lập.");
                    return true;
                }
                let listMsg = "📋 **DANH SÁCH TỪ KHÓA PHẢN HỒI TỰ ĐỘNG:**\n";
                keys.forEach((key, index) => {
                    const item = danhSach[key];
                    let textVal = "[Chưa có nội dung]";
                    let imgVal = "";

                    if (item && typeof item === 'object') {
                        textVal = item.text || '[Chỉ chứa ảnh]';
                        imgVal = (item.image && typeof item.image === 'string' && item.image.trim() !== '') ? ` 🖼️ *[Ảnh]*` : '';
                    } else if (typeof item === 'string') {
                        textVal = item;
                    }

                    listMsg += `**${index + 1}.** \`${key}\` ➡️ ${textVal}${imgVal}\n`;
                });
                await message.reply(listMsg);
                return true;
            }

            // 2. Thêm từ khóa (!tukhoa add <từ_khóa> <nội_dung>)
            if (action === "add") {
                const keyWord = args[2]?.toLowerCase();
                const responseText = args.slice(3).join(" ").trim();
                const attachedImage = message.attachments.find(att => att.contentType?.startsWith('image/'))?.url || null;

                if (!keyWord || (!responseText && !attachedImage)) {
                    await message.reply("⚠️ **Cú pháp:** `!tukhoa add <từ_khóa> <nội_dung>` (Có thể kèm ảnh đính kèm)");
                    return true;
                }

                danhSach[keyWord] = { text: responseText, image: attachedImage };
                ghiTuKhoa(danhSach);
                await message.reply(`✅ Đã thêm thành công từ khóa \`${keyWord}\`!`);
                return true;
            }

            // 3. Xóa từ khóa (!tukhoa del <từ_khóa>)
            if (action === "del" || action === "delete") {
                const keyWord = args[2]?.toLowerCase();
                if (!keyWord || !danhSach[keyWord]) {
                    await message.reply(`❌ Từ khóa \`${keyWord || ''}\` không tồn tại trong danh sách.`);
                    return true;
                }
                delete danhSach[keyWord];
                ghiTuKhoa(danhSach);
                await message.reply(`🗑️ Đã xóa từ khóa \`${keyWord}\`!`);
                return true;
            }
        } catch (err) {
            console.error("❌ Lỗi xử lý !tukhoa:", err);
            await message.reply("❌ Đã xảy ra lỗi khi xử lý danh sách từ khóa!");
            return true;
        }
    }

    // -------------------------------------------------------------------------
    // C. CÁC LỆNH HỆ THỐNG KHÁC (!trathongtin, !thongketag, !taocontent)
    // -------------------------------------------------------------------------
    if (contentLower.startsWith("!trathongtin")) {
        const match = content.match(/!trathongtin\s+(?:<@!?(\d+)>|(\d+))/i);
        if (!match) {
            await message.reply("⚠️ **Cú pháp:** `!trathongtin @user` hoặc `!trathongtin <ID>`");
            return true;
        }
        const targetId = match[1] || match[2];
        try {
            const user = await message.client.users.fetch(targetId);
            const stats = CodeDocStats();
            const tagCount = stats[targetId] || 0;

            const info = `📂 **THÔNG TIN DỮ LIỆU**\n` +
                         `👤 Tag: ${user.tag}\n` +
                         `🆔 ID: \`${user.id}\`\n` +
                         `🗓️ Ngày tạo: <t:${Math.floor(user.createdTimestamp / 1000)}:R>\n` +
                         `📊 Số lần tương tác: ${tagCount} lần`;
            await message.author.send(info);
            await message.reply("📬 Đã gửi thông tin qua tin nhắn riêng!");
        } catch {
            await message.reply("❌ Không tìm thấy thông tin ID người dùng này.");
        }
        return true;
    }

    if (contentLower === "!thongketag") {
        const stats = CodeDocStats();
        const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return await message.reply("📊 Chưa có dữ liệu thống kê.");

        let bieuDo = "📊 **BẢNG THỐNG KÊ TƯƠNG TÁC:**\n";
        sorted.slice(0, 10).forEach(([id, count], index) => {
            bieuDo += `**${index + 1}.** <@${id}>: ${count} lần\n`;
        });
        await message.reply(bieuDo);
        return true;
    }

    if (contentLower.startsWith("!taocontent")) {
        const topic = content.slice(11).trim();
        if (!topic) return await message.reply("⚠️ Vui lòng nhập chủ đề!");
        if (!ai) return await message.reply("❌ Chưa cài đặt API Key Gemini.");
        try {
            await message.channel.sendTyping();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Viết kịch bản video TikTok chi tiết về chủ đề: ${topic}`,
            });
            await message.reply(response.text || "Không tạo được kịch bản.");
        } catch {
            await message.reply("❌ Lỗi khi kết nối với Gemini AI.");
        }
        return true;
    }

    if (!CO_AUTO_CHAT) return false;

    // -------------------------------------------------------------------------
    // D. PHẢN HỒI TỪ KHÓA TỰ ĐỘNG KHÔNG CÓ PREFIX
    // -------------------------------------------------------------------------
    const danhSach = docTuKhoa();
    if (danhSach[contentLower]) {
        const item = danhSach[contentLower];
        if (typeof item === 'string') {
            await message.channel.send(item);
            return true;
        } else if (item && typeof item === 'object') {
            const payload = {};
            if (item.text && item.text.trim() !== '') {
                payload.content = item.text;
            }
            if (item.image && typeof item.image === 'string' && item.image.trim().startsWith('http')) {
                payload.files = [item.image];
            }
            
            if (payload.content || payload.files) {
                await message.channel.send(payload);
                return true;
            }
        }
    }

    // -------------------------------------------------------------------------
    // E. AUTO TẢI VIDEO TIKTOK
    // -------------------------------------------------------------------------
    if (contentLower.includes("tiktok.com")) {
        const tiktokUrl = content.match(/(https?:\/\/[^\s]+)/g)?.[0];
        if (tiktokUrl) {
            try {
                const resData = await sfetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`);
                if (resData?.data?.play) {
                    const video = new AttachmentBuilder(resData.data.play, { name: 'tiktok.mp4' });
                    await message.channel.send({ content: `🎬 Video TikTok từ **${message.author.username}**:`, files: [video] });
                    if (message.deletable) await message.delete().catch(() => null);
                    return true;
                }
            } catch {
                await message.reply(`Link xem thay thế: ${tiktokUrl.replace(/tiktok\.com/g, "tnktok.com")}`);
                return true;
            }
        }
    }

    // -------------------------------------------------------------------------
    // F. TRÒ CHUYỆN VÀ RA LỆNH CHO GEMINI AI
    // -------------------------------------------------------------------------
    const isMentioned = message.mentions.has(clientUser) && !message.mentions.everyone;
    const isCalledName = contentLower.startsWith("wind ơi") || contentLower.startsWith("wind ");
    const tuKhoaKichHoat = ["tạo", "xóa", "đổi", "clear", "dọn", "role", "kênh", "gắn", "phòng", "sếp"];
    const coTuKhoaServer = tuKhoaKichHoat.some(k => contentLower.includes(k));

    if ((isMentioned || isCalledName || coTuKhoaServer) && !content.startsWith("!")) {
        if (!ai) return true;

        try {
            await message.channel.sendTyping();
            const userPrompt = content.replace(new RegExp(`<@!?${clientUser.id}>`, 'g'), '').trim();
            const targetUser = message.mentions.users.first();

            const systemInstruction = `Bạn là Trợ lý AI tên Wind. Khi Admin ra lệnh quản trị Server, BẮT BUỘC chèn ĐÚNG các cú pháp sau:
1. Tạo Role: [CMD:CREATE_ROLE:Tên Role:Màu]
2. Xóa Role: [CMD:DELETE_ROLE:Tên Role]
3. Gắn Role: [CMD:ADD_ROLE:ID_User:Tên_Role]
4. Gỡ Role: [CMD:REMOVE_ROLE:ID_User:Tên_Role]
5. Tạo Kênh: [CMD:CREATE_CHANNEL:Tên Kênh:text/voice]
6. Xóa Kênh: [CMD:DELETE_CHANNEL]
7. Dọn tin nhắn: [CMD:CLEAR_MSG:Số_Lượng]`;

            let promptText = `Admin yêu cầu: "${userPrompt}"`;
            if (targetUser) promptText += `\n(ID User được nhắc tới: ${targetUser.id})`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `${systemInstruction}\n\n${promptText}`,
            });

            let botReply = response.text || "Em nghe đây sếp!";
            const finalReply = await executeServerAction(message, botReply);
            if (finalReply) await message.reply(finalReply);

            return true;
        } catch (error) {
            console.error("Lỗi AI:", error);
            return true;
        }
    }

    return false;
}

module.exports = {
    handleChatInteraction,
    initAutoSpam
};