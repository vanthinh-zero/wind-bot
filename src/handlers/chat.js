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

    let newlyCreatedRole = null;

    // ---------------------------------------------------------------------
    // A. XỬ LÝ ROLE
    // ---------------------------------------------------------------------
    // 1. TẠO ROLE: [CMD:CREATE_ROLE:Tên Role:Màu]
    const createRoleMatches = botReply.match(/\[CMD:CREATE_ROLE:([^:\]]+)(?::([^\]]*))?\]/gi);
    if (createRoleMatches) {
        for (const matchStr of createRoleMatches) {
            const regexExec = /\[CMD:CREATE_ROLE:([^:\]]+)(?::([^\]]*))?\]/i.exec(matchStr);
            if (regexExec) {
                const roleName = regexExec[1].trim();
                const roleColor = regexExec[2] ? regexExec[2].trim() : '#99aab5';

                try {
                    let existingRole = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
                    if (existingRole) {
                        newlyCreatedRole = existingRole;
                        botReply = botReply.replace(matchStr, `\nℹ️ **[Hệ thống]**: Role \`${roleName}\` đã tồn tại sẵn.`);
                    } else {
                        newlyCreatedRole = await guild.roles.create({
                            name: roleName,
                            color: roleColor.startsWith('#') ? roleColor : '#99aab5',
                            reason: 'Tạo bởi Wind AI theo yêu cầu Admin'
                        });
                        botReply = botReply.replace(matchStr, `\n✅ **[Hệ thống]**: Đã tạo Role \`${newlyCreatedRole.name}\` thành công!`);
                    }
                } catch (err) {
                    console.error("Lỗi tạo Role:", err);
                    botReply = botReply.replace(matchStr, `\n❌ **[Lỗi]**: Bot thiếu quyền **Quản lý Role** (Manage Roles).`);
                }
            }
        }
    }

    // 2. GẮN ROLE: [CMD:ADD_ROLE:ID_User:Tên_Role]
    const addRoleMatches = botReply.match(/\[CMD:ADD_ROLE:([^:\]]+):([^\]]+)\]/gi);
    if (addRoleMatches) {
        for (const matchStr of addRoleMatches) {
            const regexExec = /\[CMD:ADD_ROLE:([^:\]]+):([^\]]+)\]/i.exec(matchStr);
            if (regexExec) {
                const targetRaw = regexExec[1].trim();
                const roleTargetName = regexExec[2].trim();

                try {
                    const cleanUserId = targetRaw.replace(/[<@!>]/g, '');
                    const member = await guild.members.fetch(cleanUserId).catch(() => null);

                    let role = newlyCreatedRole;
                    if (!role || role.name.toLowerCase() !== roleTargetName.toLowerCase()) {
                        role = guild.roles.cache.find(r => r.id === roleTargetName || r.name.toLowerCase() === roleTargetName.toLowerCase());
                    }

                    if (member && role) {
                        await member.roles.add(role);
                        botReply = botReply.replace(matchStr, `\n✅ **[Hệ thống]**: Đã gắn Role \`${role.name}\` cho <@${member.id}>!`);
                    } else if (!member) {
                        botReply = botReply.replace(matchStr, `\n⚠️ **[Lỗi]**: Không tìm thấy thành viên.`);
                    } else {
                        botReply = botReply.replace(matchStr, `\n⚠️ **[Lỗi]**: Không tìm thấy Role \`${roleTargetName}\`.`);
                    }
                } catch (err) {
                    console.error("Lỗi gắn Role:", err);
                    botReply = botReply.replace(matchStr, `\n❌ **[Lỗi]**: Không thể gắn Role.`);
                }
            }
        }
    }

    // 3. XÓA ROLE: [CMD:DELETE_ROLE:Tên]
    const deleteRoleMatches = botReply.match(/\[CMD:DELETE_ROLE:([^\]]+)\]/gi);
    if (deleteRoleMatches) {
        for (const matchStr of deleteRoleMatches) {
            const regexExec = /\[CMD:DELETE_ROLE:([^\]]+)\]/i.exec(matchStr);
            if (regexExec) {
                const target = regexExec[1].trim();
                try {
                    const role = guild.roles.cache.find(r => r.id === target || r.name.toLowerCase() === target.toLowerCase());
                    if (role) {
                        const deletedName = role.name;
                        await role.delete('Xóa bởi Wind AI theo yêu cầu Admin');
                        botReply = botReply.replace(matchStr, `\n🗑️ **[Hệ thống]**: Đã xóa Role \`${deletedName}\` thành công!`);
                    } else {
                        botReply = botReply.replace(matchStr, `\n⚠️ **[Hệ thống]**: Không tìm thấy Role \`${target}\` để xóa.`);
                    }
                } catch (err) {
                    console.error("Lỗi xóa Role:", err);
                    botReply = botReply.replace(matchStr, `\n❌ **[Lỗi]**: Không thể xóa Role này.`);
                }
            }
        }
    }

    // ---------------------------------------------------------------------
    // B. XỬ LÝ TẠO CHANNEL & ĐÓNG/MỞ PHÒNG (LOCK / UNLOCK)
    // ---------------------------------------------------------------------
    // 1. Đóng phòng: [CMD:LOCK_CHANNEL]
    if (botReply.includes('[CMD:LOCK_CHANNEL]')) {
        try {
            await message.channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: false
            });
            botReply = botReply.replace(/\[CMD:LOCK_CHANNEL\]/g, `\n🔒 **[Hệ thống]**: Đã khóa kênh <#${message.channel.id}>! Thành viên tạm thời không thể nhắn tin.`);
        } catch (err) {
            console.error("Lỗi khóa kênh:", err);
            botReply = botReply.replace(/\[CMD:LOCK_CHANNEL\]/g, `\n❌ **[Lỗi]**: Bot thiếu quyền **Quản lý Kênh** (Manage Channels) để khóa phòng.`);
        }
    }

    // 2. Mở phòng: [CMD:UNLOCK_CHANNEL]
    if (botReply.includes('[CMD:UNLOCK_CHANNEL]')) {
        try {
            await message.channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: null
            });
            botReply = botReply.replace(/\[CMD:UNLOCK_CHANNEL\]/g, `\n🔓 **[Hệ thống]**: Đã mở khóa kênh <#${message.channel.id}>! Thành viên có thể chat bình thường.`);
        } catch (err) {
            console.error("Lỗi mở kênh:", err);
            botReply = botReply.replace(/\[CMD:UNLOCK_CHANNEL\]/g, `\n❌ **[Lỗi]**: Bot thiếu quyền **Quản lý Kênh** (Manage Channels) để mở phòng.`);
        }
    }

    // 3. Tạo phòng nằm trong Danh mục (Category)
    const createCatChanMatches = botReply.match(/\[CMD:CREATE_CHANNEL_IN_CAT:([^:\]]+):([^:\]]+):([^\]]+)\]/gi);
    if (createCatChanMatches) {
        for (const matchStr of createCatChanMatches) {
            const regexExec = /\[CMD:CREATE_CHANNEL_IN_CAT:([^:\]]+):([^:\]]+):([^\]]+)\]/i.exec(matchStr);
            if (regexExec) {
                const chanName = regexExec[1].trim();
                const chanTypeRaw = regexExec[2].trim().toLowerCase();
                const categoryTarget = regexExec[3].trim().toLowerCase();

                try {
                    const parentCategory = guild.channels.cache.find(c => 
                        c.type === ChannelType.GuildCategory && 
                        (c.id === categoryTarget || c.name.toLowerCase() === categoryTarget)
                    );

                    let cType = ChannelType.GuildText;
                    if (chanTypeRaw === 'voice' || chanTypeRaw === 'thoai') cType = ChannelType.GuildVoice;

                    const newChan = await guild.channels.create({
                        name: chanName,
                        type: cType,
                        parent: parentCategory ? parentCategory.id : null,
                        reason: 'Tạo bởi Wind AI theo yêu cầu Admin'
                    });

                    const catMsg = parentCategory ? `trong danh mục **${parentCategory.name}**` : `(không có danh mục)`;
                    botReply = botReply.replace(matchStr, `\n📁 **[Hệ thống]**: Đã tạo kênh **${newChan.name}** (${chanTypeRaw}) ${catMsg}!`);
                } catch (err) {
                    console.error("Lỗi tạo Channel trong Category:", err);
                    botReply = botReply.replace(matchStr, `\n❌ **[Lỗi]**: Bot thiếu quyền **Quản lý Kênh** (Manage Channels).`);
                }
            }
        }
    }

    // 4. Tạo phòng tự do hoặc Tạo Category mới
    const createChanMatches = botReply.match(/\[CMD:CREATE_CHANNEL:([^:\]]+)(?::([^\]]+))?\]/gi);
    if (createChanMatches) {
        for (const matchStr of createChanMatches) {
            const regexExec = /\[CMD:CREATE_CHANNEL:([^:\]]+)(?::([^\]]+))?\]/i.exec(matchStr);
            if (regexExec) {
                const chanName = regexExec[1].trim();
                const chanTypeRaw = regexExec[2] ? regexExec[2].trim().toLowerCase() : 'text';

                try {
                    let cType = ChannelType.GuildText;
                    if (chanTypeRaw === 'voice' || chanTypeRaw === 'thoai') cType = ChannelType.GuildVoice;
                    if (chanTypeRaw === 'category' || chanTypeRaw === 'danhmuc') cType = ChannelType.GuildCategory;

                    const newChan = await guild.channels.create({
                        name: chanName,
                        type: cType,
                        reason: 'Tạo bởi Wind AI theo yêu cầu Admin'
                    });

                    botReply = botReply.replace(matchStr, `\n📌 **[Hệ thống]**: Đã tạo thành công **${newChan.name}**!`);
                } catch (err) {
                    console.error("Lỗi tạo Channel:", err);
                    botReply = botReply.replace(matchStr, `\n❌ **[Lỗi]**: Bot thiếu quyền **Quản lý Kênh** (Manage Channels).`);
                }
            }
        }
    }

    // ---------------------------------------------------------------------
    // C. XỬ LÝ DỌN TIN NHẮN
    // ---------------------------------------------------------------------
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

    const content = message.content.trim();
    const contentLower = content.toLowerCase();
    const clientUser = message.client.user;

    const member = message.member || await message.guild?.members.fetch(message.author.id).catch(() => null);

    const isOwner = message.guild?.ownerId === message.author.id;
    const isServerAdmin = member?.permissions.has(PermissionsBitField.Flags.Administrator);
    const hasAdminRole = member?.roles.cache.some(r => ADMIN_ROLE_IDS.includes(r.id));
    const isAdmin = isOwner || isServerAdmin || hasAdminRole;

    // A. LỆNH !TUKHOA
    if (contentLower.startsWith("!tukhoa")) {
        try {
            let danhSach = docTuKhoa();
            const args = content.split(/\s+/);
            const action = args[1] ? args[1].toLowerCase() : "list";

            if (action === "list" || args.length === 1) {
                const keys = Object.keys(danhSach);
                if (keys.length === 0) {
                    await message.reply("📝 Chưa có từ khóa nào được thiết lập.");
                    return true;
                }
                let listMsg = "📋 **DANH SÁCH TỪ KHÓA PHẢN HỒI TỰ ĐỘNG:**\n";
                keys.forEach((key, index) => {
                    const item = danhSach[key];
                    let textVal = item?.text || (typeof item === 'string' ? item : '[Chỉ chứa ảnh]');
                    let imgVal = (item?.image && typeof item.image === 'string' && item.image.trim().startsWith('http')) ? ` 🖼️ *[Ảnh]*` : '';
                    listMsg += `**${index + 1}.** \`${key}\` ➡️ ${textVal}${imgVal}\n`;
                });
                await message.reply(listMsg);
                return true;
            }

            if (!isAdmin) {
                await message.reply("❌ Sếp cần có quyền Admin để chỉnh sửa từ khóa!");
                return true;
            }

            if (action === "add") {
                const keyWord = args[2]?.toLowerCase();
                const responseText = args.slice(3).join(" ").trim();
                const attachedImage = message.attachments.find(att => att.contentType?.startsWith('image/'))?.url || null;

                if (!keyWord || (!responseText && !attachedImage)) {
                    await message.reply("⚠️ **Cú pháp:** `!tukhoa add <từ_khóa> <nội_dung>`");
                    return true;
                }

                danhSach[keyWord] = { text: responseText, image: attachedImage };
                ghiTuKhoa(danhSach);
                await message.reply(`✅ Đã thêm thành công từ khóa \`${keyWord}\`!`);
                return true;
            }

            if (action === "del" || action === "delete") {
                const keyWord = args[2]?.toLowerCase();
                if (!keyWord || !danhSach[keyWord]) {
                    await message.reply(`❌ Từ khóa \`${keyWord || ''}\` không tồn tại.`);
                    return true;
                }
                delete danhSach[keyWord];
                ghiTuKhoa(danhSach);
                await message.reply(`🗑️ Đã xóa từ khóa \`${keyWord}\`!`);
                return true;
            }
        } catch (err) {
            console.error("❌ Lỗi !tukhoa:", err);
            await message.reply("❌ Lỗi khi xử lý từ khóa!");
            return true;
        }
    }

    // B. PHẢN HỒI TỪ KHÓA TỰ ĐỘNG
    const danhSach = docTuKhoa();
    if (danhSach[contentLower]) {
        const item = danhSach[contentLower];
        if (typeof item === 'string' && item.trim() !== '') {
            await message.channel.send(item);
            return true;
        } else if (item && typeof item === 'object') {
            const payload = {};
            if (item.text && item.text.trim() !== '') payload.content = item.text;
            if (item.image && typeof item.image === 'string' && item.image.trim().startsWith('http')) payload.files = [item.image.trim()];
            if (payload.content || (payload.files && payload.files.length > 0)) {
                await message.channel.send(payload);
                return true;
            }
        }
    }

    // C. CÁC LỆNH BẬT TẮT CHAT
    if (['!chat on', '!chat off', '!autochat on', '!autochat off'].includes(contentLower)) {
        if (!isAdmin) return true;
        CO_AUTO_CHAT = contentLower.includes('on');
        await message.reply(CO_AUTO_CHAT ? "🚀 **[Hệ thống]**: Đã bật phản hồi tự động!" : "🤫 **[Hệ thống]**: Đã tắt phản hồi tự động!");
        return true;
    }

    // D. RA LỆNH VỚI AI GEMINI
    if (!CO_AUTO_CHAT) return false;

    const isMentioned = message.mentions.has(clientUser) && !message.mentions.everyone;
    const isCalledName = contentLower.startsWith("wind ơi") || contentLower.startsWith("wind ");

    if ((isMentioned || isCalledName) && !content.startsWith("!")) {
        if (!ai) return true;

        try {
            await message.channel.sendTyping();
            const userPrompt = content.replace(new RegExp(`<@!?${clientUser.id}>`, 'g'), '').trim();
            const targetUser = message.mentions.users.find(u => u.id !== clientUser.id);

            let systemInstruction = "";

            if (isAdmin) {
                systemInstruction = `Bạn là Trợ lý AI tên Wind trong Discord server. Người đang trò chuyện với bạn là ADMIN/SẾP.
Khi Admin ra lệnh quản trị Server, hãy phân tích yêu cầu và chèn ĐÚNG các cú pháp sau vào phản hồi:
1. Tạo Role: [CMD:CREATE_ROLE:Tên Role:Màu_Hex] (Ví dụ: [CMD:CREATE_ROLE:bò béo:#ff0000])
2. Gắn Role cho User: [CMD:ADD_ROLE:ID_User:Tên_Role] (Ví dụ: [CMD:ADD_ROLE:1037019422918983810:bò béo])
3. Xóa Role: [CMD:DELETE_ROLE:Tên_Role] (Ví dụ: [CMD:DELETE_ROLE:bò béo])
4. Tạo Kênh/Phòng: [CMD:CREATE_CHANNEL:Tên_Kênh:Loại] (Loại: 'text' hoặc 'voice' hoặc 'category')
5. Tạo Kênh trong Danh mục chỉ định: [CMD:CREATE_CHANNEL_IN_CAT:Tên_Kênh:Loại:Tên_Danh_Mục]
6. Đóng/Khóa kênh hiện tại: [CMD:LOCK_CHANNEL]
7. Mở/Mở khóa kênh hiện tại: [CMD:UNLOCK_CHANNEL]
8. Dọn nhắn: [CMD:CLEAR_MSG:Số_Lượng]

LƯU Ý: Tỏ ra tôn trọng, lễ phép với Admin (xưng em - sếp/dạ vâng).`;
            } else {
                systemInstruction = `Bạn là Trợ lý AI tên Wind trong Discord server. 
Người trò chuyện là MỘT THÀNH VIÊN BÌNH THƯỜNG (không phải Admin). 
Hãy trò chuyện vui vẻ, thân thiện, xưng "Wind" - "bạn" hoặc "mình" - "bạn". 
KHÔNG xưng "Chào Admin/Sếp", Tuyệt đối KHÔNG sử dụng các cú pháp lệnh quản trị server [CMD:...].`;
            }

            let promptText = `Người dùng (${message.author.username}): "${userPrompt}"`;
            if (targetUser && isAdmin) {
                promptText += `\n(ID Người dùng được tag để thao tác: ${targetUser.id})`;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `${systemInstruction}\n\n${promptText}`,
            });

            let botReply = response.text || "Chào bạn nha!";

            // Lớp bảo mật quan trọng: Chỉ thực thi lệnh quản trị khi là ADMIN
            if (isAdmin) {
                botReply = await executeServerAction(message, botReply);
            }

            if (botReply) await message.reply(botReply);

            return true;
        } catch (error) {
            console.error("Lỗi AI Chat/Role Action:", error);
            return true;
        }
    }

    return false;
}

module.exports = {
    handleChatInteraction,
    initAutoSpam
};