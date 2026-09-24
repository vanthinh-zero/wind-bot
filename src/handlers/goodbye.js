const { EmbedBuilder } = require('discord.js');
const { envOrSetting } = require('../utils/config');
const { getGuildChannel } = require('../utils/db');
const { COLORS, author, footer } = require('../utils/embedTheme');

async function handleGoodbyeMember(member) {
    const channelId = await getGuildChannel(member.guild.id, 'goodbye')
        || envOrSetting('GOODBYE_CHANNEL_ID', 'channels.goodbye');
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId)
        || await member.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
        console.warn(`⚠️ Không tìm thấy kênh tạm biệt với ID đã cấu hình: ${channelId}`);
        return;
    }

    const guildIcon = member.guild.iconURL({ dynamic: true });
    const joinedAt = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
    const embed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setAuthor(author('NHẬT KÝ CỘNG ĐỒNG', guildIcon))
        .setTitle('👋 Hẹn gặp lại bạn!')
        .setDescription(`**${member.user.tag}** đã rời khỏi **${member.guild.name}**.\n\nCảm ơn bạn vì khoảng thời gian đã đồng hành cùng cộng đồng. Chúc bạn luôn bình an trên hành trình phía trước. 🍂`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '🏷️ Thành viên', value: `${member.user.tag}`, inline: true },
            { name: '👥 Thành viên còn lại', value: `**${member.guild.memberCount}**`, inline: true },
            { name: '🕰️ Đã đồng hành từ', value: joinedAt ? `<t:${joinedAt}:D>` : 'Không rõ', inline: true }
        )
        .setFooter(footer('Mỗi người từng ghé qua đều là một phần của cộng đồng.', guildIcon))
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Lỗi khi gửi tin nhắn tạm biệt:', error);
    }
}

module.exports = { handleGoodbyeMember };