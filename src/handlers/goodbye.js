const { EmbedBuilder } = require('discord.js');

async function handleGoodbyeMember(member) {
    const channelId = process.env.GOODBYE_CHANNEL_ID;
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) {
        console.log('❌ Không tìm thấy kênh tạm biệt với ID đã cấu hình!');
        return;
    }

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('👋 Tạm biệt thành viên!')
        .setDescription(`**${member.user.tag}** (${member.user}) đã rời khỏi máy chủ.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: `Hiện máy chủ còn ${member.guild.memberCount} thành viên.` })
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Lỗi khi gửi tin nhắn tạm biệt:', error);
    }
}

module.exports = { handleGoodbyeMember };