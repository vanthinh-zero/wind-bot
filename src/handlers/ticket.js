const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField, 
    MessageFlags,
    UserSelectMenuBuilder,
    OverwriteType
} = require('discord.js');
const { COLORS, author, footer } = require('../utils/embedTheme');

const CATEGORY_ID = process.env.CATEGORY_ID;
const ROLE_STAFF_ID = process.env.ROLE_STAFF;
const ROLE_CAN_THONG_BAO_ID = process.env.ROLE_CAN_THONG_BAO;

// Mảng Bitfield Flags CHUẨN cho người dùng trong ticket
const ALLOW_PERMISSIONS = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.UseExternalEmojis,
    PermissionsBitField.Flags.SendMessagesInThreads
];

// Mảng Bitfield Flags cấm @everyone
const DENY_PERMISSIONS = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages
];

// 1. Hàm gửi bảng Ticket (Spawnticket / Ticket Setup)
async function sendTicketSetup(channel) {
    const mainEmbed = new EmbedBuilder()
        .setAuthor(author('TRUNG TÂM HỖ TRỢ'))
        .setTitle('🎫 Cần một bàn tay hỗ trợ?')
        .setDescription(
            `Hãy chọn đúng nhóm vấn đề bên dưới để đội ngũ hỗ trợ tiếp nhận nhanh hơn.\n\n` +
            `🎁 **Giveaway / Donate**  •  📩 **Góp ý / Khiếu nại**\n` +
            `🤝 **Trao đổi riêng**  •  👥 **Vấn đề khác**\n\n` +
            `> Vui lòng mô tả rõ nhu cầu sau khi ticket được tạo. Điều đó giúp BQT hỗ trợ bạn nhanh và chính xác hơn.`
        )
        .setColor(COLORS.sky)
        .setThumbnail('https://media.discordapp.net/attachments/1508103127956455536/1508103322383552584/OIP.jfif?ex=6a5e262b&is=6a5cd4ab&hm=9bfa6bc905541831e4d2bd60986eaafd5f8e11e840bc45c2694d0053457f8616&=&format=webp')
        .setFooter(footer('Mỗi góp ý đều giúp cộng đồng tốt hơn'))
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_giveaway').setLabel('Tạo GiveAway/Donate').setEmoji('🎁').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_gopy').setLabel('Giải đáp, góp ý, khiếu nại').setEmoji('📩').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_chuyenrieng').setLabel('Giải quyết chuyện riêng').setEmoji('🤝').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_khac').setLabel('Vấn đề khác').setEmoji('👥').setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [mainEmbed], components: [row] });
}

