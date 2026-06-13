// src/handlers/voiceMenu.js
const { PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { activeVoiceChannels } = require('./voice.js');

/**
 * Xử lý khi người dùng bấm nút trên Menu Voice
 */
async function handleVoiceMenuInteraction(interaction) {
    const { customId, member, guild } = interaction;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel || !activeVoiceChannels.has(voiceChannel.id)) {
        return interaction.reply({ content: '❌ Bạn phải đang ở trong phòng voice của mình để dùng menu này!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }

    const ownerId = activeVoiceChannels.get(voiceChannel.id);
    if (member.id !== ownerId) {
        return interaction.reply({ content: '❌ Bạn không phải là chủ của phòng voice này!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }

    try {
        switch (customId) {
            case 'vm_lock':
                await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: false });
                await interaction.reply({ content: '🔒 Phòng của bạn đã được **Khóa**! Thành viên khác sẽ không thể chủ động tham gia phòng.', flags: [MessageFlags.Ephemeral] });
                break;

            case 'vm_unlock':
                await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: true });
                await interaction.reply({ content: '🔓 Phòng của bạn đã được **Mở Khóa**! Mọi người có thể tự do vào phòng.', flags: [MessageFlags.Ephemeral] });
                break;

            case 'vm_ghost': {
                const isHidden = voiceChannel.permissionOverwrites.cache.get(guild.roles.everyone.id)?.deny.has(PermissionFlagsBits.ViewChannel);
                await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: isHidden ? true : false });
                await interaction.reply({ content: isHidden ? '👁️ Phòng đã **Hiện** trở lại trên danh sách kênh.' : '👻 Phòng đã **Ẩn** (Chỉ những ai trong phòng mới thấy).', flags: [MessageFlags.Ephemeral] });
                break;
            }

            case 'vm_rename': {
                const modal = new ModalBuilder().setCustomId('vmm_rename_modal').setTitle('📝 Đổi Tên Phòng Thoại');
                const nameInput = new TextInputBuilder()
                    .setCustomId('new_name')
                    .setLabel('Nhập tên phòng mới muốn đổi:')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ví dụ: 🎮 Gaming Room...')
                    .setRequired(true)
                    .setMaxLength(30);

                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                await interaction.showModal(modal);
                break;
            }

            case 'vm_limit': {
                const modal = new ModalBuilder().setCustomId('vmm_limit_modal').setTitle('👥 Giới Hạn Người Vào');
                const limitInput = new TextInputBuilder()
                    .setCustomId('new_limit')
                    .setLabel('Nhập số người (0-99, với 0 = Vô hạn):')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ví dụ: 5')
                    .setRequired(true)
                    .setMaxLength(2);

                modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                await interaction.showModal(modal);
                break;
            }
        }
    } catch (error) {
        console.error('❌ Lỗi xử lý nút bấm Menu Voice:', error.message);
        // Phòng hờ lỗi Discord tự hủy tương tác khi xử lý chậm
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Có lỗi xảy ra trong quá trình cài đặt phòng, vui lòng thử lại!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }
    }
}

/**
 * Xử lý khi người dùng điền xong bảng Modal và bấm "Submit"
 */
async function handleVoiceModalSubmit(interaction) {
    const { customId, member } = interaction;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel || !activeVoiceChannels.has(voiceChannel.id)) {
        return interaction.reply({ content: '❌ Bạn đã rời phòng hoặc phòng không hợp lệ!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }

    try {
        if (customId === 'vmm_rename_modal') {
            const newName = interaction.fields.getTextInputValue('new_name');
            
            // Thông báo ngay cho người dùng để đóng Modal trên màn hình
            await interaction.reply({ content: `📝 Đang tiến hành đổi tên phòng thành: **${newName}**...`, flags: [MessageFlags.Ephemeral] });
            
            try {
                await voiceChannel.setName(newName);
            } catch (err) {
                console.error('❌ Giới hạn đổi tên từ Discord:', err.message);
                // Dùng followUp an toàn vì đã reply trước đó
                await interaction.followUp({ 
                    content: '⚠️ **Hạn chế từ Discord:** Bạn chỉ có thể đổi tên phòng tối đa 2 lần trong vòng 10 phút. Tên phòng sẽ tự thay đổi khi hết thời gian chờ từ hệ thống!', 
                    flags: [MessageFlags.Ephemeral] 
                }).catch(() => {});
            }
        } 
        
        else if (customId === 'vmm_limit_modal') {
            const limitRaw = interaction.fields.getTextInputValue('new_limit');
            const limit = parseInt(limitRaw);

            if (isNaN(limit) || limit < 0 || limit > 99) {
                return interaction.reply({ content: '❌ Vui lòng chỉ nhập số nguyên từ 0 đến 99!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
            }

            await interaction.reply({ 
                content: limit === 0 ? '👥 Đang tiến hành gỡ bỏ giới hạn phòng thoại...' : `👥 Đang tiến hành đặt giới hạn phòng thành: **${limit} người**...`, 
                flags: [MessageFlags.Ephemeral] 
            });

            try {
                await voiceChannel.setUserLimit(limit);
            } catch (err) {
                console.error('❌ Lỗi đặt giới hạn người:', err.message);
                await interaction.followUp({ content: '⚠️ Không thể thay đổi giới hạn số người lúc này. Vui lòng thử lại sau!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
            }
        }
    } catch (error) {
        console.error('❌ Lỗi hệ thống Modal Voice:', error.message);
    }
}

module.exports = { handleVoiceMenuInteraction, handleVoiceModalSubmit };