const { PermissionsBitField, AttachmentBuilder, ChannelType } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const { hasActiveVip } = require('./premium.js');
const { getSettings } = require('../utils/config');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// =========================================================================
// 1. CẤU HÌNH ADMIN ROLE & GEMINI AI
// =========================================================================
const apiKey = process.env.GEMINI_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey: apiKey }) : null;
const premiumModel = getSettings().vip?.benefits?.aiModel || 'gemini-3.1-pro-preview';

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

// =========================================================================
// 5. TRÍ THỨC TRADING & TRỢ LÝ CỐ VẤN GIAO DỊCH KHI ĐƯỢC TAG
// =========================================================================
const TRADING_KEYWORDS = [
    'trade', 'trading', 'long', 'short', 'rsi', 'smc', 'order block', 'fvg',
    'nến', 'pinbar', 'hammer', 'doji', 'engulfing', 'đòn bẩy', 'leverage',
    'cháy', 'thanh lý', 'liquidation', 'tp', 'sl', 'take profit', 'stop loss',
    'ký quỹ', 'margin', 'r:r', 'risk:reward', 'quản lý vốn', 'golden cross',
    'death cross', 'entry', 'pnl', 'roe', 'tài chính', 'chốt lời', 'cắt lỗ',
    'phân tích kỹ thuật', 'soi kèo', 'crypto', 'bitcoin', 'cowcoin', 'kèo'
];

const TRADING_DISCLAIMER = "\n\n⚠️ **Lưu ý:** *Mọi quyết định giao dịch và rủi ro tài chính đều do bạn tự đưa ra và chịu trách nhiệm. Wind chỉ đóng vai trò trợ lý hỗ trợ phân tích và chia sẻ kiến thức tham khảo.*";

function isTradingQuestion(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return TRADING_KEYWORDS.some(k => lower.includes(k));
}

