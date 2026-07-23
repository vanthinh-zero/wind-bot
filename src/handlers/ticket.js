const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField, 
    MessageFlags,
    UserSelectMenuBuilder
} = require('discord.js');

const CATEGORY_ID = process.env.CATEGORY_ID;
const ROLE_STAFF_ID = process.env.ROLE_STAFF;
const ROLE_CAN_THONG_BAO_ID = process.env.ROLE_CAN_THONG_BAO;

// Hàm gửi tin nhắn bảng Ticket ban đầu khi gõ !set ticket
async function sendTicketSetup(channel) {
    const mainEmbed = new EmbedBuilder()
        .setTitle('ʕ•ᴥ•ʔ ĐÀＮ ＢÒ ＢＩẾＴ ＢＡＹ ')
        .setDescription(
            `### __Tạo ticket khi thực sự cần thiết__\n\n` +
            `🎁 Bạn muốn **tạo GiveAway** hay **Donate**\n\n` +
            `📩 Bạn cần góp ý, khiếu nại các vấn đề trong server\n\n` +
            `🤝 Bạn cần **giải quyết chuyện riêng** (Cần kéo thêm người liên quan)\n\n` +
            `🧸 Bạn cần đánh giá tác phong làm việc của Lễ Tân\n\n` +
            `➔ Hãy tạo ticket để hội đồng quản trị hỗ trợ và nói rõ nhu cầu, mong muốn của bạn 💮\n\n` +
            `*chúng tôi rất mong những ý kiến và đóng góp của các bạn để phát triển một cộng đồng dễ thương, tích cực, lành mạnh*`
        )
        .setColor('#8CC0EB')
        .setThumbnail('https://media.discordapp.net/attachments/1508103127956455536/1508103322383552584/OIP.jfif?ex=6a5e262b&is=6a5cd4ab&hm=9bfa6bc905541831e4d2bd60986eaafd5f8e11e840bc45c2694d0053457f8616&=&format=webp')
        .setFooter({ text: 'Cảm ơn vì đã là một phần của gia đình nhỏ này' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_giveaway').setLabel('Tạo GiveAway/Donate').setEmoji('🎁').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_gopy').setLabel('Giải đáp, góp ý, khiếu nại').setEmoji('📩').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_chuyenrieng').setLabel('Giải quyết chuyện riêng').setEmoji('🤝').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_khac').setLabel('Vấn đề khác').setEmoji('👥').setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [mainEmbed], components: [row] });
}

