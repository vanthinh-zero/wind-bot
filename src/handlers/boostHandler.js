const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField, 
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
require('dotenv').config();

// ==========================================
// HÀM XỬ LÝ KHI CÓ NGƯỜI BOOST SERVER
// ==========================================
async function handleServerBoost(oldMember, newMember) {
    if (!oldMember.premiumSince && newMember.premiumSince) {
        
        const boostChannel = newMember.guild.channels.cache.get(process.env.BOOST_THANK_YOU_CHANNEL_ID || 'ID_KÊNH_RIÊNG_CẢM_ƠN');
        if (!boostChannel) {
            return console.error('Không tìm thấy kênh gửi lời cảm ơn Boost!');
        }

        // 1. Gửi lời cảm ơn công khai tại kênh chuyên biệt
        const thankYouEmbed = new EmbedBuilder()
            .setColor('#FF73FA')
            .setTitle('🚀 SERVER CÓ BOOSTER MỚI! 🚀')
            .setDescription(`💖 **Xin gửi lời cảm ơn chân thành nhất đến vương cô/công tử <@${newMember.user.id}>!**\n\nSự đóng góp của bạn là nguồn động lực to lớn giúp server ngày càng phát triển vững mạnh. Xin nhận của tại hạ một lạy! 🥰`)
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await boostChannel.send({ embeds: [thankYouEmbed] });

        // 2. Gửi bảng nút bấm kích hoạt 2 loại Đặc quyền riêng biệt cho Booster
        const boosterActionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('boost_ticket_create')
                .setLabel('🎫 Nhận Role & Màu Riêng')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('boost_voice_modal_trigger')
                .setLabel('💎 Tạo Phòng Voice VIP')
                .setStyle(ButtonStyle.Success)
        );

        const inviteEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setDescription(`> 🔥 **Đặc quyền dành riêng cho <@${newMember.user.id}>:** Bạn nhận được quyền sở hữu **01 Role thiết kế riêng** và quyền tự quản lý **01 Phòng Voice VIP** riêng biệt.\n> Hãy bấm vào các nút bên dưới để bắt đầu kích hoạt đặc quyền!`);

        await boostChannel.send({ 
            content: `📢 Thông báo nhận quà dành riêng cho: <@${newMember.user.id}>`, 
            embeds: [inviteEmbed], 
            components: [boosterActionRow] 
        });
    }
}

