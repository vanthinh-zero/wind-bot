const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { COLORS, author, footer } = require('../utils/embedTheme');
const ADMIN_ID = process.env.ADMIN_ID;

const mutedTracker = new Map();

// =========================================================
// 🚨 BỘ REGEX CHỐNG MUTE OAN (CHỈ BẮT TỪ CHỬI TỤC RÕ RÀNG)
// =========================================================
const BANNED_PATTERNS = [
    // --- 1. CẶC / KẶC ---
    /\b(c|k)[ặaâáàảãạ4@]*[c|k|j]+\b/i,
    /c[\.\-\_\,\;\:\*\~\s]+ặ[\.\-\_\,\;\:\*\~\s]+c/i,
    
    // --- 2. LỒN ---
    /\bl[ôo0ồốổỗộ3]+(n|zn)\b/i,
    /l[\.\-\_\,\;\:\*\~\s]+ồ[\.\-\_\,\;\:\*\~\s]+n/i,
    
    // --- 3. ĐỊT / ĐJ T ---
    /\b(đ|d)[ịij1]+t\b/i,
    /đ[\.\-\_\,\;\:\*\~\s]+ị[\.\-\_\,\;\:\*\~\s]+t/i,
    
    // --- 4. BUỒI ---
    /\bb[uúùủũụ]+[ôoồốổỗộ0]+[ij1]+\b/i,
    
    // --- 5. ĐĨ (Không bắt chữ "đi", "đẹp", "dẹp") ---
    /\bcon[\s\.\-\_\*]*(đĩ|đĩ|đĩa|dĩa)\b/i,
    /\b(đĩ|đĩ|đĩa)\b/i,

    // --- 6. CHỬI THỀ TẮT ---
    /\b(d|đ)(m|mm|cm|km|kc|cl|kl|cc)\b/i,
    /\b(v|w)(c|k)(l|c|k)\b/i,
    /\b(địt|dit|đ|d)[\s\.\-\_\*]*(mẹ|me)\b/i,
    /\b(chó|cho)[\s\.\-\_\*]*(đẻ|de)\b/i,

    // --- 7. 18+ / ĐỒI TRỤY ---
    /\b(sex|s3x|porn|p0rn|pỏn|prn|hentai|h3ntai)\b/i,
    /\b(chịch|chich|hiếp\s*dâm|quay\s*tay|thủ\s*dâm)\b/i
];

async function handleAutoMod(message) {
    if (message.author.bot || !message.guild) return false;

    // Bỏ qua trong các kênh riêng tư / ticket
    const channelName = message.channel.name.toLowerCase();
    const isTicketChannel = channelName.includes('ticket') || 
                            channelName.includes('giveaway') || 
                            channelName.includes('khieu-nai') || 
                            channelName.includes('chuyen-rieng') || 
                            channelName.includes('support');

    if (isTicketChannel) return false;

    const isBotAdmin = message.author.id === ADMIN_ID;
    const hasModPerms = message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
                        message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers);

    if (message.content.startsWith('!')) return false;

    if (!isBotAdmin && !hasModPerms) {
        // Chỉ quét trực tiếp văn bản gốc, KHÔNG xóa khoảng trắng để tránh gộp chữ gây hiểu nhầm
        const rawContent = message.content;

        const hasBannedWord = BANNED_PATTERNS.some(regex => regex.test(rawContent));

        // Kiểm tra link discord invite
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        let hasForbiddenLink = false;
        const links = rawContent.match(linkRegex); 
        
        if (links && links.length > 0) {
            const containsDiscordInvite = links.some(link => link.includes('discord.gg') || link.includes('discord.com/invite'));
            if (containsDiscordInvite) {
                hasForbiddenLink = true;
            }
        }

        if (hasBannedWord || hasForbiddenLink) {
            try {
                const violatedContent = message.content; 
                
                if (message.deletable) await message.delete().catch(() => {});
                
                const muteDuration = 10 * 60 * 1000;
                const reason = hasBannedWord ? "Gửi từ ngữ không hợp lệ / nội dung 18+." : "Gửi liên kết mời (Discord Invite) trái phép.";
                await message.member.timeout(muteDuration, `[AutoMod] ${reason}`);

                mutedTracker.set(message.author.id, {
                    mutedBy: 'AUTOMOD',
                    isAutoMod: true
                });

                const logChannelId = process.env.KENH_LOG_AUTOMOD;
                if (logChannelId) {
                    const logChannel = message.guild.channels.cache.get(logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(COLORS.sun)
                            .setAuthor(author('MODERATION LOG'))
                            .setTitle('🚨 Nhật ký xử lý AutoMod')
                            .addFields(
                                { name: '👤 Người vi phạm', value: `${message.author} (${message.author.tag})`, inline: true },
                                { name: '🆔 ID Người dùng', value: `\`${message.author.id}\``, inline: true },
                                { name: '📍 Kênh vi phạm', value: `${message.channel}`, inline: true },
                                { name: '📝 Lý do xử lý', value: reason },
                                { name: '⏳ Hình phạt', value: '**Mute (Timeout) 10 phút**' },
                                { name: '💬 Nội dung tin nhắn gốc', value: `\`\`\`${violatedContent.slice(0, 1000) || '[Không có chữ]'}\`\`\`` }
                            )
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] }).catch((e) => console.error("Không thể gửi log:", e));
                    }
                }

                const alertEmbed = new EmbedBuilder()
                    .setColor(COLORS.danger)
                    .setAuthor(author('SAFETY SYSTEM'))
                    .setTitle('⚠️ Cảnh báo hệ thống')
                    .setDescription(`Thành viên ${message.author} đã bị **tắt tiếng 10 phút**.\n**Lý do:** ${reason}`)
                    .setFooter(footer('AutoMod • Bảo vệ không gian cộng đồng'))
                    .setTimestamp();

                const alertMsg = await message.channel.send({ embeds: [alertEmbed] });
                setTimeout(() => alertMsg.delete().catch(() => {}), 5000);
                return true; 
            } catch (error) {
                console.error('❌ Lỗi AutoMod:', error);
            }
        }
    }
    return false;
}