// Hàm xử lý tương tác Ticket
async function handleTicketInteraction(interaction) {
    const ticketButtonIds = ['ticket_giveaway', 'ticket_gopy', 'ticket_chuyenrieng', 'ticket_khac'];

    // 1. TẠO CHANNEL TICKET
    if (interaction.isButton() && ticketButtonIds.includes(interaction.customId)) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        let prefix = 'ticket';
        const permissions = [
            { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks] },
            { id: interaction.guild.ownerId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ];

        // Kiểm tra an toàn xem Role ID có thực sự tồn tại trong server không
        const hasStaffRole = ROLE_STAFF_ID && interaction.guild.roles.cache.has(ROLE_STAFF_ID);
        const hasCanThongBaoRole = ROLE_CAN_THONG_BAO_ID && interaction.guild.roles.cache.has(ROLE_CAN_THONG_BAO_ID);

        // Phân quyền chi tiết theo từng nút
        if (interaction.customId === 'ticket_giveaway') {
            prefix = 'giveaway';
            if (hasStaffRole) permissions.push({ id: ROLE_STAFF_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        } 
        else if (interaction.customId === 'ticket_gopy') {
            prefix = 'khieu-nai-gopy';
            if (hasCanThongBaoRole) permissions.push({ id: ROLE_CAN_THONG_BAO_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        } 
        else if (interaction.customId === 'ticket_chuyenrieng') {
            prefix = 'chuyen-rieng';
            if (hasStaffRole) permissions.push({ id: ROLE_STAFF_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
            if (hasCanThongBaoRole) permissions.push({ id: ROLE_CAN_THONG_BAO_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        } 
        else if (interaction.customId === 'ticket_khac') {
            prefix = 'support';
            if (hasStaffRole) permissions.push({ id: ROLE_STAFF_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
            if (hasCanThongBaoRole) permissions.push({ id: ROLE_CAN_THONG_BAO_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        }

        const channelName = `${prefix}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
        
        // Kiểm tra Category có thực sự tồn tại không (Phòng trường hợp ID hỏng/bị xóa)
        const categoryChannel = CATEGORY_ID ? interaction.guild.channels.cache.get(CATEGORY_ID) : null;
        const validParentId = (categoryChannel && categoryChannel.type === ChannelType.GuildCategory) ? CATEGORY_ID : null;

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: validParentId,
            permissionOverwrites: permissions,
        }).catch(async (err) => {
            console.error('Lỗi khi tạo kênh ticket:', err);
            await interaction.editReply({ content: '❌ Tạo phòng thất bại! Vui lòng kiểm tra lại quyền tạo kênh của Bot.' }).catch(() => {});
        });

        if (!ticketChannel) return;

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('Chào đạo hữu!')
            .setDescription(`Yêu cầu hỗ trợ của bạn tại kênh ${ticketChannel} đã được ghi nhận.\n\nVui lòng nêu rõ mong muốn để BQT hỗ trợ sớm nhất.`)
            .setColor('#8CC0EB');

        const actionRow = new ActionRowBuilder();

        if (interaction.customId === 'ticket_chuyenrieng') {
            actionRow.addComponents(
                new ButtonBuilder().setCustomId('add_user_ticket').setLabel('➕ Kéo thêm người').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Đóng Ticket').setStyle(ButtonStyle.Danger)
            );
        } else {
            actionRow.addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Đóng Ticket').setStyle(ButtonStyle.Danger)
            );
        }

        await ticketChannel.send({ 
            content: `${interaction.user} Đã tạo thành công phòng hỗ trợ!`, 
            embeds: [welcomeEmbed], 
            components: [actionRow] 
        });

        await interaction.editReply({ content: `Đã chuẩn bị phòng hỗ trợ tại: ${ticketChannel}` });
        return;
    }

    // 2. NÚT "KÉO THÊM NGƯỜI"
    if (interaction.isButton() && interaction.customId === 'add_user_ticket') {
        const userSelectMenu = new UserSelectMenuBuilder()
            .setCustomId('select_user_to_add')
            .setPlaceholder('Chọn (những) thành viên bạn muốn kéo vào ticket...')
            .setMinValues(1)
            .setMaxValues(5);

        const row = new ActionRowBuilder().addComponents(userSelectMenu);

        await interaction.reply({
            content: '📌 **Chọn thành viên bạn muốn thêm vào kênh ticket này:**',
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });
        return;
    }

    // 3. XỬ LÝ MENU CHỌN THÀNH VIÊN
    if (interaction.isUserSelectMenu() && interaction.customId === 'select_user_to_add') {
        await interaction.deferUpdate();

        const selectedUsers = interaction.users;
        const addedUserMentions = [];

        for (const [userId] of selectedUsers) {
            await interaction.channel.permissionOverwrites.edit(userId, {
                ViewChannel: true,
                SendMessages: true,
                EmbedLinks: true
            }).catch((err) => console.error('Lỗi khi thêm quyền cho user:', err.message));

            addedUserMentions.push(`<@${userId}>`);
        }

        await interaction.channel.send({
            content: `✨ **${interaction.user}** đã kéo thêm thành viên: ${addedUserMentions.join(', ')} vào phòng hỗ trợ!`
        });

        await interaction.editReply({
            content: `✅ Đã thêm thành công: ${addedUserMentions.join(', ')} vào ticket!`,
            components: []
        });
        return;
    }

    // 4. XỬ LÝ ĐÓNG TICKET
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply('Hệ thống sẽ dọn dẹp và xóa kênh này sau 5 giây...').catch(() => {});
        
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