function getOfflineTradingAnswer(prompt, username, isVip = false) {
    const p = prompt.toLowerCase();

    let answer = "";
    if (p.includes('rsi')) {
        answer = `📊 **Chỉ số RSI (Relative Strength Index) trong Trading là gì?**\n` +
            `RSI đo lường tốc độ và sự biến động của giá trên thang điểm từ 0 đến 100:\n` +
            `• **RSI > 70 (Quá mua - Overbought):** Phe mua đang quá đà, giá có nguy cơ đuối sức và quay đầu giảm (Ưu tiên canh Short).\n` +
            `• **RSI < 30 (Quá bán - Oversold):** Phe bán xả hàng cạn kiệt, giá có xác suất bật hồi phục cao (Ưu tiên canh Long).\n` +
            `• **Mẹo:** Kết hợp phân kỳ RSI (Divergence) với vùng hỗ trợ/kháng cự để bắt đỉnh đáy chuẩn xác nhất!`;
    } else if (p.includes('order block') || p.includes('ob')) {
        answer = `🛡️ **Order Block (OB) trong phương pháp Smart Money Concepts (SMC) là gì?**\n` +
            `Order Block là vùng giá mà các "Cá mập" (Smart Money / Định chế tài chính) đã để lại khối lượng khớp lệnh khổng lồ:\n` +
            `• **Bullish Order Block (Demand):** Cây nến giảm cuối cùng trước một nhịp tăng bứt phá mạnh $\\rightarrow$ Khi giá quay lại retest, đây là vùng hỗ trợ để vào lệnh Long.\n` +
            `• **Bearish Order Block (Supply):** Cây nến tăng cuối cùng trước một nhịp lao dốc mạnh $\\rightarrow$ Vùng cản để canh Short.\n` +
            `• **Quy tắc:** Chỉ trade ở những OB chưa bị chạm (Unmitigated) và có FVG đi kèm.`;
    } else if (p.includes('fvg') || p.includes('fair value gap')) {
        answer = `⚡ **Fair Value Gap (FVG - Khoảng trống giá) là gì?**\n` +
            `FVG là khoảng trống mất cân bằng cung cầu xuất hiện giữa râu nến thứ 1 và râu nến thứ 3 trong cụm 3 cây nến liên tiếp:\n` +
            `• Thị trường luôn có xu hướng "hút" giá quay về để lấp đầy (Fill) khoảng trống thanh khoản này.\n` +
            `• Khi giá lấp đầy 50% hoặc 100% FVG tại một vùng Order Block, đó là điểm kích hoạt lệnh Entry cực đẹp!`;
    } else if (p.includes('quản lý vốn') || p.includes('risk') || p.includes('r:r') || p.includes('vốn')) {
        answer = `🎯 **Nguyên Tắc Quản Lý Vốn Sống Còn Của Một Trader Thành Công:**\n` +
            `1. **Tỷ lệ Risk:Reward (R:R) $\\ge$ 1:2:** Chấp nhận rủi ro mất 1 đồng thì mục tiêu phải ăn ít nhất 2 đồng. Kể cả tỷ lệ thắng chỉ 40%, bạn vẫn có lợi nhuận dài hạn!\n` +
            `2. **Nguyên tắc 2 - 5%:** Mỗi lệnh chỉ nên ký quỹ tối đa 5-10% tổng số Cowcoin trong ví. Tuyệt đối không tất tay (All-in).\n` +
            `3. **Luôn cài Stop Loss (SL):** Không bao giờ gồng lỗ hy vọng giá hồi. Cắt lỗ là chi phí bảo vệ vốn kinh doanh!\n` +
            `4. **Kiểm soát tâm lý:** Sau khi thua 2 lệnh liên tiếp, hãy dừng lại, không được cay cú gỡ lệnh (Revenge Trading).`;
    } else if (p.includes('long') || p.includes('short')) {
        answer = `📈 **Phân Biệt Lệnh LONG và SHORT trong Phái Sinh:**\n` +
            `• 🟢 **LONG (Mua / Đánh lên):** Bạn kỳ vọng giá sẽ tăng. Nếu giá tăng cao hơn giá vào lệnh (Entry), bạn có lãi. Càng tăng càng lãi!\n` +
            `• 🔴 **SHORT (Bán / Đánh xuống):** Bạn kỳ vọng giá sẽ giảm. Nếu giá rớt xuống thấp hơn giá vào lệnh (Entry), bạn có lãi. Thị trường giảm bạn vẫn kiếm được tiền!\n` +
            `• Bạn có thể dùng lệnh \`!long <số_tiền>\` hoặc \`!short <số_tiền>\` trực tiếp trên sàn Wind.`;
    } else if (p.includes('đòn bẩy') || p.includes('leverage') || p.includes('cháy')) {
        answer = `⚡ **Đòn Bẩy (Leverage) & Cơ Chế Thanh Lý (Cháy Tài Khoản):**\n` +
            `• Đòn bẩy giúp phóng đại sức mạnh vốn của bạn. Ví dụ: Ký quỹ 1,000 cowcoin với đòn bẩy x10 $\\rightarrow$ Quy mô vị thế là 10,000 cowcoin (Lãi gấp 10 lần, nhưng lỗ cũng nhanh gấp 10 lần!).\n` +
            `• **Giá Thanh Lý (Liquidation Price):** Khi khoản lỗ vượt quá mức ký quỹ duy trì, vị thế sẽ bị sàn tự động đóng (Cháy lệnh).\n` +
            `• **Khuyến nghị:** Người mới chỉ nên dùng đòn bẩy **x5 - x20**. Đặc quyền VIP được mở khóa tối đa lên đến **x125** kèm bảo hiểm hoàn lại 10% nếu rủi ro bị thanh lý.`;
    } else if (p.includes('nến') || p.includes('pinbar') || p.includes('hammer') || p.includes('engulfing')) {
        answer = `🕯️ **Các Mô Hình Nến Đảo Chiều Quan Trọng Nhất (Price Action):**\n` +
            `• 🔨 **Hammer / Pinbar Bullish:** Râu dưới dài rút chân mạnh $\\rightarrow$ Báo hiệu phe mua đã đẩy giá ngược lên, tín hiệu đảo chiều tăng giá.\n` +
            `• 🌠 **Shooting Star / Pinbar Bearish:** Râu trên dài ngoằng $\\rightarrow$ Phe bán từ chối giá cao, tín hiệu đảo chiều giảm giá.\n` +
            `• 🟢🔥 **Bullish Engulfing (Nhấn chìm tăng):** Thân nến xanh to nuốt trọn nến đỏ trước $\\rightarrow$ Động lượng phe mua bùng nổ.\n` +
            `• ⚖️ **Doji:** Thân nến siêu mỏng $\\rightarrow$ Thị trường đang cân bằng và chuẩn bị có sóng bứt phá.`;
    } else {
        answer = `💡 **Chào bạn! Mình là Trợ Lý Trading Wind.**\n` +
            `Để tham gia thị trường phái sinh trên server, bạn có thể sử dụng các lệnh tiện ích sau:\n` +
            `• \`!trade\` : Mở sàn giao dịch với biểu đồ nến thời gian thực và các nút bấm Mua/Bán.\n` +
            `• \`!ptkt\` hoặc \`!signal\` : Nhận phân tích kỹ thuật và tín hiệu soi kèo từ A.I.\n` +
            `• \`!helptrade\` : Mở cẩm nang hướng dẫn toàn tập từ cơ bản đến nâng cao.\n` +
            `• \`!long <tiền>\` / \`!short <tiền>\` : Khớp lệnh nhanh.\n` +
            `Bạn có thể hỏi mình bất kỳ câu hỏi nào về: RSI, SMC, Order Block, nến Pinbar, FVG, cách tính đòn bẩy hay quản lý vốn nhé!`;
    }

    return `${answer}${TRADING_DISCLAIMER}`;
}

    // D. RA LỆNH VỚI AI GEMINI & TRẢ LỜI CÂU HỎI TRADING KHI ĐƯỢC TAG
    if (!CO_AUTO_CHAT) return false;

    const isMentioned = message.mentions.has(clientUser) && !message.mentions.everyone;
    const isCalledName = contentLower.startsWith("wind ơi") || contentLower.startsWith("wind ");

    if ((isMentioned || isCalledName) && !content.startsWith("!")) {
        const userPrompt = content.replace(new RegExp(`<@!?${clientUser.id}>`, 'g'), '').trim();
        const hasPremiumAccess = await hasActiveVip(message.author.id, message.guild?.id);
        const askingTrade = isTradingQuestion(userPrompt);

        // Nếu không có API Key AI nhưng người dùng hỏi về Trading -> Trả lời ngay bằng Bộ Tri Thức Trading
        if (!ai) {
            if (askingTrade) {
                const tradeReply = getOfflineTradingAnswer(userPrompt, message.author.username, hasPremiumAccess);
                await message.reply(tradeReply);
                return true;
            }
            return true;
        }

        try {
            await message.channel.sendTyping();
            const targetUser = message.mentions.users.find(u => u.id !== clientUser.id);
            const aiModel = hasPremiumAccess
                ? (process.env.GEMINI_PREMIUM_MODEL || premiumModel)
                : 'gemini-2.5-flash';

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

            if (hasPremiumAccess) {
                systemInstruction += '\nNgười dùng đang có Wind VIP: cung cấp câu trả lời chuyên sâu, có cấu trúc và ưu tiên hỗ trợ nâng cao.';
            }

            // ĐẶC BIỆT: HƯỚNG DẪN AI KHI ĐƯỢC HỎI VỀ KIẾN THỨC TRADING
            if (askingTrade) {
                systemInstruction += `\n\n[HƯỚNG DẪN CỐ VẤN TRADING & TÀI CHÍNH]:
Người dùng đang hỏi bạn về kiến thức trading, đầu tư tài chính, phân tích kỹ thuật (RSI, MA Cross, nến Hammer, Engulfing), Smart Money Concepts (Order Block, FVG, Liquidity Sweep), quản trị rủi ro (R:R, quy tắc 2%), hoặc cách chơi sàn phái sinh Wind Exchange (!trade, !long, !short, !pos, !tp, !sl, !helptrade).
Bạn hãy:
1. Đóng vai trò là một Cố Vấn Trading Thực Chiến tận tâm, giải thích sâu sắc, chuẩn xác, dễ hiểu, dùng ngôn từ chuyên nghiệp nhưng thân thiện.
2. Đưa ra ví dụ thực tế hoặc hướng dẫn họ các lệnh tương ứng trên bot nếu phù hợp.
3. BẮT BUỘC chèn dòng cảnh báo rủi ro sau vào CUỐI CÙNG của câu trả lời:
"⚠️ Lưu ý: Mọi quyết định giao dịch và rủi ro tài chính đều do bạn tự đưa ra và chịu trách nhiệm. Wind chỉ đóng vai trò trợ lý hỗ trợ phân tích và chia sẻ kiến thức tham khảo."`;
            }

            let promptText = `Người dùng (${message.author.username}): "${userPrompt}"`;
            if (targetUser && isAdmin) {
                promptText += `\n(ID Người dùng được tag để thao tác: ${targetUser.id})`;
            }

            let response;
            try {
                response = await ai.models.generateContent({
                    model: aiModel,
                    contents: `${systemInstruction}\n\n${promptText}`,
                });
            } catch (modelError) {
                if (askingTrade) {
                    const fallbackReply = getOfflineTradingAnswer(userPrompt, message.author.username, hasPremiumAccess);
                    await message.reply(fallbackReply);
                    return true;
                }
                if (!hasPremiumAccess || aiModel === 'gemini-2.5-flash') throw modelError;
                console.error('Model AI VIP không khả dụng, chuyển về model thường:', modelError.message);
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `${systemInstruction}\n\n${promptText}`,
                });
            }

            let botReply = response.text || "Chào bạn nha!";

            // Đảm bảo dòng lưu ý luôn có mặt nếu câu hỏi về trade
            if (askingTrade && !botReply.includes('Mọi quyết định giao dịch')) {
                botReply += TRADING_DISCLAIMER;
            }

            // Lớp bảo mật quan trọng: Chỉ thực thi lệnh quản trị khi là ADMIN
            if (isAdmin) {
                botReply = await executeServerAction(message, botReply);
            }

            if (botReply) await message.reply(botReply);

            return true;
        } catch (error) {
            console.error("Lỗi AI Chat/Role Action:", error);
            if (askingTrade) {
                const fallbackReply = getOfflineTradingAnswer(userPrompt, message.author.username, hasPremiumAccess);
                await message.reply(fallbackReply).catch(() => {});
            }
            return true;
        }
    }

    return false;
}

module.exports = {
    handleChatInteraction,
    initAutoSpam
};