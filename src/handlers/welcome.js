const { EmbedBuilder } = require('discord.js');

async function handleWelcomeMember(member) {
    try {
        // =========================================================
        // 1. TỰ ĐỘNG CẤP ROLE TÂN THỦ / BÒ MỚI (NẾU CÓ CẤU HÌNH)
        // =========================================================
        if (process.env.ROLE_TAN_THU) {
            const role = member.guild.roles.cache.get(process.env.ROLE_TAN_THU) 
                        || await member.guild.roles.fetch(process.env.ROLE_TAN_THU).catch(() => null);
            if (role) {
                await member.roles.add(role).catch(err => {
                    console.error('❌ Lỗi tự động đeo thẻ tai cho Bò mới:', err.message);
                });
            }
        }

        const avatarURL = member.user.displayAvatarURL({ dynamic: true, size: 512 });
        const guildIcon = member.guild.iconURL({ dynamic: true });

        // =========================================================
        // 2. KÊNH 1: WELCOME_CHANNEL_ID (CỔNG NÔNG TRẠI / THÔNG TIN CHUNG)
        // =========================================================
        if (process.env.WELCOME_CHANNEL_ID) {
            const channel1 = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID)
                             || await member.guild.channels.fetch(process.env.WELCOME_CHANNEL_ID).catch(() => null);

            if (channel1 && channel1.isTextBased()) {
                const embed1 = new EmbedBuilder()
                    .setColor('#8CC0EB')
                    .setAuthor({ 
                        name: `WELCOME TO ${member.guild.name.toUpperCase()} FARM! 🚜`, 
                        iconURL: guildIcon 
                    })
                    // 📑 Đã xóa Title chào mừng cũ theo ý sếp
                    .setDescription(
                        `Chào mừng ${member} đã gia nhập trang trại **${member.guild.name}**!\n` +
                        `Chúc bạn có những giờ phút chăn nuôi vui vẻ, gặt hái nhiều niềm vui!`
                    )
                    .setThumbnail(avatarURL)
                    .addFields(
                        // 📑 Đã xóa mục Nội Quy Nông Trại ở đây
                        { 
                            name: '🏷️ **Tên tài khoản**', 
                            value: `${member.user.tag}`, 
                            inline: true 
                        },
                        { 
                            name: '🐮 **Thành viên chú Bò thứ**', 
                            value: `**#${member.guild.memberCount}**`, 
                            inline: true 
                        }
                    )
                    .setFooter({ text: 'Nhật kí trang trại', iconURL: guildIcon })
                    .setTimestamp();

                // Kênh 1 bây giờ chỉ thông báo thường, không tag role thông báo nữa
                let mention1 = `✨ Loa loa loa! Thành viên ${member} đã bước vào trang trại!`;

                await channel1.send({
                    content: mention1,
                    embeds: [embed1]
                }).catch(e => console.error("❌ Lỗi gửi chào mừng Kênh 1:", e.message));
            }
        }

        // =========================================================
        // 3. KÊNH 2: KENH_CHAO_MUNG (CHUỒNG TỔNG / SẢNH GIAO LƯU)
        // =========================================================
        if (process.env.KENH_CHAO_MUNG) {
            const channel2 = member.guild.channels.cache.get(process.env.KENH_CHAO_MUNG)
                             || await member.guild.channels.fetch(process.env.KENH_CHAO_MUNG).catch(() => null);

            if (channel2 && channel2.isTextBased()) {
                const embed2 = new EmbedBuilder()
                    .setColor('#8CC0EB')
                    .setTitle('🥛 THÀNH VIÊN MỚI GHÉ CHUỒNG TỔNG!')
                    .setDescription(`Mọi người ơi, ${member} vừa mới chuyển tới chuồng trò chuyện nè!\nHãy gửi một lời chào ngọt ngào đến thành viên chú bò thứ **#${member.guild.memberCount}** nha! 🐄🌾`)
                    .setThumbnail(avatarURL)
                    .setFooter({ text: 'Chúc bạn có một ngày gặm cỏ vui vẻ!' })
                    .setTimestamp();

                // ⚡ Đã chuyển phần tag role thông báo sang nội dung chat chung ở đây
                let mention2 = `📢 Moo moo ~ Chào mừng ${member} đã cập bến khu giao lưu! 🍀`;
                if (process.env.ROLE_CAN_THONG_BAO) {
                    mention2 += ` <@&${process.env.ROLE_CAN_THONG_BAO}> ơi, ra chào thành viên mới nào! 🚜`;
                }

                await channel2.send({
                    content: mention2,
                    embeds: [embed2]
                }).catch(e => console.error("❌ Lỗi gửi chào mừng Kênh 2:", e.message));
            }
        }

    } catch (error) {
        console.error('❌ Lỗi xử lý sự kiện chào mừng trang trại:', error);
    }
}

module.exports = { handleWelcomeMember };