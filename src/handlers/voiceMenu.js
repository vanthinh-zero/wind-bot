const { PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');

/**
 * Hàm gửi thông báo lỗi an toàn
 */
async function sendEphemeralReply(interaction, content) {
    if (interaction.replied || interaction.deferred) return;
    return interaction.reply({ content, flags: [MessageFlags.Ephemeral] }).catch(() => {});
}

/**
 * Xử lý khi người dùng bấm nút trên Menu Voice
 */
async function handleVoiceMenuInteraction(interaction) {
    const { customId, member, guild } = interaction;
    const voiceChannel = member.voice.channel;
    
    // ⚡ LẤY MAP TỪ BỘ NHỚ TOÀN CỤC REAL-TIME
    const activeVoiceChannels = global.activeVoiceChannels || new Map();

    if (!voiceChannel) {
        return sendEphemeralReply(interaction, '❌ Bạn phải đang ở trong phòng voice để dùng menu này!');
    }

    const channelIdStr = String(voiceChannel.id);

    if (!activeVoiceChannels.has(channelIdStr)) {
        return sendEphemeralReply(interaction, '❌ Bạn phải đang ở trong phòng voice của mình để dùng menu này!');
    }

    const ownerId = String(activeVoiceChannels.get(channelIdStr));
    const memberId = String(member.id);

    if (memberId !== ownerId) {
        return sendEphemeralReply(interaction, '❌ Bạn không phải là chủ của phòng voice này!');
    }

    // 2. Xử lý hiển thị MODAL
    if (customId === 'vm_rename') {
        if (interaction.replied || interaction.deferred) return; 
        const modal = new ModalBuilder().setCustomId('vmm_rename_modal').setTitle('📝 Đổi Tên Phòng Thoại');
        const nameInput = new TextInputBuilder()
            .setCustomId('new_name')
            .setLabel('Nhập tên phòng mới muốn đổi:')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ví dụ: 🎮 Gaming Room...')
            .setRequired(true)
            .setMaxLength(30);

        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        return interaction.showModal(modal).catch(() => {});
    }

    if (customId === 'vm_limit') {
        if (interaction.replied || interaction.deferred) return; 
        const modal = new ModalBuilder().setCustomId('vmm_limit_modal').setTitle('👥 Giới Hạn Người Vào');
        const limitInput = new TextInputBuilder()
            .setCustomId('new_limit')
            .setLabel('Nhập số người (0-99, với 0 = Vô hạn):')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ví dụ: 5')
            .setRequired(true)
            .setMaxLength(2);

        modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
        return interaction.showModal(modal).catch(() => {});
    }

    // 3. Xử lý các nút bấm tương tác (Lock / Unlock / Ghost)
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }

        let replyContent = '';
        switch (customId) {
            case 'vm_lock':
                await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: false });
                replyContent = '🔒 Phòng của bạn đã được **Khóa**! Thành viên khác sẽ không thể chủ động tham gia phòng.';
                break;

            case 'vm_unlock':
                await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: true });
                replyContent = '🔓 Phòng của bạn đã được **Mở Khóa**! Mọi người có thể tự do vào phòng.';
                break;

            case 'vm_ghost': {
                const isHidden = voiceChannel.permissionOverwrites.cache.get(guild.roles.everyone.id)?.deny.has(PermissionFlagsBits.ViewChannel);
                await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: isHidden ? true : false });
                replyContent = isHidden ? '👁️ Phòng đã **Hiện** trở lại trên danh sách kênh.' : '👻 Phòng đã **Ẩn** (Chỉ những ai trong phòng mới thấy).';
                break;
            }
        }

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: replyContent }).catch(() => {});
        } else {
            await interaction.reply({ content: replyContent, flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }

    } catch (error) {
        console.error('❌ Lỗi thực thi tại Menu Voice:', error.message);
    }
}

/**
 * Xử lý khi người dùng điền xong bảng Modal và bấm "Submit"
 */
async function handleVoiceModalSubmit(interaction) {
    const { customId, member } = interaction;
    const voiceChannel = member.voice.channel;
    const activeVoiceChannels = global.activeVoiceChannels || new Map();

    if (!voiceChannel) {
        return sendEphemeralReply(interaction, '❌ Bạn đã rời phòng hoặc phòng không hợp lệ!');
    }

    const channelIdStr = String(voiceChannel.id);

    if (!activeVoiceChannels.has(channelIdStr)) {
        return sendEphemeralReply(interaction, '❌ Bạn đã rời phòng hoặc phòng không hợp lệ!');
    }

    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }

        if (customId === 'vmm_rename_modal') {
            const newName = interaction.fields.getTextInputValue('new_name');
            try {
                await voiceChannel.setName(newName);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: `📝 Đã đổi tên phòng thành: **${newName}**!` });
                }
            } catch (err) {
                console.error('❌ Giới hạn đổi tên từ Discord:', err.message);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ 
                        content: '⚠️ **Hạn chế từ Discord:** Bạn chỉ có thể đổi tên phòng 2 lần trong vòng 10 phút. Tên phòng sẽ tự thay đổi sau khi hết thời gian chờ từ hệ thống!' 
                    });
                }
            }
        } 
        else if (customId === 'vmm_limit_modal') {
            const limitRaw = interaction.fields.getTextInputValue('new_limit');
            const limit = parseInt(limitRaw);

            if (isNaN(limit) || limit < 0 || limit > 99) {
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({ content: '❌ Vui lòng chỉ nhập số nguyên từ 0 đến 99!' });
                }
                return;
            }

            try {
                await voiceChannel.setUserLimit(limit);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ 
                        content: limit === 0 ? '👥 Đã gỡ bỏ giới hạn phòng thoại thành công!' : `👥 Đã đặt giới hạn phòng thành: **${limit} người**!` 
                    });
                }
            } catch (err) {
                console.error('❌ Lỗi đặt giới hạn người:', err.message);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: '⚠️ Không thể thay đổi giới hạn số người lúc này. Vui lòng thử lại sau!' });
                }
            }
        }
    } catch (error) {
        console.error('❌ Lỗi hệ thống Modal Voice:', error.message);
    }
}

module.exports = { handleVoiceMenuInteraction, handleVoiceModalSubmit };