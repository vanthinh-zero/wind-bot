const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const ADMIN_ID = process.env.ADMIN_ID;
const BLACKLIST_WORDS = ['cặc', 'cac', 'cajc', 'kặc', 'kac', 'lồn', 'lon', 'lozn', 'l0n', 'địt', 'dit', 'đjt', 'djt', 'sex', 'porn', 'pỏn', 'hentai'];

async function handleAutoMod(message) {
    if (message.author.bot || !message.guild) return false;

    const isBotAdmin = message.author.id === ADMIN_ID;
    const hasModPerms = message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
                        message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers);

    if (!isBotAdmin && !hasModPerms) {
        const contentLower = message.content.toLowerCase();
        const cleanContent = contentLower.replace(/[\s\.\-\_\,\;\:\*]/g, '');
        const hasBannedWord = BLACKLIST_WORDS.some(word => cleanContent.includes(word));

        const linkRegex = /(https?:\/\/[^\s]+)/g;
        let hasForbiddenLink = false;
        if (linkRegex.test(contentLower)) {
            const links = contentLower.match(linkRegex);
            const isSafeLink = links.every(link => link.includes('discord.com') || link.includes('discord.gg') || link.includes('tenor.com'));
            if (!isSafeLink) hasForbiddenLink = true;
        }

        if (hasBannedWord || hasForbiddenLink) {
            try {
                if (message.deletable) await message.delete().catch(() => {});
                const muteDuration = 10 * 60 * 1000;
                const reason = hasBannedWord ? "Gửi từ ngữ không hợp lệ / nội dung 18+." : "Gửi liên kết (link) trái phép.";
                await message.member.timeout(muteDuration, `[AutoMod] ${reason}`);

                const alertEmbed = new EmbedBuilder()
                    .setColor('#ff3333')
                    .setTitle('⚠️ CẢNH BÁO HỆ THỐNG')
                    .setDescription(`Thành viên ${message.author} đã bị **tắt tiếng 10 phút**.\n**Lý do:** ${reason}`)
                    .setTimestamp();

                const alertMsg = await message.channel.send({ embeds: [alertEmbed] });
                setTimeout(() => alertMsg.delete().catch(() => {}), 5000);
                return true; // Đã xử lý chặn
            } catch (error) {
                console.error('❌ Lỗi AutoMod:', error);
            }
        }
    }
    return false;
}

async function handleAdminCommands(message) {
    // -----------------------------------------------------
    // 1. LỆNH !clear / !clear-all
    // -----------------------------------------------------
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

    // -----------------------------------------------------
    // 2. LỆNH !ban
    // -----------------------------------------------------
    if (message.content.startsWith('!ban ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers) && message.author.id !== ADMIN_ID) return false;
        const target = message.mentions.members.first();
        if (!target || !target.bannable) return false;
        const reason = message.content.split(' ').slice(2).join(' ') || 'Không có lý do.';
        await target.ban({ reason }).catch(() => {});
        await message.channel.send(`🔨 Đã cấm thành viên **${target.user.tag}**!`);
        return true;
    }

    // -----------------------------------------------------
    // 3. LỆNH !unban (MỚI TÍCH HỢP)
    // -----------------------------------------------------
    if (message.content.startsWith('!unban ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers) && message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không có quyền gỡ cấm thành viên!');
        }
        
        const args = message.content.split(' ');
        const targetId = args[1]; // Lấy ID người dùng (Ví dụ: !unban 123456789012345678)
        
        if (!targetId || isNaN(targetId)) {
            return message.reply('❌ Vui lòng nhập đúng ID người dùng cần gỡ cấm! Định dạng: `!unban <ID_người_dùng>`');
        }

        try {
            // Kiểm tra xem ID đó có thực sự nằm trong danh sách bị ban không
            const banList = await message.guild.bans.fetch();
            const isBanned = banList.has(targetId);

            if (!isBanned) {
                return message.reply('🙋‍♂️ Người dùng có ID này hiện tại không bị cấm trong server.');
            }

            // Thực thi lệnh unban
            await message.guild.members.unban(targetId, `Được gỡ cấm bởi ${message.author.tag}`);
            await message.channel.send(`🕊️ Đã gỡ cấm thành công cho người dùng có ID: **${targetId}**!`);
            return true;
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh unban:', error);
            return message.reply('❌ Không thể gỡ cấm. Vui lòng kiểm tra lại ID hoặc quyền hạn của Bot!');
        }
    }

    // -----------------------------------------------------
    // 4. LỆNH !mute
    // -----------------------------------------------------
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

    // -----------------------------------------------------
    // 5. LỆNH !unmute (MỚI TÍCH HỢP)
    // -----------------------------------------------------
    if (message.content.startsWith('!unmute ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) && message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không có quyền bỏ tắt tiếng thành viên!');
        }
        
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Vui lòng tag thành viên cần gỡ tắt tiếng! Định dạng: `!unmute @Tên`');

        // Kiểm tra xem người đó có đang bị timeout hay không
        if (!target.communicationDisabledUntilTimestamp || target.communicationDisabledUntilTimestamp < Date.now()) {
            return message.reply('🙋‍♂️ Thành viên này hiện tại không bị tắt tiếng.');
        }

        try {
            // Gửi giá trị null vào lệnh timeout để gỡ phạt ngay lập tức
            await target.timeout(null, `Được giải phạt bởi ${message.author.tag}`);
            await message.channel.send(`🔊 Đã gỡ tắt tiếng, trả lại tự do ngôn luận cho **${target.user.tag}**!`);
            return true;
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh unmute:', error);
            return message.reply('❌ Bot không đủ quyền hạn (Vị trí Role của Bot phải đứng trên vị trí của người cần unmute)!');
        }
    }

    return false;
}

module.exports = { handleAutoMod, handleAdminCommands };