const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, MessageFlags } = require('discord.js');
const CATEGORY_ID = process.env.CATEGORY_ID;

async function handleTicketInteraction(interaction) {
    if (interaction.customId === 'create_ticket') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const channelName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
        
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
            .setTitle('Chào đạo hữu!')
            .setDescription(`Yêu cầu hỗ trợ của bạn tại kênh ${ticketChannel} đã được ghi nhận.\n\nBấm nút phía dưới để đóng ticket.`)
            .setColor(0x00FF00);

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Đóng Ticket').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `${interaction.user} Đã tạo thành công phòng hỗ trợ!`, embeds: [welcomeEmbed], components: [closeRow] });
        await interaction.editReply({ content: `Đã chuẩn bị phòng hỗ trợ tại: ${ticketChannel}` });
    }

    if (interaction.customId === 'close_ticket') {
        await interaction.reply('Hệ thống sẽ dọn dẹp và xóa kênh này sau 5 giây...');
        setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
    }
}

module.exports = { handleTicketInteraction };