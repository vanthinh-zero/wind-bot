const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    EmbedBuilder 
} = require('discord.js');
const { setGuildChannel, getGuildConfig } = require('../utils/db');

const CHANNEL_TYPE_NAMES = {
    tutien: '☯️ Hệ Thống Tu Tiên',
    taixiu: '🎲 Khu Vực Tài Xỉu / Game',
    welcome: '👋 Kênh Chào Mừng Thành Viên',
    goodbye: '🚪 Kênh Tạm Biệt Thành Viên',
    logs: '📜 Kênh Nhật Ký Hệ Thống'
};

const commandData = new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('⚙️ Cấu hình kênh chức năng cho Server (Chỉ Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
        option.setName('type')
            .setDescription('Chọn chức năng muốn gán kênh')
            .setRequired(true)
            .addChoices(
                { name: '☯️ Tu Tiên', value: 'tutien' },
                { name: '🎲 Tài Xỉu / Game', value: 'taixiu' },
                { name: '👋 Chào Mừng (Welcome)', value: 'welcome' },
                { name: '🚪 Tạm Biệt (Goodbye)', value: 'goodbye' },
                { name: '📜 Nhật Ký / Logs', value: 'logs' }
            )
    )
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('Chọn kênh văn bản tương ứng')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
    );

/**
 * Xử lý Slash Command /setchannel
 */
async function handleSetChannelSlash(interaction) {
    if (!interaction.inGuild()) {
        return interaction.reply({ content: '❌ Lệnh này chỉ có thể sử dụng trong Server!', ephemeral: true });
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            content: '❌ Bạn phải có quyền **Administrator** mới được cấu hình kênh server!',
            ephemeral: true
        });
    }

    const type = interaction.options.getString('type');
    const targetChannel = interaction.options.getChannel('channel');
    const typeLabel = CHANNEL_TYPE_NAMES[type] || type;

    try {
        await setGuildChannel(interaction.guild.id, type, targetChannel.id);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ CẤU HÌNH KÊNH THÀNH CÔNG')
            .setDescription(
                `Đã thiết lập kênh chức năng cho server **${interaction.guild.name}**:\n\n` +
                `📌 **Chức năng:** ${typeLabel}\n` +
                `📍 **Kênh chỉ định:** <#${targetChannel.id}> (\`${targetChannel.name}\`)\n\n` +
                `*Từ bây giờ, bot sẽ tự động áp dụng cấu hình này riêng cho server của bạn!*`
            )
            .setColor(0x57F287)
            .setTimestamp()
            .setFooter({ text: `Cấu hình bởi ${interaction.user.tag}` });

        return await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Lỗi khi cấu hình kênh trong setchannel.js:', error);
        return await interaction.reply({
            content: '❌ Có lỗi xảy ra khi lưu cấu hình vào cơ sở dữ liệu!',
            ephemeral: true
        });
    }
}

module.exports = {
    commandData,
    handleSetChannelSlash
};

