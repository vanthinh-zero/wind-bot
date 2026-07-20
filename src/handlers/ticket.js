const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, MessageFlags } = require('discord.js');
const CATEGORY_ID = process.env.CATEGORY_ID;

// Hàm gửi tin nhắn bảng Ticket ban đầu khi gõ !set ticket
async function sendTicketSetup(channel) {
    const mainEmbed = new EmbedBuilder()
        .setTitle(' ʕ•ᴥ•ʔ ĐÀＮ ＢÒ ＢＩẾＴ ＢＡＹ')
        .setDescription(
            `### __Tạo ticket khi thực sự cần thiết__\n\n` +
            `🎁 Bạn muốn **tạo GiveAway** hay **Donate**\n\n` +
            `📩 Bạn cần góp ý, khiếu nại các vấn đề trong server\n\n` +
            `🧸 Bạn cần đánh giá tác phong làm việc của Lễ Tân\n\n` +
            `➔ Hãy tạo ticket để hội đồng quản trị hỗ trợ và nói rõ nhu cầu, mong muốn của bạn 💮\n\n` +
            `*chúng tôi rất mong những ý kiến và đóng góp của các bạn để phát triển một cộng đồng dễ thương, tích cực, lành mạnh*`
        )
        .setColor('#8CC0EB') // 🟢 Đã đổi màu viền dọc của Embed sang màu 8CC0EB
        .setThumbnail('https://media.discordapp.net/attachments/1508103127956455536/1508103322383552584/OIP.jfif?ex=6a5e262b&is=6a5cd4ab&hm=9bfa6bc905541831e4d2bd60986eaafd5f8e11e840bc45c2694d0053457f8616&=&format=webp')
        .setFooter({ text: 'Cảm ơn vì đã là một phần của gia đình nhỏ này' });

    // 🟢 Đã đổi Style toàn bộ nút bấm thành Primary (Màu xanh lam đồng bộ với viền)
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_giveaway').setLabel('Tạo GiveAway/Donate').setEmoji('🎁').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_gopy').setLabel('Giải đáp, góp ý, khiếu nại').setEmoji('📩').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_khac').setLabel('Vấn đề khác').setEmoji('👥').setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [mainEmbed], components: [row] });
}

// Hàm xử lý khi thành viên tương tác nhấn nút
async function handleTicketInteraction(interaction) {
    const ticketButtonIds = ['ticket_giveaway', 'ticket_gopy', 'ticket_khac'];

    if (ticketButtonIds.includes(interaction.customId)) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        let prefix = 'ticket';
        if (interaction.customId === 'ticket_giveaway') prefix = 'giveaway';
        if (interaction.customId === 'ticket_gopy') prefix = 'khieu-nai-gopy';
        if (interaction.customId === 'ticket_khac') prefix = 'support';

        const channelName = `${prefix}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
        
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID || null,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks] },
                { id: interaction.guild.ownerId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ],
        }).catch(async (err) => {
            console.error(err);
            await interaction.editReply({ content: '❌ Thất bại! Vui lòng kiểm tra lại quyền.' });
        });

        if (!ticketChannel) return;

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('Chào bạn yêu !')
            .setDescription(`Yêu cầu hỗ trợ của bạn tại kênh ${ticketChannel} đã được ghi nhận.\n\nVui lòng nêu rõ mong muốn để Ban Quản Trị / Lễ Tân hỗ trợ sớm nhất.\n\nBấm nút phía dưới để đóng ticket.`)
            .setColor('#8CC0EB'); // 🟢 Kênh chat ẩn được tạo ra cũng sẽ thừa hưởng viền xanh luôn

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Đóng Ticket').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `${interaction.user} Đã tạo thành công phòng hỗ trợ!`, embeds: [welcomeEmbed], components: [closeRow] });
        await interaction.editReply({ content: `Đã chuẩn bị phòng hỗ trợ tại: ${ticketChannel}` });
        return;
    }

    if (interaction.customId === 'close_ticket') {
        await interaction.reply('Hệ thống sẽ dọn dẹp và xóa kênh này sau 5 giây...');
        
        const channelToDelete = interaction.channel;
        
        setTimeout(async () => {
            if (channelToDelete && typeof channelToDelete.delete === 'function') {
                await channelToDelete.delete().catch((err) => {
                    console.error('Không thể xóa kênh ticket:', err.message);
                });
            }
        }, 5000);
    }
}

module.exports = { handleTicketInteraction, sendTicketSetup };