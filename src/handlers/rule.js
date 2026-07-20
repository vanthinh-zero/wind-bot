// ./src/handlers/rule.js
const { ChannelSelectMenuBuilder, ChannelType, ActionRowBuilder, EmbedBuilder } = require('discord.js');

// Bộ nhớ tạm lưu dữ liệu Embed đang xử lý của Admin
const ruleStorage = new Map();

/**
 * Hàm kiểm tra xem chuỗi văn bản có phải là đường dẫn ảnh hợp lệ không
 */
function isImageUrl(url) {
    return (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null) || url.startsWith('https://images-ext-');
}

/**
 * Xử lý lệnh chat !setrule tuần tự bằng câu hỏi
 */
async function handleRuleCommand(message) {
    if (message.content.trim().toLowerCase() !== '!setrule') return false;

    // Lấy thông tin bảo mật từ file .env
    const adminId = process.env.ADMIN_ID;
    const adminRoleId = process.env.ADMIN_ROLE_ID;

    // Kiểm tra quyền hạn: 
    // Trùng ID người dùng HOẶC sở hữu ID Role Admin HOẶC có quyền Administrator tối cao của server
    const hasPermission = 
        message.author.id === adminId || 
        (adminRoleId && message.member.roles.cache.has(adminRoleId)) || 
        message.member.permissions.has('Administrator');

    if (!hasPermission) {
        await message.reply('❌ Bạn không có quyền sử dụng lệnh này. Chỉ Ban Quản Trị mới có thể thiết lập.');
        return true;
    }

    const currentChannel = message.channel;
    const authorId = message.author.id;

    // BƯỚC 1: Hỏi Tiêu đề
    await message.reply('📝 **[Bước 1/2]** Vui lòng nhập **Tiêu đề chính** cho bảng luật (hoặc gõ `hủy` để dừng):');

    // Tạo bộ thu thập tin nhắn từ chính Admin đó trong kênh này
    const filter = (m) => m.author.id === authorId;
    const collector = currentChannel.createMessageCollector({ filter, time: 3600000 }); // Chờ tối đa 60 phút

    let step = 1;
    let title = '';
    let content = '';
    let imageUrl = null; // Biến lưu trữ link ảnh nhận diện được

    collector.on('collect', async (m) => {
        // Hỗ trợ hủy lệnh giữa chừng
        if (m.content.trim().toLowerCase() === 'hủy') {
            await m.reply('🚫 Đã hủy bỏ quá trình thiết lập luật.');
            return collector.stop('user_cancelled');
        }

        // TỰ ĐỘNG BẮT ẢNH: Kiểm tra nếu có file đính kèm là hình ảnh
        if (m.attachments.size > 0) {
            const attachment = m.attachments.first();
            if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                imageUrl = attachment.url;
            }
        } 
        // Hoặc kiểm tra xem Admin có dán link ảnh thuần túy vào không
        else if (isImageUrl(m.content.trim())) {
            imageUrl = m.content.trim();
        }

        if (step === 1) {
            // Nếu bước 1 sếp kéo thả ảnh luôn, bot lấy text mặc định làm tiêu đề để tránh lỗi trống text
            if (m.attachments.size > 0 || isImageUrl(m.content.trim())) {
                title = "Quy Định & Nội Quy Server";
            } else {
                title = m.content.trim();
            }

            step = 2;
            // BƯỚC 2: Hỏi Nội dung
            await m.reply('📝 **[Bước 2/2]** Nhận tiêu đề thành công! Bây giờ hãy nhập tiếp **Nội dung chi tiết** (Sếp có thể thoải mái **KÉO THẢ ẢNH** kèm nội dung chữ hoặc dán link ảnh tại đây):');
        } else if (step === 2) {
            // Nếu bước này sếp dán mỗi ảnh trống, bot sẽ ghi nhận chữ placeholder tránh trống Description
            if ((m.attachments.size > 0 || isImageUrl(m.content.trim())) && !m.content.replace(m.content.trim(), '')) {
                content = m.content.trim() && !isImageUrl(m.content.trim()) ? m.content.trim() : "*(Hình ảnh đính kèm bên dưới)*";
            } else {
                content = m.content.trim();
            }
            collector.stop('completed');
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            await currentChannel.send(`⏰ Hết thời gian phản hồi (60 phút). Vui lòng gõ lại lệnh \`!setrule\` nếu muốn thực hiện lại.`);
            return;
        }
        
        if (reason === 'completed') {
            const embedOutput = new EmbedBuilder()
                .setTitle(title)
                .setDescription(content)
                .setColor('#8CC0EB'); // Giữ nguyên màu xanh của sếp

            // Nếu trong quá trình chat hệ thống nhặt được ảnh, gán vào Embed ngay
            if (imageUrl) {
                embedOutput.setImage(imageUrl);
            }

            // Lưu dữ liệu Embed vào bộ nhớ tạm
            ruleStorage.set(authorId, embedOutput);

            // Tạo thanh cuộn chọn Kênh đích để xuất bản
            const channelSelect = new ChannelSelectMenuBuilder()
                .setCustomId('rule_channel_select')
                .setPlaceholder('Chọn kênh bạn muốn gửi thông báo này vào...')
                .setChannelTypes(ChannelType.GuildText);

            const row = new ActionRowBuilder().addComponents(channelSelect);

            // Gửi thông báo hoàn tất và hiện menu chọn kênh
            await currentChannel.send({
                content: '✅ Đã đóng gói bảng luật (bao gồm hình ảnh) thành công! Vui lòng chọn kênh bên dưới để bot tiến hành gửi:',
                components: [row]
            });
        }
    });

    return true;
}

/**
 * Xử lý tương tác khi Admin chọn kênh trên menu thả xuống
 */
async function handleRuleInteraction(interaction) {
    const { customId } = interaction;

    if (interaction.isChannelSelectMenu() && customId === 'rule_channel_select') {
        const targetChannelId = interaction.values[0];
        const savedEmbed = ruleStorage.get(interaction.user.id);

        if (!savedEmbed) {
            return interaction.reply({ content: '❌ Dữ liệu bị quá hạn hoặc không tìm thấy. Vui lòng gõ lại lệnh !setrule.', ephemeral: true });
        }

        try {
            const targetChannel = await interaction.guild.channels.fetch(targetChannelId);
            
            // Gửi Khung Viền (Embed) đã setup ra kênh chat được chọn
            await targetChannel.send({ embeds: [savedEmbed] });

            // Giải phóng bộ nhớ tạm
            ruleStorage.delete(interaction.user.id);

            // Cập nhật lại thanh menu chat ẩn thành công
            await interaction.update({
                content: `🎉 **Thành công!** Khung viền quy luật đã được gửi vào kênh <#${targetChannelId}>.`,
                components: []
            });
        } catch (error) {
            console.error('Lỗi khi gửi khung viền luật:', error);
            await interaction.reply({ content: '❌ Bot đang thiếu quyền xem kênh hoặc gửi Embeds tại nơi bạn đã chọn.', ephemeral: true });
        }
        return true;
    }

    return false;
}

module.exports = {
    handleRuleCommand,
    handleRuleInteraction
};