const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, MessageFlags } = require('discord.js');
require('dotenv').config();

// HÀM XỬ LÝ KHI CÓ NGƯỜI BOOST SERVER
async function handleServerBoost(oldMember, newMember) {
    // Kiểm tra xem có phải vừa mới Boost hay không
    if (!oldMember.premiumSince && newMember.premiumSince) {
        
        // Lấy ID kênh CHUYÊN BIỆT ĐỂ CẢM ƠN BOOST (Cấu hình trong file .env hoặc thay trực tiếp ID vào đây)
        const boostChannel = newMember.guild.channels.cache.get(process.env.BOOST_THANK_YOU_CHANNEL_ID || 'ID_KÊNH_RIÊNG_CẢM_ƠN');

        if (!boostChannel) {
            return console.error('Không tìm thấy kênh gửi lời cảm ơn Boost!');
        }

        // 1. Gửi lời cảm ơn công khai tại kênh riêng này (Ai cũng thấy lời cảm ơn để chúc mừng)
        const thankYouEmbed = new EmbedBuilder()
            .setColor('#FF73FA')
            .setTitle('🚀 SERVER CÓ booster MỚI! 🚀')
            .setDescription(`💖 **Xin gửi lời cảm ơn chân thành nhất đến vương cô/công tử <@${newMember.user.id}>!**\n\nSự đóng góp của bạn là nguồn động lực to lớn giúp server ngày càng phát triển vững mạnh. Xin nhận của tại hạ một lạy! 🥰`)
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await boostChannel.send({ embeds: [thankYouEmbed] });

        // 2. GỬI TIN NHẮN CHỈ NGƯỜI BOOST MỚI THẤY (Bí mật link/nút tạo Ticket)
        // Lưu ý: Discord không cho phép gửi tin nhắn Ephemeral (ẩn) trực tiếp từ sự kiện không phải Interaction.
        // Giải pháp tối ưu: Bot sẽ TAG người đó vào một tin nhắn chứa nút bấm, nhưng cấu hình quyền để CHỈ ROLE BOOSTER HOẶC CHÍNH NGƯỜI ĐÓ thấy tin nhắn này.
        // Hoặc cách sạch sẽ nhất: Gửi một Embed chứa nút bấm, người không boost bấm vào sẽ bị từ chối ngay lập tức.
        
        const ticketRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('boost_ticket_create')
                .setLabel('🎫 Khởi Tạo Đặc Quyền VIP (Chỉ Booster)')
                .setStyle(ButtonStyle.Success)
        );

        const inviteEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setDescription(`> 🔥 **Đặc quyền dành riêng cho <@${newMember.user.id}>:** Bạn nhận được quyền sở hữu **01 Role thiết kế riêng**.\n> Hãy bấm vào nút bên dưới để mở không gian thiết kế ẩn (Ticket)!`);

        // Gửi link/nút bấm này ngay tại kênh riêng đó. Người thường bấm vào sẽ lỗi, chỉ người đã boost mới xử lý được.
        await boostChannel.send({ 
            content: `📢 Thông báo nhận quà dành riêng cho: <@${newMember.user.id}>`, 
            embeds: [inviteEmbed], 
            components: [ticketRow] 
        });
    }
}

// HÀM XỬ LÝ KHI BOOSTER BẤM NÚT MỞ TICKET
async function handleBoostTicketInteraction(interaction) {
    if (!interaction.isButton() || interaction.customId !== 'boost_ticket_create') return;

    const guild = interaction.guild;
    const member = interaction.member;

    // BẢO MẬT: Nếu người bấm KHÔNG PHẢI là Booster, gửi thông báo ẩn từ chối ngay (Chỉ họ thấy dòng chữ đỏ này)
    if (!member.premiumSince) {
        return await interaction.reply({
            content: `❌ **Lỗi bảo mật:** Nút bấm này chứa liên kết đặc quyền dành riêng cho **Thành viên đã Boost Server**. Bạn không thể sử dụng tính năng này!`,
            flags: [MessageFlags.Ephemeral] 
        });
    }

    // Tiến hành tạo kênh Ticket ẩn
    try {
        const ticketChannel = await guild.channels.create({
            name: `👑-role-boost-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: process.env.TICKET_CATEGORY_ID || null, 
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel], // Ẩn với tất cả mọi người
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ], // Chỉ Booster tạo ticket mới nhìn thấy và chat được
                },
                {
                    id: process.env.ADMIN_ROLE_ID || guild.roles.cache.find(r => r.name.toLowerCase().includes('admin'))?.id, 
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ], // Cho phép Admin vào duyệt
                }
            ],
        });

        // Phản hồi ẩn cho Booster biết link kênh chat đã sẵn sàng
        await interaction.reply({
            content: `✅ **Thành công!** Không gian thiết kế của bạn đã được mở ngầm tại: <#${ticketChannel.id}>. Hãy di chuyển đến đó để làm việc với Admin nhé!`,
            flags: [MessageFlags.Ephemeral] // CHỈ NGƯỜI BOOST MỚI NHÌN THẤY LINK NÀY
        });

        // Gửi tin nhắn hướng dẫn bên trong kênh Ticket ẩn vừa tạo
        const welcomeTicketEmbed = new EmbedBuilder()
            .setColor('#FF73FA')
            .setTitle(`🎫 KHU VỰC THIẾT KẾ DANH HIỆU VIP`)
            .setDescription(
                `Chào mừng vương cô/công tử <@${interaction.user.id}> đã đến!\n\n` +
                `Vui lòng để lại thông tin Role bạn muốn tạo theo mẫu sau:\n` +
                `1. **Tên Role mong muốn:** [Điền tên]\n` +
                `2. **Mã màu sắc (Hex):** [Ví dụ: #ff0000]\n\n` +
                `*Admin sẽ tiến hành setup và gán chức vị độc quyền này cho bạn ngay khi đọc được tin nhắn!*`
            )
            .setTimestamp();

        await ticketChannel.send({ content: `<@${interaction.user.id}> | Đội ngũ hỗ trợ`, embeds: [welcomeTicketEmbed] });

    } catch (error) {
        console.error('Lỗi khi tạo kênh ticket cho Booster:', error);
        await interaction.reply({ content: '❌ Không thể khởi tạo không gian thiết kế, vui lòng thử lại hoặc liên hệ trực tiếp Admin!', flags: [MessageFlags.Ephemeral] });
    }
}

module.exports = { handleServerBoost, handleBoostTicketInteraction };