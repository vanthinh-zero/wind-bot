const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLORS, author, footer } = require('../utils/embedTheme');

const SPAM_LIMIT = 5; 
const TIME_WINDOW = 3000; 
const TIME_MUTE = 10 * 60 * 1000; 
const usersMap = new Map();
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
                        .setAuthor(author('SAFETY SYSTEM'))
                        .setTitle('🛡️ Chế độ bảo vệ đã kích hoạt')
                        .setDescription(`Thành viên ${message.author} vừa bị cách ly **10 phút** vì hành vi cố tình làm loạn, spam phá hoại server.`)
                        .setColor(COLORS.danger)
                        .setFooter(footer('Anti-Spam • Bảo vệ nhịp sống cộng đồng'))
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

module.exports = { handleAntiSpam };