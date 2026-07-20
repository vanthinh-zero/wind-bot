const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// Danh sách ID các bot nhạc trong máy chủ (Bao gồm Rythm 2, Rythm 9, Classical Radio, v.v.)
const MUSIC_BOT_IDS = [
    '412347553141751808', 
    '411916947773587456', 
    '235088799074484224',
    '252128902418268161',
    '836330845538877461'
];

async function handleMusicCheckCommand(message) {
    const msgContent = message.content.trim().toLowerCase();
    
    // Hỗ trợ các kiểu gõ lệnh
    if (msgContent !== '!music' && msgContent !== '!musicbot' && msgContent !== '!music bot') {
        return false;
    }

    const guild = message.guild;
    const components = [];
    let currentRow = new ActionRowBuilder();
    let count = 0;
    let descriptionText = "📊 **BẢNG TRẠNG THÁI BOT NHẠC HỆ THỐNG**\n\n";

    try {
        // Tải toàn bộ thành viên trong Guild về Cache để tránh bỏ sót
        const members = await guild.members.fetch();

        // Lọc lấy danh sách các Bot có trong Guild (Nếu ID khớp hoặc là Bot)
        const musicBots = members.filter(m => m.user.bot && (MUSIC_BOT_IDS.includes(m.id) || m.displayName.toLowerCase().includes('rythm') || m.displayName.toLowerCase().includes('radio')));

        if (musicBots.size === 0) {
            descriptionText += "⚠️ *Không tìm thấy bot nhạc nào đang online trong máy chủ!*";
        } else {
            musicBots.forEach((botMember) => {
                // Kiểm tra xem bot có đang ở trong kênh Voice nào không
                const isBusy = Boolean(botMember.voice && botMember.voice.channelId);
                const botName = botMember.displayName || botMember.user.username;

                // Nút xanh (Có thể sử dụng) hoặc Nút đỏ (Đang bận/Không tiện)
                const button = new ButtonBuilder()
                    .setCustomId(`music_bot_status_${botMember.id}`)
                    .setLabel(`${botName.slice(0, 15)} (${isBusy ? 'Đang bận' : 'Sẵn sàng'})`)
                    .setStyle(isBusy ? ButtonStyle.Danger : ButtonStyle.Success)
                    .setDisabled(true);

                currentRow.addComponents(button);
                count++;

                descriptionText += `${isBusy ? '🔴' : '🟢'} **${botName}**: ${isBusy ? `Đang dùng tại <#${botMember.voice.channelId}>` : 'Trống (Có thể sử dụng)'}\n`;

                if (count % 5 === 0) {
                    components.push(currentRow);
                    currentRow = new ActionRowBuilder();
                }
            });

            if (currentRow.components.length > 0) {
                components.push(currentRow);
            }
        }
    } catch (err) {
        console.error("Lỗi khi quét bot nhạc:", err);
        descriptionText += "❌ *Không thể tải danh sách thành viên. Vui lòng kiểm tra Bật Intent trong Discord Developer Portal!*";
    }

    const embed = new EmbedBuilder()
        .setTitle('🎵 BÁO CÁO TRẠNG THÁI BOT NHẠC')
        .setDescription(descriptionText)
        .setColor(components.some(row => row.components.some(btn => btn.data.style === ButtonStyle.Success)) ? '#00FF00' : '#FF0000')
        .setTimestamp()
        .setFooter({ text: 'Quản gia Wind - Kiểm tra tự động', iconURL: guild.iconURL() });

    await message.reply({ embeds: [embed], components });
    return true;
}

module.exports = { handleMusicCheckCommand };