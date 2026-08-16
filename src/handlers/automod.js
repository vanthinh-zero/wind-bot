const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const ADMIN_ID = process.env.ADMIN_ID;

// Bộ lưu trữ bộ nhớ tạm ghi nhận ai đã mute thành viên nào
// Key: targetUserId, Value: { mutedBy: moderatorId, isAutoMod: boolean }
const mutedTracker = new Map();

// =========================================================
// 🚨 BỘ TỪ KHÓA CẤM MỞ RỘNG & TỐI ƯU CHỐNG LÁCH LUẬT
// =========================================================
const BANNED_PATTERNS = [
    // --- 1. NHÓM TỤC TĨU (CẶC, LỒN, ĐỊT, ĐỒ LỒN, BUỒI...) ---
    // Cặc, cac, cajc, kặc, kac, kack, k@c, c@c, c.ặ.c...
    /[c|k]+[\s\.\-\_\,\;\:\*\d\@]*[ă|a|â|á|à|ả|ã|ạ|4|\@]*[\s\.\-\_\,\;\:\*\d\@]*[c|k|j]+/i,
    
    // Lồn, lon, lozn, l0n, l3n, l.ồ.n...
    /l+[\s\.\-\_\,\;\:\*\d\@]*[ô|o|0|ồ|ố|ổ|ỗ|ộ|3]+[\s\.\-\_\,\;\:\*\d\@]*[n|zn]+/i,
    
    // Địt, dit, đjt, djt, d1t, đ1t, d.ị.t...
    /[đ|d]+[\s\.\-\_\,\;\:\*\d\@]*[ị|i|j|1|í|ì|ỉ|ĩ|ị]+[\s\.\-\_\,\;\:\*\d\@]*t+/i,
    
    // Buồi, buoi, buo2i, b.u.ồ.i...
    /b+[\s\.\-\_\,\;\:\*\d\@]*[u|ú|ù|ủ|ũ|ụ]+[\s\.\-\_\,\;\:\*\d\@]*[ô|o|ồ|ố|ổ|ỗ|ộ|0]+[\s\.\-\_\,\;\:\*\d\@]*[i|j|1]+/i,
    
    // Con đĩ, đĩ xõa...
    /con[\s\.\-\_\,\;\:\*]*đĩ/i, /con[\s\.\-\_\,\;\:\*]*đĩa/i, /con[\s\.\-\_\,\;\:\*]*di/i,

    // --- 2. NHÓM TỪ NGHĨA ĐỒI TRỤY / 18+ ---
    // Sex, s3x, s.e.x...
    /s+[\s\.\-\_\,\;\:\*\d\@]*[e|3]+[\s\.\-\_\,\;\:\*\d\@]*x+/i,
    
    // Porn, p0rn, prn, p.o.r.n...
    /p+[\s\.\-\_\,\;\:\*\d\@]*[o|ô|0]+[\s\.\-\_\,\;\:\*\d\@]*r+[\s\.\-\_\,\;\:\*\d\@]*n+/i,
    
    // Bỏn, pon, pỏn...
    /p+[\s\.\-\_\,\;\:\*\d\@]*[ỏ|o|ô|0]+[\s\.\-\_\,\;\:\*\d\@]*n+/i,
    
    // Hentai, h3ntai, h.e.n.t.a.i...
    /h+[\s\.\-\_\,\;\:\*\d\@]*[e|3]+[\s\.\-\_\,\;\:\*\d\@]*n+[\s\.\-\_\,\;\:\*\d\@]*t+[\s\.\-\_\,\;\:\*\d\@]*a+[\s\.\-\_\,\;\:\*\d\@]*[i|j|1]+/i,
    
    // Dâm, dam, dâmm, d.â.m...
    /[d|đ]+[\s\.\-\_\,\;\:\*\d\@]*[â|a|á|à|ả|ã|ạ]+[\s\.\-\_\,\;\:\*\d\@]*m+/i,
    
    // Thủ dâm, quay tay, hiếp, hiep dam, chịch, chich...
    /ch+[\s\.\-\_\,\;\:\*\d\@]*[ị|i|j|1]+[\s\.\-\_\,\;\:\*\d\@]*ch+/i,
    /hiếp/i, /hiep/i, /quay[\s\.\-\_\,\;\:\*]*tay/i, /thu[\s\.\-\_\,\;\:\*]*dam/i,

    // --- 3. NHÓM CHỬI THỀ / XÚC PHẠM VĂN HÓA XÃ HỘI ---
    // dm, dmm, dcm, đcm, dkm, đkm, vcl, vkl, vcc...
    /\b(d|đ)(m|mm|cm|km|kc|cl|kl|cc)\b/i,
    /\b(v|w)(c|k)(l|c|k)\b/i,
    
    // Địt mẹ, dit me, đm, dm, đ*t mẹ, d.ị.t m.ẹ...
    /[đ|d]+[\s\.\-\_\,\;\:\*\d\@]*[ị|i|j|1]*[\s\.\-\_\,\;\:\*\d\@]*t*[\s\.\-\_\,\;\:\*\d\@]*m+[ẹ|e|é|è|ẻ|ẽ|ẹ]*/i,
    
    // Mẹ kiếp, chó đẻ, cún đẻ, đĩ mẹ...
    /chó[\s\.\-\_\,\;\:\*]*đẻ/i, /cho[\s\.\-\_\,\;\:\*]*de/i,
    /đĩ[\s\.\-\_\,\;\:\*]*mẹ/i, /di[\s\.\-\_\,\;\:\*]*me/i,
    
    // --- 4. NHÓM TỪ NGHĨA BỆNH HOẢN / BIẾN THÁI ---
    /lọan[\s\.\-\_\,\;\:\*]*luan/i, /loạn[\s\.\-\_\,\;\:\*]*luân/i,
    /hiếp[\s\.\-\_\,\;\:\*]*dâm/i, /hiep[\s\.\-\_\,\;\:\*]*dam/i
];