// 2. Hàm xử lý tương tác Ticket
async function handleTicketInteraction(interaction) {
    const ticketButtonIds = ['ticket_giveaway', 'ticket_gopy', 'ticket_chuyenrieng', 'ticket_khac'];

    // --- A. TẠO CHANNEL TICKET ---
    if (interaction.isButton() && ticketButtonIds.includes(interaction.customId)) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        let prefix = 'ticket';
        
        // Khóa @everyone nhưng cấp phép đầy đủ (CÓ TÍCH XANH ✔️) cho người bấm tạo
        const permissions = [
            { 
                id: interaction.guild.roles.everyone, 
                deny: DENY_PERMISSIONS 
            },
            { 
                id: interaction.user.id, 
                allow: ALLOW_PERMISSIONS,
                type: OverwriteType.Member
            },
            { 
                id: interaction.guild.ownerId, 
                allow: ALLOW_PERMISSIONS,
                type: OverwriteType.Member
            }
        ];

        const hasStaffRole = ROLE_STAFF_ID && interaction.guild.roles.cache.has(ROLE_STAFF_ID);
        const hasCanThongBaoRole = ROLE_CAN_THONG_BAO_ID && interaction.guild.roles.cache.has(ROLE_CAN_THONG_BAO_ID);

        if (interaction.customId === 'ticket_giveaway') {
            prefix = 'giveaway';
            if (hasStaffRole) permissions.push({ id: ROLE_STAFF_ID, allow: ALLOW_PERMISSIONS, type: OverwriteType.Role });
        } else if (interaction.customId === 'ticket_gopy') {
            prefix = 'khieu-nai-gopy';
            if (hasCanThongBaoRole) permissions.push({ id: ROLE_CAN_THONG_BAO_ID, allow: ALLOW_PERMISSIONS, type: OverwriteType.Role });
        } else if (interaction.customId === 'ticket_chuyenrieng') {
            prefix = 'chuyen-rieng';
            if (hasStaffRole) permissions.push({ id: ROLE_STAFF_ID, allow: ALLOW_PERMISSIONS, type: OverwriteType.Role });
            if (hasCanThongBaoRole) permissions.push({ id: ROLE_CAN_THONG_BAO_ID, allow: ALLOW_PERMISSIONS, type: OverwriteType.Role });
        } else if (interaction.customId === 'ticket_khac') {
            prefix = 'support';
            if (hasStaffRole) permissions.push({ id: ROLE_STAFF_ID, allow: ALLOW_PERMISSIONS, type: OverwriteType.Role });
            if (hasCanThongBaoRole) permissions.push({ id: ROLE_CAN_THONG_BAO_ID, allow: ALLOW_PERMISSIONS, type: OverwriteType.Role });
        }

        const channelName = `${prefix}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
        const categoryChannel = CATEGORY_ID ? interaction.guild.channels.cache.get(CATEGORY_ID) : null;
        const validParentId = (categoryChannel && categoryChannel.type === ChannelType.GuildCategory) ? CATEGORY_ID : null;

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: validParentId,
            permissionOverwrites: permissions,
        }).catch(async (err) => {
            console.error('Lỗi khi tạo kênh ticket:', err);
            await interaction.editReply({ content: '❌ Tạo phòng thất bại! Vui lòng kiểm tra lại quyền của Bot.' }).catch(() => {});
        });

        if (!ticketChannel) return;

        const welcomeEmbed = new EmbedBuilder()
            .setAuthor(author('SUPPORT DESK'))
            .setTitle('✅ Ticket đã được mở')
            .setDescription(`Xin chào ${interaction.user}! Yêu cầu của bạn tại ${ticketChannel} đã được ghi nhận.\n\nHãy gửi nội dung cần hỗ trợ, ảnh chụp hoặc thông tin liên quan tại đây. Đội ngũ phụ trách sẽ phản hồi sớm nhất có thể.`)
            .addFields(
                { name: '📌 Người yêu cầu', value: `${interaction.user}`, inline: true },
                { name: '🛡️ Trạng thái', value: 'Đang chờ hỗ trợ', inline: true }
            )
            .setColor(COLORS.sky)
            .setFooter(footer('Vui lòng không spam nhiều ticket cho cùng một vấn đề.'))
            .setTimestamp();

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

    // --- B. NÚT "KÉO THÊM NGƯỜI" ---
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

    // --- C. XỬ LÝ KÉO NGƯỜI (KHI DÙNG .edit CHUYỂN BẬT XANH BẰNG OBJECT) ---
    if (interaction.isUserSelectMenu() && interaction.customId === 'select_user_to_add') {
        await interaction.deferUpdate().catch(() => {});

        const selectedUserIds = interaction.values;
        const addedUserMentions = [];

        for (const userId of selectedUserIds) {
            try {
                // permissionOverwrites.edit hỗ trợ dạng object Boolean { SendMessages: true }
                await interaction.channel.permissionOverwrites.edit(userId, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    EmbedLinks: true,
                    AttachFiles: true,
                    AddReactions: true,
                    UseExternalEmojis: true,
                    SendMessagesInThreads: true
                }, { type: OverwriteType.Member });

                addedUserMentions.push(`<@${userId}>`);
            } catch (err) {
                console.error(`Không thể cấp quyền cho User ${userId}:`, err.message);
            }
        }

        if (addedUserMentions.length > 0) {
            await interaction.channel.send({
                content: `✨ **${interaction.user}** đã kéo thêm thành viên: ${addedUserMentions.join(', ')} vào phòng hỗ trợ!`
            }).catch(() => {});
        }

        await interaction.editReply({
            content: `✅ Đã thêm thành công: ${addedUserMentions.join(', ')} vào ticket!`,
            components: []
        }).catch(() => {});
        return;
    }

    // --- D. ĐÓNG TICKET ---
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