const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SPAM_LIMIT = 5; 
const TIME_WINDOW = 3000; 
const TIME_MUTE = 10 * 60 * 1000; 
const usersMap = new Map();

let raidCount = 15;

/**
 * HÀM CHỐNG SPAM TỐC ĐỘ CAO (GIỮ NGUYÊN)
 */
async function handleAntiSpam(message) {
    if (message.author.bot || !message.guild || message.author.id === process.env.ADMIN_ID) return false;
    if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return false;

    const userId = message.author.id;
    const currentTime = Date.now();

    if (usersMap.has(userId)) {
        const userData = usersMap.get(userId);
        const { lastMessageTime, msgCount } = userData;

        if (currentTime - lastMessageTime < TIME_WINDOW) {
            let newCount = msgCount + 1;
            
            if (newCount >= SPAM_LIMIT) {
                try {
                    if (message.channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
                        await message.channel.bulkDelete(SPAM_LIMIT).catch(() => {});
                    }

                    await message.member.timeout(TIME_MUTE, 'Hệ thống Anti-Raid: Phát hiện Spam tốc độ cao.');

                    const warnEmbed = new EmbedBuilder()
                        .setTitle('🛡️ HỆ THỐNG BẢO AN KÍCH HOẠT')
                        .setDescription(`Thành viên ${message.author} vừa bị cách ly **10 phút** vì hành vi cố tình làm loạn, spam phá hoại server.`)
                        .setColor('#ff0000')
                        .setTimestamp();

                    await message.channel.send({ embeds: [warnEmbed] });
                    usersMap.delete(userId);
                    return true; 
                } catch (err) {
                    console.error('Không thể phạt kẻ spam:', err);
                }
            } else {
                userData.msgCount = newCount;
                userData.lastMessageTime = currentTime;
                usersMap.set(userId, userData);
            }
        } else {
            usersMap.set(userId, { lastMessageTime: currentTime, msgCount: 1 });
        }
    } else {
        usersMap.set(userId, { lastMessageTime: currentTime, msgCount: 1 });
    }
    return false;
}

/**
 * 🚨 LỆNH TROLL FAKE RAID
 */
