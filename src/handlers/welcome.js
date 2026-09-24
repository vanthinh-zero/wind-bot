const { EmbedBuilder } = require('discord.js');
const { envOrSetting } = require('../utils/config');
const { getGuildChannel } = require('../utils/db');
const { COLORS, author, footer } = require('../utils/embedTheme');

async function handleWelcomeMember(member) {
    try {
        // =========================================================
        // 1. TỰ ĐỘNG CẤP ROLE TÂN THỦ / BÒ MỚI (NẾU CÓ CẤU HÌNH)
        // =========================================================
        const newMemberRoleId = envOrSetting('ROLE_TAN_THU', 'roles.newMember');
        if (newMemberRoleId) {
            const role = member.guild.roles.cache.get(newMemberRoleId)
                        || await member.guild.roles.fetch(newMemberRoleId).catch(() => null);
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
        const welcomeChannelId = await getGuildChannel(member.guild.id, 'welcome')
            || envOrSetting('WELCOME_CHANNEL_ID', 'channels.welcome');
        if (welcomeChannelId) {
            const channel1 = member.guild.channels.cache.get(welcomeChannelId)
                             || await member.guild.channels.fetch(welcomeChannelId).catch(() => null);

            if (channel1 && channel1.isTextBased()) {
                const accountCreatedAt = Math.floor(member.user.createdTimestamp / 1000);
                const joinedAt = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
                const embed1 = new EmbedBuilder()
                    .setColor(COLORS.mint)
                    .setAuthor({ 
                        name: `WIND COMMUNITY  •  ${member.guild.name.toUpperCase()} 🚜`, 
                        iconURL: guildIcon 
                    })
                    .setTitle('🌱 Một thành viên mới vừa cập bến!')
                    .setDescription(
                        `Chào mừng ${member} đã gia nhập **${member.guild.name}**!\n\n` +
                        'Hãy dành cho bạn ấy một lời chào thật ấm áp và cùng nhau tạo thêm những kỷ niệm vui vẻ nhé. 🍀'
                    )
                    .setThumbnail(avatarURL)
                    .addFields(
                        { 
                            name: '🏷️ Tài khoản', 
                            value: `${member.user.tag}`, 
                            inline: true 
                        },
                        { 
                            name: '🐮 Thành viên thứ', 
                            value: `**#${member.guild.memberCount}**`, 
                            inline: true 
                        },
                        {
                            name: '📅 Tham gia Discord',
                            value: `<t:${accountCreatedAt}:D>`,
                            inline: true
                        },
                        {
                            name: '🕰️ Vào server lúc',
                            value: joinedAt ? `<t:${joinedAt}:R>` : 'Vừa tham gia',
                            inline: true
                        }
                    )
                    .setImage('https://media.discordapp.net/attachments/1528282202222235718/1529055907504459926/MOO_MOO_11.gif?ex=6a628608&is=6a613488&hm=55b6fbae127f8fb63ffe6ed283a834816c4ad64478dc491e8f35afa626cbb61d&=')
                    .setFooter(footer('Nhật ký cộng đồng • Chúc bạn có một hành trình thật vui', guildIcon))
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
        const communityWelcomeChannelId = await getGuildChannel(member.guild.id, 'chat')
            || envOrSetting('KENH_CHAO_MUNG', 'channels.welcome');
        if (communityWelcomeChannelId) {
            const channel2 = member.guild.channels.cache.get(communityWelcomeChannelId)
                             || await member.guild.channels.fetch(communityWelcomeChannelId).catch(() => null);

            if (channel2 && channel2.isTextBased()) {
                const embed2 = new EmbedBuilder()
                    .setColor(COLORS.sun)
                    .setAuthor(author('SẢNH GIAO LƯU • THÔNG BÁO THÀNH VIÊN', guildIcon))
                    .setTitle('🥛 Một lời chào cho thành viên mới nào!')
                    .setDescription(`Mọi người ơi, ${member} vừa gia nhập cộng đồng!\n\nHãy gửi một lời chào đến thành viên thứ **#${member.guild.memberCount}** nha. 🐄🌾`)
                    .setThumbnail(avatarURL)
                    .setFooter(footer('Chúc bạn có một ngày thật vui trong cộng đồng!', guildIcon))
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