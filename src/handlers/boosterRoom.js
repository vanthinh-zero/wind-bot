const { 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ChannelType, 
    PermissionsBitField, 
    MessageFlags 
} = require('discord.js');
require('dotenv').config();

// HÀM 1: Hiện Form (Modal) khi Booster bấm nút tạo phòng
async function triggerVoiceModal(interaction) {
    if (!interaction.member.premiumSince) {
        return await interaction.reply({
            content: `❌ **Lỗi bảo mật:** Tính năng này dành riêng cho **Server Booster**. Bạn không thể sử dụng!`,
            flags: [MessageFlags.Ephemeral] 
        });
    }

    const modal = new ModalBuilder()
        .setCustomId('boost_voice_modal_submit')
        .setTitle('Tạo Phòng Voice VIP Đặc Quyền');

    const roomNameInput = new TextInputBuilder()
        .setCustomId('voice_room_name_input')
        .setLabel("Nhập tên phòng của bạn:")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Ví dụ: Động Bay Lắc 🚀")
        .setMinLength(2)
        .setMaxLength(25)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(roomNameInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// HÀM 2: Xử lý khi họ bấm "Submit" Form điền tên phòng
async function handleVoiceModalSubmit(interaction) {
    const roomName = interaction.fields.getTextInputValue('voice_room_name_input');
    const vipCategoryId = process.env.BOOSTER_CATEGORY_ID;

    const vipCategory = interaction.guild.channels.cache.get(vipCategoryId);
    if (!vipCategory || vipCategory.type !== ChannelType.GuildCategory) {
        return await interaction.reply({ 
            content: '❌ Hệ thống chưa thiết lập Danh mục phòng VIP (BOOSTER_CATEGORY_ID). Vui lòng báo Admin!', 
            flags: [MessageFlags.Ephemeral] 
        });
    }

    try {
        const vipVoiceChannel = await interaction.guild.channels.create({
            name: `💎｜${roomName}`,
            type: ChannelType.GuildVoice,
            parent: vipCategoryId,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.Connect], // Khóa phòng với người thường
                },
                {
                    id: interaction.user.id, // Full quyền quản lý cho chủ phòng
                    allow: [
                        PermissionsBitField.Flags.Connect,
                        PermissionsBitField.Flags.Speak,
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.MoveMembers,
                        PermissionsBitField.Flags.MuteMembers
                    ],
                },
            ],
        });

        await interaction.reply({
            content: `✅ **Thành công!** Phòng Voice VIP đã được tạo tại danh mục **${vipCategory.name}**.\n👉 Vào phòng: <#${vipVoiceChannel.id}>`,
            flags: [MessageFlags.Ephemeral]
        });

    } catch (error) {
        console.error('Lỗi khi khởi tạo phòng Voice VIP:', error);
        await interaction.reply({ content: '❌ Gặp lỗi trong quá trình khởi tạo phòng Voice VIP!', flags: [MessageFlags.Ephemeral] });
    }
}

// HÀM 3: Kiểm tra và Tự động xóa phòng VIP khi trống (Gắn vào voiceStateUpdate)
async function checkAndCleanVipRoom(oldState, newState) {
    if (oldState.channelId) {
        const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);
        
        // Chỉ xóa nếu phòng thuộc danh mục VIP và không còn ai chui trong đó
        if (oldChannel && oldChannel.parentId === process.env.BOOSTER_CATEGORY_ID) {
            if (oldChannel.members.size === 0) {
                try {
                    await oldChannel.delete('Phòng VIP trống - Tự động dọn dẹp.');
                    console.log(`🧹 Đã dọn dẹp phòng VIP trống: ${oldChannel.name}`);
                } catch (err) {
                    console.error('Không thể tự động xóa phòng VIP trống:', err);
                }
            }
        }
    }
}

module.exports = { triggerVoiceModal, handleVoiceModalSubmit, checkAndCleanVipRoom };