async function handleAdminCommands(message) {
    if (message.author.bot || !message.guild) return false;

    if (message.content.startsWith('!clear')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không có quyền Quản lý tin nhắn!');
        }
        let amount = message.content === '!clear-all' ? 100 : parseInt(message.content.split(' ')[1]);
        if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ Số lượng từ 1 đến 100!');
        
        await message.delete().catch(() => {});
        const deleted = await message.channel.bulkDelete(amount, true);
        const reply = await message.channel.send(`✅ Đã dọn dẹp **${deleted.size}** tin nhắn!`);
        setTimeout(() => reply.delete().catch(() => {}), 3000);
        return true;
    }

    if (message.content.startsWith('!ban ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers) && message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không có quyền cấm thành viên!');
        }
        const target = message.mentions.members.first();
        if (!target || !target.bannable) return message.reply('❌ Không tìm thấy đối tượng hoặc Bot không đủ quyền cấm người này!');
        const reason = message.content.split(' ').slice(2).join(' ') || 'Không có lý do.';
        await target.ban({ reason }).catch(() => {});
        await message.channel.send(`🔨 Đã cấm thành viên **${target.user.tag}**!`);
        return true;
    }

    if (message.content.startsWith('!unban ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers) && message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không có quyền gỡ cấm thành viên!');
        }
        const args = message.content.split(' ');
        const targetId = args[1];
        if (!targetId || isNaN(targetId)) return message.reply('❌ Vui lòng nhập đúng ID người dùng! Định dạng: `!unban <ID_người_dùng>`');

        try {
            const banList = await message.guild.bans.fetch();
            if (!banList.has(targetId)) return message.reply('🙋‍♂️ Người dùng này hiện tại không bị cấm.');
            await message.guild.members.unban(targetId, `Được gỡ cấm bởi ${message.author.tag}`);
            await message.channel.send(`🕊️ Đã gỡ cấm thành công cho ID: **${targetId}**!`);
            return true;
        } catch (error) {
            console.error('❌ Lỗi unban:', error);
            return message.reply('❌ Không thể gỡ cấm. Kiểm tra lại ID hoặc quyền của Bot!');
        }
    }

    if (message.content.startsWith('!mute ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) && message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không có quyền tắt tiếng thành viên!');
        }
        const args = message.content.split(' ');
        const target = message.mentions.members.first();
        const duration = parseInt(args[2]);
        if (!target || isNaN(duration)) return message.reply('❌ Sai định dạng! Ví dụ: `!mute @Tên 10`');
        
        await target.timeout(duration * 60 * 1000, `Lệnh phạt bởi ${message.author.tag}`).catch(() => {});
        
        mutedTracker.set(target.id, {
            mutedBy: message.author.id,
            isAutoMod: false
        });

        await message.channel.send(`🔇 Đã tắt tiếng **${target.user.tag}** trong ${duration} phút!`);
        return true;
    }

    if (message.content.startsWith('!unmute ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) && message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không có quyền bỏ tắt tiếng thành viên!');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Vui lòng tag thành viên! Định dạng: `!unmute @Tên`');
        if (!target.communicationDisabledUntilTimestamp || target.communicationDisabledUntilTimestamp < Date.now()) {
            return message.reply('🙋‍♂️ Thành viên này hiện tại không bị tắt tiếng.');
        }

        const muteInfo = mutedTracker.get(target.id);
        const isOwnerAdmin = message.author.id === ADMIN_ID;

        if (muteInfo?.isAutoMod && !isOwnerAdmin) {
            return message.reply('❌ Thành viên này bị Mute do hệ thống AutoMod (chửi tục/link cấm). Chỉ có **OWNER** mới được quyền unmute!');
        }

        if (muteInfo && !muteInfo.isAutoMod && muteInfo.mutedBy !== message.author.id && !isOwnerAdmin) {
            return message.reply('❌ Bạn không thể gỡ Mute cho thành viên này vì người này do một Admin/Mod khác xử lý!');
        }

        try {
            await target.timeout(null, `Được giải phạt bởi ${message.author.tag}`);
            mutedTracker.delete(target.id);
            await message.channel.send(`🔊 Đã gỡ tắt tiếng cho **${target.user.tag}**!`);
            return true;
        } catch (error) {
            console.error('❌ Lỗi unmute:', error);
            return message.reply('❌ Bot không đủ quyền hạn!');
        }
    }

    return false;
}

module.exports = { handleAutoMod, handleAdminCommands };