const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ComponentType 
} = require('discord.js');
const { COLORS, author, footer, luxuryTitle } = require('../utils/embedTheme');

// Định nghĩa Slash Command /nuke
const commandData = new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('🚨 Dọn dẹp toàn bộ kênh server và tạo lại kênh mặc định (Chỉ Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

/**
 * Xử lý Slash Command /nuke với xác nhận 2 lớp (Button Confirmation)
 */
async function handleNukeSlash(interaction) {
    if (!interaction.inGuild()) {
        return interaction.reply({ 
            content: '❌ Lệnh này chỉ có thể sử dụng trong Server!', 
            ephemeral: true 
        });
    }

    // 1. Kiểm tra quyền của người gọi lệnh
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            content: '❌ Bạn phải có quyền **Administrator** mới được sử dụng lệnh này!',
            ephemeral: true
        });
    }

    const guild = interaction.guild;
    const botMember = guild.members.me;

    // 2. Kiểm tra quyền của Bot
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
            content: '❌ Bot không có quyền **Quản lý Kênh (Manage Channels)** để thực hiện thao tác này!',
            ephemeral: true
        });
    }

    // 3. Giao diện cảnh báo kèm 2 nút xác nhận (Chỉ người gõ lệnh mới nhìn thấy - Ephemeral)
    const warningEmbed = new EmbedBuilder()
        .setAuthor(author('DANGER ZONE'))
        .setTitle(luxuryTitle('⚠️', 'Dọn dẹp toàn bộ server'))
        .setDescription(
            `Bạn đang yêu cầu **xóa toàn bộ kênh** trong server **${guild.name}**.\n\n` +
            `• Mọi kênh văn bản, kênh thoại, danh mục sẽ bị **xóa vĩnh viễn**.\n` +
            `• Bot sẽ tự động tạo lại duy nhất một kênh mặc định: \`#chat-chung\`.\n` +
            `• **Hành động này KHÔNG THỂ HOÀN TÁC!**\n\n` +
            `*Vui lòng bấm xác nhận trong vòng 30 giây.*`
        )
        .setColor(COLORS.danger)
        .setFooter(footer('Đây là hành động không thể hoàn tác.'))
        .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('confirm_nuke_server')
            .setLabel('Xác nhận dọn dẹp')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('💣'),
        new ButtonBuilder()
            .setCustomId('cancel_nuke_server')
            .setLabel('Hủy bỏ an toàn')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🛡️')
    );

    const response = await interaction.reply({
        embeds: [warningEmbed],
        components: [actionRow],
        ephemeral: true,
        fetchReply: true
    });

    try {
        const confirmation = await response.awaitMessageComponent({
            componentType: ComponentType.Button,
            filter: (btnInteraction) => btnInteraction.user.id === interaction.user.id,
            time: 30000
        });

        if (confirmation.customId === 'confirm_nuke_server') {
            await confirmation.update({
                content: '🚨 **Đang tiến hành dọn dẹp và tái thiết server... Vui lòng chờ trong giây lát!**',
                embeds: [],
                components: []
            });

            // Tạo kênh mới trước để luôn có ít nhất 1 kênh trong server
            const newChannel = await guild.channels.create({
                name: 'chat-chung',
                type: ChannelType.GuildText,
                reason: `Server được dọn dẹp bởi ${interaction.user.tag}`
            });

            // Lấy danh sách kênh hiện tại
            const channels = await guild.channels.fetch();

            for (const [id, channel] of channels) {
                // Bỏ qua kênh vừa tạo và các kênh không thể xóa (kênh rules của Community, v.v.)
                if (channel && channel.id !== newChannel.id && channel.deletable) {
                    await channel.delete().catch(err => 
                        console.warn(`[Nuke] Không thể xóa kênh ${channel.name}: ${err.message}`)
                    );
                    // Nghỉ 250ms giữa các lần xóa để hạn chế dính Rate Limit của Discord
                    await new Promise(resolve => setTimeout(resolve, 250));
                }
            }

            await newChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('✅ SERVER ĐÃ ĐƯỢC LÀM MỚI THÀNH CÔNG')
                        .setDescription(
                            `Toàn bộ kênh cũ đã được dọn dẹp sạch sẽ.\n` +
                            `Thực hiện bởi: <@${interaction.user.id}>`
                        )
                        .setColor(0x57F287)
                        .setTimestamp()
                ]
            });

        } else if (confirmation.customId === 'cancel_nuke_server') {
            await confirmation.update({
                content: '🛡️ **Đã hủy bỏ thao tác xóa kênh an toàn. Server của bạn vẫn nguyên vẹn.**',
                embeds: [],
                components: []
            });
        }
    } catch (e) {
        // Hết hạn thời gian xác nhận 30s
        await interaction.editReply({
            content: '⏱️ **Đã hết thời gian chờ xác nhận (30 giây). Thao tác xóa kênh đã tự động hủy bỏ.**',
            embeds: [],
            components: []
        }).catch(() => null);
    }
}

/**
 * Hỗ trợ chuyển tiếp cho lệnh gõ chữ cũ (!delete all channel)
 */
async function handleDeleteAllChannels(message) {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Bạn phải có quyền **Administrator** mới được sử dụng lệnh này!');
    }

    return message.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle('🔒 LỆNH ĐÃ ĐƯỢC BẢO VỆ 2 LỚP')
                .setDescription(
                    `Lệnh văn bản thô \`!delete all channel\` đã được vô hiệu hóa để chống phá hoại ngoài ý muốn.\n\n` +
                    `👉 Vui lòng sử dụng Slash Command: **\`/nuke\`** trên thanh chat để mở bảng xác nhận bảo mật.`
                )
                .setColor(0xFEE75C)
        ]
    });
}

module.exports = { 
    commandData, 
    handleNukeSlash, 
    handleDeleteAllChannels 
};