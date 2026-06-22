const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const SPAM_LIMIT = 5; 
const TIME_WINDOW = 3000; 
const TIME_MUTE = 10 * 60 * 1000; 
const usersMap = new Map();

/**
 * HÀM CHỐNG SPAM TỐC ĐỘ CAO (ANTI-MASS SPAM)
 */
async function handleAntiSpam(message) {
    if (message.author.bot || !message.guild || message.author.id === process.env.ADMIN_ID) return false;
    if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return false;

    const userId = message.author.id;
    const currentTime = Date.now();

    if (usersMap.has(userId)) {
        const userData = usersMap.get(userId);
        const { lastMessageTime, msgCount } = userData;

        if (currentTime - lastMessageTime < TIME_WINDOW) {
            let newCount = msgCount + 1;
            
            if (newCount >= SPAM_LIMIT) {
                try {
                    if (message.channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
                        await message.channel.bulkDelete(SPAM_LIMIT).catch(() => {});
                    }

                    await message.member.timeout(TIME_MUTE, 'Hệ thống Anti-Raid: Phát hiện Spam tốc độ cao.');

                    const warnEmbed = new EmbedBuilder()
                        .setTitle('🛡️ HỆ THỐNG BẢO AN KÍCH HOẠT')
                        .setDescription(`Thành viên ${message.author} vừa bị cách ly **10 phút** vì hành vi cố tình làm loạn, spam phá hoại server.`)
                        .setColor('#ff0000')
                        .setTimestamp();

                    await message.channel.send({ embeds: [warnEmbed] });
                    usersMap.delete(userId);
                    return true; 
                } catch (err) {
                    console.error('Không thể phạt kẻ spam:', err);
                }
            } else {
                userData.msgCount = newCount;
                userData.lastMessageTime = currentTime;
                usersMap.set(userId, userData);
            }
        } else {
            usersMap.set(userId, { lastMessageTime: currentTime, msgCount: 1 });
        }
    } else {
        usersMap.set(userId, { lastMessageTime: currentTime, msgCount: 1 });
    }
    return false;
}

/**
 * 🚨 LỆNH TROLL FAKE RAID (CHỈ SẾP THẤY)
 */
async function handleFakeRaidCommand(message) {
    if (message.author.id !== process.env.ADMIN_ID) return false;

    if (message.content.trim() === '!fakeraid') {
        await message.delete().catch(() => {});

        const fakeRaidEmbed = new EmbedBuilder()
            .setTitle('🚨🚨🚨 CẢNH BÁO: PHÁT HIỆN CUỘC TẤN CÔNG DIỆN RỘNG (MASS RAID) 🚨🚨🚨')
            .setColor('#ff0000')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setDescription(
                `**[HỆ THỐNG PHÒNG THỦ KHẨN CẤP: ĐÀN BÒ BIẾT BAY]**\n\n` +
                `⚠️ **Mức độ đe dọa:** \`CRITICAL / ĐỎ THẪM\`\n` +
                `👾 **Trạng thái:** Phát hiện hơn 50+ kết nối ảo (Bot Clones) cố gắng tràn vào máy chủ trong 1.5 giây!\n` +
                `💥 **Tác vụ quấy rối:** Triển khai Mass Spam @everyone & Tự động tạo kênh rác hàng loạt.\n\n` +
                `⚙️ **HÀNH ĐỘNG BẢO AN ĐANG ĐƯỢC THỰC THI BỞI BOT WIN:**\n` +
                `├ 🔒 *Kích hoạt trạng thái Lockdown: Đóng toàn bộ cổng Server.*\n` +
                `├ 🛑 *Bật cơ chế Anti-Join: Đóng băng tất cả các Link mời (Invite Link).*\n` +
                `├ 🗑️ *Quét dọn: Auto-delete 120 tin nhắn rác tại các kênh công cộng.*\n` +
                `└ ⚡ *Trừng phạt: Đã trục xuất (Ban) vĩnh viễn 48 tài khoản độc hại thành công.*\n\n` +
                `💯 *Hệ thống thông minh đã kiểm soát được tình hình. Báo cáo này chỉ gửi riêng cho Chủ tịch tối cao để nắm rõ tình hình bảo an máy chủ!*`
            )
            .addFields(
                { name: '🛡️ Tình trạng phòng thủ', value: '🟢 **AN TOÀN (100%)**', inline: true },
                { name: '⏳ Thời gian phản ứng', value: '`0.42 Giây`', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Hệ thống bảo an tối cao ĐÀN BÒ BIẾT BAY' });

        try {
            await message.author.send({ embeds: [fakeRaidEmbed] });
        } catch (e) {
            const tempMsg = await message.channel.send({ content: `⚠️ Sếp đang chặn DM! Hệ thống tự hủy thông báo này sau 10s.`, embeds: [fakeRaidEmbed] });
            setTimeout(() => tempMsg.delete().catch(() => {}), 10000);
        }
        return true;
    }
    return false;
}

module.exports = { handleAntiSpam, handleFakeRaidCommand };