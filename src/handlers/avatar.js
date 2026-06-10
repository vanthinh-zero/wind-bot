// src/handlers/avatar.js
const { EmbedBuilder } = require('discord.js');

async function handleAvatarCheck(message) {
    const content = message.content.trim().toLowerCase();
    
    // Đón nhận lệnh !avatar hoặc !avt (chấp nhận cả việc tag người khác hoặc tự xem của mình)
    if (!content.startsWith('!avatar') && !content.startsWith('!avt')) return false;

    const channelId = process.env.KENH_CHECK_AVATAR;
    
    // Khóa kênh: Nếu gõ sai kênh quy định, nhắc nhở thành viên chuyển kênh
    if (channelId && message.channel.id !== channelId) {
        return message.reply(`❌ Đạo hữu vui lòng di chuyển qua kênh <#${channelId}> để check avatar nhé!`).catch(() => {});
    }

    // Xác định mục tiêu: Người được tag, hoặc nếu không tag ai thì là chính người gõ lệnh
    const targetMember = message.mentions.members.first() || message.member;
    const targetUser = targetMember.user;

    // Lấy link Server Avatar (Avatar riêng trong server này nếu có)
    // Nếu không có Server Avatar, hệ thống tự động trả về Avatar gốc của tài khoản
    const avatarURL = targetMember.displayAvatarURL({ dynamic: true, size: 1024 });

    // Tạo khung hiển thị Embed giống y hệt như cấu trúc ảnh mẫu image_e1c7fb.png
    const embed = new EmbedBuilder()
        .setColor('#2b2d31') // Màu nền xám trầm tối giản, chuẩn giao diện Discord
        .setAuthor({ 
            name: targetUser.tag, 
            iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
        })
        .setTitle('Server Avatar')
        .setImage(avatarURL)
        .setFooter({ text: `Yêu cầu bởi ${message.author.username}` })
        .setTimestamp();

    await message.reply({ embeds: [embed] }).catch(() => {});
    return true;
}

module.exports = { handleAvatarCheck };