// ==========================================
// HÀM XỬ LÝ KHI BOOSTER TƯƠNG TÁC (TICKET & VOICE MODAL)
// ==========================================
async function handleBoostTicketInteraction(interaction) {
    // ---- BẢO MẬT CHUNG: Chỉ Server Booster thực sự mới bấm được nút Tạo Ticket / Mở Modal Voice ----
    if (interaction.isButton() && ['boost_ticket_create', 'boost_voice_modal_trigger'].includes(interaction.customId)) {
        if (!interaction.member.premiumSince) {
            return await interaction.reply({
                content: `❌ **Lỗi bảo mật:** Tính năng này chứa liên kết đặc quyền dành riêng cho **Thành viên đã Boost Server**. Bạn không thể sử dụng!`,
                flags: [MessageFlags.Ephemeral] 
            });
        }
    }

    // [LOGIC 1]: Tạo kênh Ticket ẩn để làm Role/Màu (Mã gốc của bạn)
    if (interaction.isButton() && interaction.customId === 'boost_ticket_create') {
        const guild = interaction.guild;
        try {
            const ticketChannel = await guild.channels.create({
                name: `👑-role-boost-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: process.env.TICKET_CATEGORY_ID || null, 
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ],
                    },
                    {
                        id: process.env.ADMIN_ROLE_ID || guild.roles.cache.find(r => r.name.toLowerCase().includes('admin'))?.id, 
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ],
                    }
                ],
            });

            await interaction.reply({
                content: `✅ **Thành công!** Không gian thiết kế của bạn đã được mở ngầm tại: <#${ticketChannel.id}>.`,
                flags: [MessageFlags.Ephemeral]
            });

            const welcomeTicketEmbed = new EmbedBuilder()
                .setColor('#FF73FA')
                .setTitle(`🎫 KHU VỰC THIẾT KẾ DANH HIỆU VIP`)
                .setDescription(`Chào mừng vương cô/công tử <@${interaction.user.id}> đã đến!\n\nVui lòng để lại thông tin Role bạn muốn tạo theo mẫu sau:\n1. **Tên Role mong muốn:** [Điền tên]\n2. **Mã màu sắc (Hex):** [Ví dụ: #ff0000]\n\n*Admin sẽ tiến hành setup và gán chức vị độc quyền này cho bạn ngay khi đọc được tin nhắn!*`)
                .setTimestamp();

            await ticketChannel.send({ content: `<@${interaction.user.id}> | Đội ngũ hỗ trợ`, embeds: [welcomeTicketEmbed] });

        } catch (error) {
            console.error('Lỗi khi tạo kênh ticket cho Booster:', error);
            await interaction.reply({ content: '❌ Không thể khởi tạo không gian thiết kế!', flags: [MessageFlags.Ephemeral] });
        }
    }

    // [LOGIC 2]: Mở Form (Modal) bắt điền tên phòng khi bấm nút "Tạo Phòng Voice VIP"
    if (interaction.isButton() && interaction.customId === 'boost_voice_modal_trigger') {
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

    // [LOGIC 3]: Xử lý tạo phòng Voice đưa thẳng vào Danh mục VIP sau khi Submit Form
    if (interaction.isModalSubmit() && interaction.customId === 'boost_voice_modal_submit') {
        const roomName = interaction.fields.getTextInputValue('voice_room_name_input');
        const vipCategoryId = process.env.BOOSTER_CATEGORY_ID;

        const vipCategory = interaction.guild.channels.cache.get(vipCategoryId);
        if (!vipCategory || vipCategory.type !== ChannelType.GuildCategory) {
            return await interaction.reply({ 
                content: '❌ Hệ thống chưa thiết lập Danh mục phòng VIP (BOOSTER_CATEGORY_ID) trong file .env. Vui lòng liên hệ Admin!', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        try {
            const vipVoiceChannel = await interaction.guild.channels.create({
                name: `💎｜${roomName}`,
                type: ChannelType.GuildVoice,
                parent: vipCategoryId, // Nhét phòng vào đúng danh mục VIP lấy từ file .env
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.Connect], // Khóa quyền vào tự do của @everyone
                    },
                    {
                        id: interaction.user.id, // Set full đặc quyền chủ sở hữu phòng cho Booster
                        allow: [
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.Speak,
                            PermissionsBitField.Flags.ManageChannels, // Tự cấu hình/đổi tên phòng trực tiếp
                            PermissionsBitField.Flags.MoveMembers,   // Drag người vào/Kick người ra
                            PermissionsBitField.Flags.MuteMembers    // Tắt mic người phá đám
                        ],
                    },
                ],
            });

            await interaction.reply({
                content: `✅ **Thành công!** Phòng Voice VIP đặc quyền đã được tạo tại danh mục **${vipCategory.name}**.\n👉 Vào ngay tại đây: <#${vipVoiceChannel.id}>`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Lỗi khi khởi tạo phòng Voice VIP:', error);
            await interaction.reply({ content: '❌ Gặp lỗi trong quá trình khởi tạo phòng Voice VIP!', flags: [MessageFlags.Ephemeral] });
        }
    }
}

// ==========================================
// HÀM THEO DÕI VÀ TỰ ĐỘNG XÓA PHÒNG VIP TRỐNG
// ==========================================
async function checkAndCleanVipRoom(oldState, newState) {
    if (oldState.channelId) {
        const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);
        
        // Chỉ dọn dẹp nếu phòng voice đó trống VÀ nằm bên trong Danh mục VIP lấy từ file .env
        if (oldChannel && oldChannel.parentId === process.env.BOOSTER_CATEGORY_ID) {
            if (oldChannel.members.size === 0) {
                try {
                    await oldChannel.delete('Phòng VIP trống - Tự động dọn dẹp hệ thống.');
                    console.log(`🧹 Đã dọn dẹp phòng VIP trống: ${oldChannel.name}`);
                } catch (err) {
                    console.error('Không thể tự động xóa phòng VIP trống:', err);
                }
            }
        }
    }
}

module.exports = { handleServerBoost, handleBoostTicketInteraction, checkAndCleanVipRoom };