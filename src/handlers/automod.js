const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const ADMIN_ID = process.env.ADMIN_ID;

// Bộ từ khóa cấm nặng (Chửi bậy bạ sẽ bị Mute 10 phút)
const BANNED_REGEX = [
    /\bcặc\b/i, /\bcac\b/i, /\bcajc\b/i, /\bkặc\b/i, /\bkac\b/i,
    /\blồn\b/i, /\blon\b/i, /\blozn\b/i, /\bl0n\b/i,
    /\bđịt\b/i, /\bdit\b/i, /\bđjt\b/i, /\bdjt\b/i,
    /\bsex\b/i, /\bporn\b/i, /\bpỏn\b/i, /\bhentai\b/i
];

// =========================================================
// 🚨 LUỒNG 1: QUÉT VÀ XỬ LÝ TỪ CẤM / LINK BẨN (AUTOMOD)
// =========================================================
async function handleAutoMod(message) {
    if (message.author.bot || !message.guild) return false;

    const isBotAdmin = message.author.id === ADMIN_ID;
    const hasModPerms = message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
                        message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers);

    if (message.content.startsWith('!')) return false;

    if (!isBotAdmin && !hasModPerms) {
        const contentLower = message.content.toLowerCase();
        
        if (contentLower.includes('bot')) {
            return false;
        }

        const normalizedContent = contentLower.replace(/[\.\-\_\,\;\:\*]/g, ' '); 
        const hasBannedWord = BANNED_REGEX.some(regex => regex.test(normalizedContent));

        const linkRegex = /(https?:\/\/[^\s]+)/g;
        let hasForbiddenLink = false;
        const links = contentLower.match(linkRegex); 
        
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

// =========================================================
// 🔨 LUỒNG 2: CÁC LỆNH ĐIỀU HÀNH BAN QUẢN TRỊ (ADMIN COMMANDS)
// =========================================================
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

// =========================================================
// 🎉 LUỒNG 3: TỰ ĐỘNG CẤP VAI TRÒ & CHÀO MỪNG ĐẠO HỮU MỚI
// =========================================================
async function handleWelcomeAndAutoRole(member) {
    // 1. Thực hiện AutoRole (ID vai trò bạn cung cấp)
    const autoRoleId = '1507794618253709392'; 
    const role = member.guild.roles.cache.get(autoRoleId);
    if (role) {
        await member.roles.add(role).catch(err => {
            console.error(`❌ Không thể cấp role tự động: Bậc role của Bot thấp hơn hoặc thiếu quyền Manage Roles. Chi tiết:`, err.message);
        });
    }

    // 2. Thực hiện gửi tin nhắn chào mừng giống ảnh mẫu
    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID; // Lấy ID kênh từ file .env của bạn
    if (!welcomeChannelId) return;

    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (!channel) return;

    // Định dạng giờ gửi giống ảnh của bạn (Ví dụ: 10/06/2026 3:49 CH)
    const currentTimeString = new Date().toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    }).replace(',', '');

    const welcomeEmbed = new EmbedBuilder()
        .setColor('#0099ff') // Màu thanh xanh giống ảnh mẫu
        .setTitle('🎉 CHÀO MỪNG ĐẠO HỮU MỚI! 🎉')
        .setDescription(`Chào mừng ${member} đã nhập môn thành công!\n\n📌 **Lên hương nghe giảng luật tại:** <#không xác định>\n🔹 **Cần trưởng lão hỗ trợ bấm tại:** <#ticket>`)
        .setFooter({ text: currentTimeString });

    await channel.send({ embeds: [welcomeEmbed] }).catch((e) => console.error("Không thể gửi tin nhắn chào mừng:", e));
}

module.exports = { handleAutoMod, handleAdminCommands, handleWelcomeAndAutoRole };