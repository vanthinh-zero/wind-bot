const cron = require('node-cron');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

function start25hReminder(client) {
    cron.schedule('0 0 */2 * * *', async () => {
        try {
            const channelId = process.env.K_QUANGCAO_ID; 
            if (!channelId) return console.error('⚠️ Thiếu cấu hình K_QUANGCAO_ID trong .env!');
            const channel = await client.channels.fetch(channelId);
            if (!channel) return;
            await sendBumpReminder(channel);
        } catch (error) {
            console.error('❌ Lỗi hệ thống hẹn giờ Marketing:', error);
        }
    });
}

async function sendBumpReminder(channel) {
    const guildId = channel.guild.id;

    const bumpEmbed = new EmbedBuilder()
        .setTitle('🔥 [CHIẾN DỊCH TĂNG TỐC KÉO MEM TỔNG LỰC]')
        .setThumbnail(channel.guild.iconURL({ dynamic: true }))
        .setColor('#ff0055')
        .setDescription(
            `🚀 **Sếp ơi! Chiến dịch đẩy nhanh tiến độ phát triển ĐÀN BÒ BIẾT BAY kích hoạt!**\n\n` +
            `👉 **Bước 1:** Bấm nút xanh để lấy lệnh nhanh đẩy **Disboard**.\n` +
            `👉 **Bước 2:** Bấm các nút liên kết để thực hiện Bump siêu tốc trên hệ thống web vệ tinh!`
        )
        .setTimestamp()
        .setFooter({ text: 'Hệ thống tăng tốc truyền thông | Wind Bot' });

    // Hàng nút 1: Các mũi tấn công chính
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_bump_disboard')
            .setLabel('🚀 Lấy lệnh Disboard')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setLabel('⭐ Top.gg')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://top.gg/servers/${guildId}`)
    );

    // Hàng nút 2: Hệ thống web vệ tinh duyệt nhanh và chất lượng nhất (Đã xóa DiscordStreet)
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('🌐 Discord.me')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.me/`),
        new ButtonBuilder()
            .setLabel('🧭 Discords.com')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discords.com/`),
        new ButtonBuilder()
            .setLabel('🎯 Discord Servers')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discordservers.com/`)
    );

    const response = await channel.send({ 
        content: `📢 <@${process.env.ADMIN_ID}> **ĐẾN GIỜ ĐẨY TIẾN ĐỘ SERVER RỒI SẾP ƠI!**`, 
        embeds: [bumpEmbed],
        components: [row1, row2]
    });

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 7200000 
    });

    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'btn_bump_disboard') {
            await interaction.reply({
                content: `✨ **Sếp copy dòng này dán gửi để bump Disboard nhé:**\n\n\`/bump\``,
                flags: [MessageFlags.Ephemeral] 
            });

            const disabledRow1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_bump_disboard')
                    .setLabel('✅ Đã Xử Lý Disboard')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setLabel('⭐ Top.gg')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://top.gg/servers/${guildId}`)
            );
            await interaction.message.edit({ components: [disabledRow1, row2] });
            collector.stop();
        }
    });
}

async function handlePostToFacebook(message) {
    if (message.author.id !== process.env.ADMIN_ID) return false;
    if (message.content.trim() === '!postfb') {
        await message.delete().catch(() => {});
        await sendBumpReminder(message.channel);
        return true;
    }
    return false;
}

module.exports = { start25hReminder, handlePostToFacebook };