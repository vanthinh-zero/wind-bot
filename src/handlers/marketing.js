const cron = require('node-cron');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

/**
 * ⏰ BỘ HẸN GIỜ TỰ ĐỘNG NHẮC NHỜ BUMP SERVER (CỨ 2 TIẾNG MỘT LẦN)
 */
function start25hReminder(client) {
    // Cú pháp cron: '0 0 */2 * * *' (Cứ cách đúng 2 tiếng đồng hồ sẽ kích hoạt)
    cron.schedule('0 0 */2 * * *', async () => {
        try {
            const channelId = process.env.K_QUANGCAO_ID; 
            if (!channelId) return console.error('⚠️ Thiếu cấu hình K_QUANGCAO_ID trong .env!');

            const channel = await client.channels.fetch(channelId);
            if (!channel) return;

            await sendBumpReminder(channel);
        } catch (error) {
            console.error('❌ Lỗi hệ thống hẹn giờ Disboard:', error);
        }
    });
}

/**
 * 📨 HÀM GỬI EMBED KÈM NÚT BẤM THẦN KỲ
 */
async function sendBumpReminder(channel) {
    const guildId = channel.guild.id;

    const bumpEmbed = new EmbedBuilder()
        .setTitle('🚀 [CHIẾN DỊCH ĐẨY TOP SERVER - DISBOARD]')
        .setThumbnail(channel.guild.iconURL({ dynamic: true }))
        .setColor('#ffaa00')
        .setDescription(
            `⚡ **Sếp ơi! Đến giờ hoàng đạo rồi!**\n\n` +
            `Đã qua 2 tiếng kể từ lần đẩy top trước. Sếp hoặc các bạn Staff hãy mau bấm vào nút **"Đẩy Top Ngay"** phía dưới để đưa phi thuyền **ĐÀN BÒ BIẾT BAY** lên trang chủ Disboard nhé!`
        )
        .addFields({ 
            name: '🛠️ Link cấu hình nhanh (Nếu Disboard báo lỗi link mời):', 
            value: `🔗 [Bấm vào đây để chỉnh sửa trên Web Disboard](https://disboard.org/server/${guildId})` 
        })
        .setTimestamp()
        .setFooter({ text: 'Hệ thống đẩy top tự động | Wind Bot' });

    // Tạo nút bấm thần kỳ
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_bump_disboard')
            .setLabel('🚀 Đẩy Top Ngay')
            .setStyle(ButtonStyle.Success)
    );

    const response = await channel.send({ 
        content: `📢 <@${process.env.ADMIN_ID}> **HẾT THỜI GIAN CHỜ! ĐẾN GIỜ ĐẨY TOP RỒI SẾP ƠI!**`, 
        embeds: [bumpEmbed],
        components: [row]
    });

    // Bộ lắng nghe sự kiện bấm nút (Bấm một phát là xử lý luôn)
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 7200000 // Hết hạn sau 2 tiếng (chờ đến lượt nhắc tiếp theo)
    });

    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'btn_bump_disboard') {
            // 🎯 ĐÃ SỬA: Phản hồi chuẩn cú pháp MessageFlags mới nhất năm 2026, sạch bóng Warning!
            await interaction.reply({
                content: `✨ **Sếp ơi, hãy copy dòng chữ dưới đây rồi dán và gửi vào kênh chat bất kỳ có bot DISBOARD nhé:**\n\n\`/bump\``,
                flags: [MessageFlags.Ephemeral] 
            });

            // Vô hiệu hóa nút bấm sau khi đã có người xử lý xong
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_bump_disboard')
                    .setLabel('✅ Đã Kích Hoạt')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
            await interaction.message.edit({ components: [disabledRow] });
            collector.stop();
        }
    });
}

/**
 * ⚡ LỆNH PHỤ: Sếp gõ !postfb để test hệ thống đẩy top tức thì
 */
async function handlePostToFacebook(message) {
    if (message.author.id !== process.env.ADMIN_ID) return false;

    if (message.content.trim() === '!postfb') {
        await message.delete().catch(() => {});
        await sendBumpReminder(message.channel);
        console.log('⚡ [Hệ Thống] Sếp vừa test thử nút bấm Disboard.');
        return true;
    }
    return false;
}

module.exports = { start25hReminder, handlePostToFacebook };