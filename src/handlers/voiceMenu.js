const { PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { activeVoiceChannels } = require('./voice.js');

/**
 * Xử lý khi người dùng bấm nút trên Menu Voice
 */
async function handleVoiceMenuInteraction(interaction) {
    const { customId, member, guild } = interaction;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel || !activeVoiceChannels.has(voiceChannel.id)) {
        return interaction.reply({ content: '❌ Bạn phải đang ở trong phòng voice của mình để dùng menu này!', flags: [MessageFlags.Ephemeral] });
    }

    const ownerId = activeVoiceChannels.get(voiceChannel.id);
    if (member.id !== ownerId) {
        return interaction.reply({ content: '❌ Bạn không phải là chủ của phòng voice này!', flags: [MessageFlags.Ephemeral] });
    }

    try {
        switch (customId) {
            case 'vm_lock':
                await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: false });
                await interaction.reply({ content: '🔒 Phòng của bạn đã được **Khóa**!', flags: [MessageFlags.Ephemeral] });
                break;

            case 'vm_unlock':
                await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: true });
                await interaction.reply({ content: '🔓 Phòng của bạn đã được **Mở Khóa**!', flags: [MessageFlags.Ephemeral] });
                break;

            case 'vm_ghost':
                const isHidden = voiceChannel.permissionOverwrites.cache.get(guild.roles.everyone.id)?.deny.has(PermissionFlagsBits.ViewChannel);
                await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: isHidden ? true : false });
                await interaction.reply({ content: isHidden ? '👁️ Phòng đã **Hiện**.' : '👻 Phòng đã **Ẩn**.', flags: [MessageFlags.Ephemeral] });
                break;

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
        console.error('❌ Lỗi xử lý nút bấm Menu Voice:', error);
    }
}

/**
 * Xử lý khi người dùng điền xong bảng Modal và bấm "Submit" (SỬA LỖI FLAGS EPHEMERAL)
 */
async function handleVoiceModalSubmit(interaction) {
    const { customId, member } = interaction;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel || !activeVoiceChannels.has(voiceChannel.id)) {
        return interaction.reply({ content: '❌ Bạn đã rời phòng hoặc phòng không hợp lệ!', flags: [MessageFlags.Ephemeral] });
    }

    try {
        if (customId === 'vmm_rename_modal') {
            const newName = interaction.fields.getTextInputValue('new_name');
            
            // ⚡ Dùng flags mới để Discord đóng modal ngay tức khắc
            await interaction.reply({ content: `📝 Đang gửi yêu cầu đổi tên thành: **${newName}**...`, flags: [MessageFlags.Ephemeral] });
            
            voiceChannel.setName(newName).catch((err) => {
                console.error('❌ Hạn chế đổi tên từ Discord:', err.message);
                interaction.followUp({ content: '⚠️ Discord giới hạn tốc độ đổi tên phòng (Tối đa 2 lần/10 phút). Phòng sẽ tự đổi tên khi hết thời gian chờ!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
            });
        } 
        
        else if (customId === 'vmm_limit_modal') {
            const limitRaw = interaction.fields.getTextInputValue('new_limit');
            const limit = parseInt(limitRaw);

            if (isNaN(limit) || limit < 0 || limit > 99) {
                return interaction.reply({ content: '❌ Vui lòng chỉ nhập số nguyên từ 0 đến 99!', flags: [MessageFlags.Ephemeral] });
            }

            await interaction.reply({ 
                content: limit === 0 ? '👥 Đang xử lý gỡ bỏ giới hạn phòng...' : `👥 Đang xử lý cài đặt giới hạn: **${limit} người**...`, 
                flags: [MessageFlags.Ephemeral] 
            });

            voiceChannel.setUserLimit(limit).catch((err) => {
                console.error('❌ Lỗi đặt giới hạn người:', err.message);
            });
        }
    } catch (error) {
        console.error('❌ Lỗi hệ thống Modal Voice:', error);
    }
}

module.exports = { handleVoiceMenuInteraction, handleVoiceModalSubmit };