async function handleFakeRaidCommand(message) {
    if (message.author.id !== process.env.ADMIN_ID) return false;

    const commandText = message.content.trim();

    if (commandText === '!fakeraid') {
        await message.delete().catch(() => {});

        const welcomeChannel = message.guild.channels.cache.find(c => c.id === '123456789012345678' || c.name === 'welcome' || c.name === 'kenh-chao-mung');
        if (!welcomeChannel) return false;

        raidCount++;
        const targetName1 = "⋆ ˚｡ KHU TỰ TRỊ ϑϱ ˚⋆";
        const targetName2 = "𝖁𝖚𝖔𝖓𝖌 𝕼𝖚𝖔𝖈 𝕶𝖍𝖎";
        const targetName3 = '"the child"';

        const fakeRaidEmbed = new EmbedBuilder()
            .setTitle('🚨 HỆ THỐNG PHÁT HIỆN HÀNH VI KHIÊU CHIẾN & PHÁ HOẠI 🚨')
            .setColor('#ff0000')
            .setDescription(
                `⚠️ **Cảnh báo gửi đến:** **${targetName1}**, **${targetName2}** & **${targetName3}**\n` +
                `📊 **Hồ sơ bảo an:** Đây là lần thứ **${raidCount}** phía các bạn có hành vi xâm phạm/khiêu chiến Server này.\n\n` +
                `📢 **THÔNG BÁO TỪ HỆ THỐNG PHÒNG THỦ:**\n` +
                `├ Vì máy chủ **${targetName3}** đã chính thức nằm trong danh sách đen, hệ thống sẽ tự động kích hoạt lệnh raid toàn diện ngược lại mục tiêu trong **2 tiếng** tới.\n` +
                `├ Theo hệ thống điều tra thông tin, phía **${targetName2}** có liên quan khá mật thiết với người dùng maclaurrin giống như khu tự trị nên đã được thêm vào diện tình nghi đặc biệt.\n` +
                `├ Hiện tại, đối với máy chủ này không có ai khả nghi thêm trừ người dùng <@988804635169026069>. Qua điều tra và lịch sử phát ngôn, người này biết code và đang có ý đồ muốn học cách *"code ra tôi"*.\n` +
                `└ **ĐẶC BIỆT:** Chúng tôi đã nắm quyền kiểm soát tuyệt đối đối với account maclaurrin. Tài khoản, mật khẩu đã được gửi riêng cho admin.\n\n` +
                `🔥 **LỜI NHẮC CUỐI CÙNG:** Hệ thống hiện tại đang đặt trạng thái đề phòng ở mức cao nhất đối với **${targetName2}**. Chỉ cần phía server các bạn có bất kỳ hành động nhỏ nào nhen nhóm, hệ thống bảo an tối cao sẽ **tự động đánh sập server của các bạn ngay lập tức** mà không cần báo trước.`
            )
            .setTimestamp()
            .setFooter({ text: 'Hệ thống bảo an tối cao ĐÀN BÒ BIẾT BAY' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('chien_lai_on')
                    .setLabel('⚔️ KÍCH HOẠT PHẢN CÔNG')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('chien_lai_off')
                    .setLabel('🛡️ Giữ thế thủ (Cảnh cáo)')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await welcomeChannel.send({
            content: `@everyone ⚠️ **PHÁT HIỆN BIẾN CỐ AN NINH DIỆN RỘNG - HỆ THỐNG ĐANG XỬ LÝ!**`,
            embeds: [fakeRaidEmbed],
            components: [row]
        });

        const filter = i => i.user.id === process.env.ADMIN_ID || i.member.permissions.has(PermissionFlagsBits.ManageGuild);
        const collector = response.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'chien_lai_on') {
                await i.update({
                    content: `🔥 **LỆNH TỔNG PHẢN CÔNG ĐÃ ĐƯỢC DUYỆT!** Toàn bộ lực lượng xuất kích, mục tiêu hủy diệt: **${targetName1}**, **${targetName2}** & **${targetName3}**!`,
                    components: []
                });
            } else if (i.customId === 'chien_lai_off') {
                await i.update({
                    content: `🛡️ **Tạm hoãn.** Lưu IP của đối phương vào danh sách đen theo dõi đặc biệt. Lần sau tự động xử lý.`,
                    components: []
                });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                response.edit({ components: [] }).catch(() => {});
            }
        });

        return true;
    }
    
    // 🔍 LỆNH ĐIỀU TRA KHU TỰ TRỊ
    if (commandText === '!dieutra ⋆ ˚｡ KHU TỰ TRỊ ϑϱ ˚⋆') {
        await message.delete().catch(() => {});

        const welcomeChannel = message.guild.channels.cache.find(c => c.id === '123456789012345678' || c.name === 'welcome' || c.name === 'kenh-chao-mung');
        if (!welcomeChannel) return false;

        const targetName = "⋆ ˚｡ KHU TỰ TRỊ ϑϱ ˚⋆";

        const investigateEmbed = new EmbedBuilder()
            .setTitle('🔍 HỆ THỐNG TRÍ TUỆ NHÂN TẠO: TRUY XUẤT HỒ SƠ ĐIỀU TRA 🔍')
            .setColor('#00ffff')
            .setDescription(
                `📁 **Đối tượng tra cứu:** **${targetName}**\n` +
                `📊 **Trạng thái phân tích:** \`HOÀN THÀNH 100%\`\n\n` +
                `📝 **KẾT QUẢ ĐIỀU TRA CHI TIẾT TỪ BOT WIN:**\n` +
                `├ 🌐 **Mạng lưới liên kết:** Phát hiện mối quan hệ ngầm và mật thiết với máy chủ **𝖁𝖚𝖔𝖓𝖌 𝕼𝖚𝖔𝖈 𝕶𝖍𝖎** và tài khoản hệ thống của \`maclaurrin\`.\n` +
                `├ 👁️ **Mục đích tiếp cận:** Thu thập dữ liệu, cố tình tạo các kết nối quấy rối nhằm thám thính cấu trúc bảo mật máy chủ ĐÀN BÒ BIẾT BAY.\n\n` +
                `🚨 **DANH SÁCH ĐỐI TƯỢNG TRONG DIỆN TÌNH NGHI CAO:**\n` +
                `Hệ thống đã tra xét rõ ràng và xác định các nhân sự sau có liên quan mật thiết đến khả năng raid server và máy chủ "${targetName}":\n` +
                `├ 🛠️ **tunmin.zz**: Có khả năng code. *(Hệ thống đã tra xét toàn bộ tất cả buổi live, check profile, các cuộc hội thoại và voice room của người này).* \n` +
                `├ 👑 **_.nagn_**: Chủ server, đầu mối liên quan trực tiếp nhất. *(Hệ thống đã tra xét toàn bộ tất cả buổi live, check profile, các cuộc hội thoại và voice room của người này).* \n` +
                `└ 🔑 **.sangatuoi18_**: Nhân sự cốt cán quan trọng của \`_.nagn_\`. *(Hệ thống đã tra xét toàn bộ tất cả buổi live, check profile, các cuộc hội thoại và voice room của người này).*`
            )
            .setTimestamp()
            .setFooter({ text: 'Dữ liệu điều tra tối mật • ĐÀN BÒ BIẾT BAY' });

        await welcomeChannel.send({
            content: `🔍 **[HỆ THỐNG] Lệnh điều tra đối tượng kích hoạt bởi Sếp tối cao:**`,
            embeds: [investigateEmbed]
        });

        return true;
    }

    // 🔍 LỆNH ĐIỀU TRA VƯƠNG QUỐC KHỈ (CẬP NHẬT: THÊM GIÁN ĐIỆP BẢO AN)
    if (commandText === '!dieutra vuongquockhi') {
        await message.delete().catch(() => {});

        const welcomeChannel = message.guild.channels.cache.find(c => c.id === '123456789012345678' || c.name === 'welcome' || c.name === 'kenh-chao-mung');
        if (!welcomeChannel) return false;

        const targetName2 = "𝖁𝖚𝖔𝖓𝖌 𝕼𝖚𝖔𝖈 𝕶𝖍𝖎";

        const monkeyEmbed = new EmbedBuilder()
            .setTitle('🔍 HỆ THỐNG TRÍ TUỆ NHÂN TẠO: TRUY XUẤT HỒ SƠ ĐIỀU TRA 🔍')
            .setColor('#00ffff')
            .setDescription(
                `📁 **Đối tượng tra cứu:** **${targetName2}**\n` +
                `📊 **Trạng thái phân tích:** \`HOÀN THÀNH 100%\`\n\n` +
                `📝 **KẾT QUẢ PHÂN TÍCH DIỆN TÌNH NGHI:**\n` +
                `├ 🔗 **Liên kết hệ thống:** Máy chủ này có liên quan khá mật thiết với người dùng \`maclaurrin\` giống hệt cấu trúc của khu tự trị, hiện đã chính thức bị đưa vào danh sách diện tình nghi đặc biệt.\n` +
                `├ 🕵️‍♂️ **Đối tượng mục tiêu:** Qua tra xét chuyên sâu, toàn máy chủ hiện tại không ghi nhận ai khả nghi thêm ngoại trừ người dùng <@988804635169026069>.\n` +
                `├ ⚠️ **Báo cáo hành vi:** Dữ liệu lịch sử phát ngôn và tra xét thông tin cho thấy người này biết code, đang có dấu hiệu mờ ám và có ý đồ muốn học cách *"code ra tôi"*.\n\n` +
                `🚨 **PHÁT HIỆN BIẾN ĐỘNG BẢO AN NGHIÊM TRỌNG:**\n` +
                `Hệ thống quét ghi nhận người dùng <@1037019422918983810> hiện có rất nhiều dấu hiệu khả nghi bành trướng ngầm:\n` +
                `1️⃣ Đang cùng lúc có mặt trong cả 2 hệ thống máy chủ đối thủ nói trên.\n` +
                `2️⃣ Đang bí mật nắm giữ vai trò **STAFF** tại đó *(Hệ thống AI đã thực hiện thâm nhập, trích xuất log dữ liệu từ chính account của đối phương)*.\n` +
                `3️⃣ Đáng chú ý: Đối tượng này hiện đang giữ quyền **ADMIN** cấp cao tại chính server ĐÀN BÒ BIẾT BAY.\n\n` +
                `❓ **YÊU CẦU LỆNH TỪ SẾP TỐI CAO:** Có chấp thuận đưa tài khoản <@1037019422918983810> vào danh sách đen (Blacklist) để kích hoạt cơ chế cách ly tự động hay không?`
            )
            .setTimestamp()
            .setFooter({ text: 'Hệ thống quét tình báo tối mật • ĐÀN BÒ BIẾT BAY' });

        // Tạo 2 nút bấm Có / Không cho sếp lựa chọn xử lý ADMIN ẩn danh kia
        const blacklistRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('blacklist_yes')
                    .setLabel('🔴 CÓ (Đưa vào danh sách đen)')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('blacklist_no')
                    .setLabel('🟢 KHÔNG (Tiếp tục giám sát)')
                    .setStyle(ButtonStyle.Success)
            );

        const response = await welcomeChannel.send({
            content: `🔍 **[HỆ THỐNG] Lệnh điều tra đối tượng kích hoạt bởi Sếp tối cao:**`,
            embeds: [monkeyEmbed],
            components: [blacklistRow]
        });

        // Chỉ cho phép sếp (ADMIN_ID) hoặc người có quyền quản lý được bấm nút quyết định
        const filter = i => i.user.id === process.env.ADMIN_ID || i.member.permissions.has(PermissionFlagsBits.ManageGuild);
        const collector = response.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'blacklist_yes') {
                await i.update({
                    content: `🚨 **[CHỈ THỊ TỐI CAO]:** Đã phê duyệt! Đưa tài khoản <@1037019422918983810> vào danh sách đen. Tước quyền truy cập và đưa vào diện cách ly đặc biệt lập tức!`,
                    components: []
                });
            } else if (i.customId === 'blacklist_no') {
                await i.update({
                    content: `🛡️ **[HỆ THỐNG]:** Lệnh bác bỏ. Tiếp tục giữ nguyên quyền Admin của đối tượng, tăng cường chạy ngầm mã độc theo dõi log chat 24/7.`,
                    components: []
                });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                response.edit({ components: [] }).catch(() => {});
            }
        });

        return true;
    }

    return false;
}

module.exports = { handleAntiSpam, handleFakeRaidCommand };