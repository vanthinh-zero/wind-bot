// src/handlers/poem.js (hoặc file chứa mã này)
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const ADMIN_ID = process.env.ADMIN_ID;

// Thiết lập bộ từ khóa cấm dạng Regex Word-Boundary (\b) để tránh lỗi nuốt từ (ví dụ: "đi tắm", "xen kẽ")
const BANNED_REGEX = [
    /\bcặc\b/i, /\bcac\b/i, /\bcajc\b/i, /\bkặc\b/i, /\bkac\b/i,
    /\blồn\b/i, /\blon\b/i, /\blozn\b/i, /\bl0n\b/i,
    /\bđịt\b/i, /\bdit\b/i, /\bđjt\b/i, /\bdjt\b/i,
    /\bsex\b/i, /\bporn\b/i, /\bpỏn\b/i, /\bhentai\b/i
];

async function handleAutoMod(message) {
    if (message.author.bot || !message.guild) return false;

    const isBotAdmin = message.author.id === ADMIN_ID;
    const hasModPerms = message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
                        message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers);

    if (!isBotAdmin && !hasModPerms) {
        const contentLower = message.content.toLowerCase();
        
        // 1. KIỂM TRA TỪ CẤM (Chuẩn hóa loại bỏ ký tự lạ nhưng giữ khoảng cách từ để ko bị dính chữ)
        const normalizedContent = contentLower.replace(/[\.\-\_\,\;\:\*]/g, ' '); 
        const hasBannedWord = BANNED_REGEX.some(regex => regex.test(normalizedContent));

        // 2. KIỂM TRA LINK (Chỉ chặn link Discord Invite, cho phép link nhạc/các link khác)
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        let hasForbiddenLink = false;
        const links = contentLower.match(linkRegex); // Lấy thẳng mảng link nếu có
        
        if (links && links.length > 0) {
            // Kiểm tra xem có bất kỳ link nào chứa từ khóa discord.gg hoặc discord.com/invite không
            const containsDiscordInvite = links.some(link => link.includes('discord.gg') || link.includes('discord.com/invite'));
            if (containsDiscordInvite) {
                hasForbiddenLink = true;
            }
        }

        // 3. XỬ LÝ KHI VI PHẠM
        if (hasBannedWord || hasForbiddenLink) {
            try {
                const violatedContent = message.content; 
                
                if (message.deletable) await message.delete().catch(() => {});
                const muteDuration = 10 * 60 * 1000;
                const reason = hasBannedWord ? "Gửi từ ngữ không hợp lệ / nội dung 18+." : "Gửi liên kết mời (Discord Invite) trái phép.";
                await message.member.timeout(muteDuration, `[AutoMod] ${reason}`);

                // GỬI LOG ĐẾN KÊNH KÍN
                const logChannelId = process.env.KENH_LOG_AUTOMOD;
                if (logChannelId) {
                    const logChannel = message.guild.channels.cache.get(logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#ffaa00')
                            .setTitle('🚨 HỆ THỐNG AUTOMOD - NHẬT KÝ PHẠT')
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

                // CẢNH BÁO TẠI KÊNH CHAT
                const alertEmbed = new EmbedBuilder()
                    .setColor('#ff3333')
                    .setTitle('⚠️ CẢNH BÁO HỆ THỐNG')
                    .setDescription(`Thành viên ${message.author} đã bị **tắt tiếng 10 phút**.\n**Lý do:** ${reason}`)
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

// Giữ nguyên toàn bộ cụm handleAdminCommands phía dưới của bạn...
async function handleAdminCommands(message) {
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
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers) && message.author.id !== ADMIN_ID) return false;
        const target = message.mentions.members.first();
        if (!target || !target.bannable) return false;
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
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) && message.author.id !== ADMIN_ID) return false;
        const args = message.content.split(' ');
        const target = message.mentions.members.first();
        const duration = parseInt(args[2]);
        if (!target || isNaN(duration)) return false;
        await target.timeout(duration * 60 * 1000, "Lệnh phạt").catch(() => {});
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

        try {
            await target.timeout(null, `Được giải phạt bởi ${message.author.tag}`);
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