// =========================================================
// 🚨 LUỒNG 1: QUÉT VÀ XỬ LÝ TỪ CẤM / LINK BẨN (AUTOMOD)
// =========================================================
async function handleAutoMod(message) {
    if (message.author.bot || !message.guild) return false;

    // 🛑 CHO PHÉP CHỬI TỤC TRONG TICKET: Bỏ qua AutoMod hoàn toàn nếu đang ở kênh Ticket
    const channelName = message.channel.name.toLowerCase();
    const isTicketChannel = channelName.includes('ticket') || 
                            channelName.includes('giveaway') || 
                            channelName.includes('khieu-nai') || 
                            channelName.includes('chuyen-rieng') || 
                            channelName.includes('support');

    if (isTicketChannel) return false; // Không xóa tin nhắn, không warn, không mute!

    const isBotAdmin = message.author.id === ADMIN_ID;
    const hasModPerms = message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
                        message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers);

    if (message.content.startsWith('!')) return false;

    if (!isBotAdmin && !hasModPerms) {
        // Xiết chặt kiểm tra: Chuẩn hóa unicode và loại bỏ các ký tự đặc biệt/khoảng trắng dư thừa
        const rawContent = message.content.toLowerCase();
        const normalizedContent = rawContent
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt để tránh lách
            .replace(/[\.\-\_\,\;\:\*\s\~\`\^\&\#\@\$\%\(\)\{\}\[\]\\\/\|]/g, ''); // Xóa ký tự phân tách

        const hasBannedWord = BANNED_PATTERNS.some(regex => regex.test(rawContent) || regex.test(normalizedContent));

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

                // Lưu vết AutoMod đã phạt
                mutedTracker.set(message.author.id, {
                    mutedBy: 'AUTOMOD',
                    isAutoMod: true
                });

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
        
        await target.timeout(duration * 60 * 1000, `Lệnh phạt bởi ${message.author.tag}`).catch(() => {});
        
        // Lưu vết Admin nào đã thực hiện Mute
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

        // KIỂM TRA PHÂN QUYỀN UNMUTE
        // 1. Nếu bị AutoMod phạt (chửi tục/link bẩn): CHỈ ADMIN_ID (OWNER) mới có quyền gỡ
        if (muteInfo?.isAutoMod && !isOwnerAdmin) {
            return message.reply('❌ Thành viên này bị Mute do hệ thống AutoMod (chửi tục/link cấm). Chỉ có **OWNER** mới được quyền unmute!');
        }

        // 2. Nếu Mute thủ công bằng lệnh !mute: Chỉ ADMIN_ID (OWNER) HOẶC chính Admin đã gõ !mute người đó mới được gỡ
        if (muteInfo && !muteInfo.isAutoMod && muteInfo.mutedBy !== message.author.id && !isOwnerAdmin) {
            return message.reply('❌ Bạn không thể gỡ Mute cho thành viên này vì người này do một Admin/Mod khác xử lý!');
        }

        try {
            await target.timeout(null, `Được giải phạt bởi ${message.author.tag}`);
            mutedTracker.delete(target.id); // Xóa dữ liệu tạm sau khi unmute thành công
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