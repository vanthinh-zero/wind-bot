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
    TextInputStyle,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');
require('dotenv').config();

// =========================================================================
// 1. GỘP LỆNH: !svip - BẢNG ĐIỀU HÀNH TRUNG TÂM ĐẶC QUYỀN BOOSTER
// =========================================================================
async function handleSpawnVipCommand(message) {
    const isServerAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
                          message.author.id === process.env.ADMIN_ID;
    if (!isServerAdmin) return;

    const embed = new EmbedBuilder()
        .setColor('#D4AF37')
        .setAuthor({ 
            name: 'P R E M I U M   N I T R O   B O O S T E R   H U B', 
            iconURL: message.guild.iconURL({ dynamic: true }) 
        })
        .setTitle('🏛️ TRUNG TÂM KÍCH HOẠT ĐẶC QUYỀN THÀNH VIÊN TÀI TRỢ')
        .setDescription(
            `Chào mừng quý thành viên đã kích hoạt Nitro Boost cho Server!\n` +
            `Đây là hệ thống tự động hóa cấp phát đặc quyền cao cấp dành riêng cho sếp.\n\n` +
            `─── 🌟 **VUI LÒNG CHỌN TIỆN ÍCH CẦN THIẾT LẬP** 🌟 ───\n\n` +
            `🏛️ **Khởi Tạo Phòng Voice VIP:**\n` +
            `> Tạo ngay một kênh Voice riêng biệt với tiêu chuẩn bảo mật tối cao. Kênh tồn tại **vĩnh viễn** và có sẵn bộ điều khiển Khóa/Mở, Đổi tên, Kick người...\n\n` +
            `🎫 **Đăng Ký & Nhận Role Bảng Màu Tự Động:**\n` +
            `> Mở một Không gian hỗ trợ riêng tư để sếp tự do lựa chọn **24 dải màu Gradient chuyển sắc siêu khủng**. Hệ thống sẽ **tự động tạo Role Chuyển Màu và cấp ngay lập tức** sau khi sếp đặt tên!\n\n` +
            `───────────────────────────\n` +
            `*Sếp hãy nhấn vào một trong hai nút bấm dưới đây để bắt đầu.*`
        )
        .setFooter({ 
            text: 'VIP Privilege Systems • Executive Hub Control', 
            iconURL: 'https://i.imgur.com/vH308z1.gif' 
        })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('boost_voice_modal_trigger')
            .setLabel('✦ Khởi Tạo Phòng Voice VIP')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('boost_ticket_create') 
            .setLabel('🎫 Nhận Role VIP Tự Động')
            .setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    try { await message.delete(); } catch (e) {}
}

// =========================================================================
// 2. TỰ ĐỘNG THÔNG BÁO KHI CÓ BOOSTER MỚI (AUTO WELCOME)
// =========================================================================
async function handleServerBoost(oldMember, newMember) {
    if (!oldMember.premiumSince && newMember.premiumSince) {
        const boostChannel = newMember.guild.channels.cache.get(process.env.BOOST_THANK_YOU_CHANNEL_ID);
        if (!boostChannel) return;

        const thankYouEmbed = new EmbedBuilder()
            .setColor('#8CC0EB')
            .setAuthor({ name: 'N I T R O   B O O S T E R   H U B' })
            .setTitle('🏛️ TRI ÂN THÀNH VIÊN TÀI TRỢ SERVER')
            .setDescription(
                `Trân trọng cảm ơn **<@${newMember.user.id}>** đã kích hoạt Nitro Boost cho Server!\n\n` +
                `Sự đóng góp của bạn là động lực to lớn giúp cộng đồng phát triển vững mạnh.`
            )
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await boostChannel.send({ embeds: [thankYouEmbed] });

        const boosterActionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('boost_ticket_create').setLabel('🎫 Nhận Role Bảng Màu Tự Động').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('boost_voice_modal_trigger').setLabel('✦ Tạo Phòng VIP Vĩnh Viễn').setStyle(ButtonStyle.Success)
        );

        const inviteEmbed = new EmbedBuilder()
            .setColor('#8CC0EB')
            .setDescription(`> 📢 **Đặc quyền dành riêng cho <@${newMember.user.id}>:** Bạn nhận được quyền sở hữu **01 Role màu sắc tự động** và **01 Phòng Voice VIP Vĩnh Viễn**.\n> Nhấn nút phía dưới để bắt đầu thiết lập.`);

        await boostChannel.send({ content: `📢 Thông báo đặc quyền: <@${newMember.user.id}>`, embeds: [inviteEmbed], components: [boosterActionRow] });
    }
}

// =========================================================================
// 3. TEMPLATE BẢNG ĐIỀU KHIỂN PHÒNG VOICE VIP
// =========================================================================
function createVipControlPanel(channelId) {
    const embed = new EmbedBuilder()
        .setColor('#D4AF37')
        .setAuthor({ name: 'C O N T R O L   C E N T E R' })
        .setTitle('👑 BẢNG ĐIỀU KHIỂN VOICE VIP EXECUTIVE')
        .setDescription(
            `Trung tâm quản trị không gian riêng <#${channelId}>:\n\n` +
            `🔒 **Quyền vào:** Khóa/Mở kết nối chung cho người ngoài.\n` +
            `➕ **Thêm người:** Tag trực tiếp tên bạn bè vào chat để mời vào room.\n` +
            `👥 **Giới hạn:** Tự do điều chỉnh số lượng người vào room **(Nhập 0 = Vô Hạn)**.\n` +
            `🔇 **Micro:** Tắt hoặc mở quyền phát thanh toàn phòng.\n` +
            `👢 **Truy xuất:** Ngắt kết nối thành viên bất kỳ khỏi kênh.\n` +
            `👁️ **Hiển thị:** Giấu hoặc mở công khai không gian trên danh sách.\n` +
            `✏️ **Danh xưng:** Thay đổi tên phòng VIP trực tiếp.\n\n` +
            `*Sử dụng lệnh \`!menuvip\` tại chat nếu muốn gọi lại bảng này.*`
        )
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`vip_unlock_${channelId}`).setLabel('🔓 Mở Khóa').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`vip_lock_${channelId}`).setLabel('🔒 Khóa Lại').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`vip_allowuser_${channelId}`).setLabel('➕ Thêm Người').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`vip_kick_${channelId}`).setLabel('👢 Đuổi Người').setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`vip_muteall_${channelId}`).setLabel('🔇 Tắt Mic').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`vip_unmuteall_${channelId}`).setLabel('🎙️ Mở Mic').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`vip_hide_${channelId}`).setLabel('👁️ Ẩn Phòng').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`vip_unhide_${channelId}`).setLabel('👀 Hiện Phòng').setStyle(ButtonStyle.Success)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`vip_rename_${channelId}`).setLabel('✏️ Đổi Tên').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`vip_customlimit_${channelId}`).setLabel('👥 Đổi Giới Hạn').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`vip_unlimit_${channelId}`).setLabel('🔄 Vô Hạn (0)').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`vip_delete_${channelId}`).setLabel('❌ Xóa Phòng').setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row1, row2, row3] };
}

// =========================================================================
// 4. LỆNH !menuvip TRONG CHAT
// =========================================================================
async function handleMenuVipCommand(message) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return await message.reply('❌ Bạn phải tham gia vào phòng Voice VIP của mình để gọi bảng điều khiển!');
    if (voiceChannel.parentId !== process.env.BOOSTER_CATEGORY_ID) return await message.reply('❌ Kênh voice hiện tại không phải thuộc khu vực Voice VIP!');

    const hasPermission = voiceChannel.permissionsFor(message.author).has(PermissionsBitField.Flags.ManageChannels);
    if (!hasPermission) return await message.reply('❌ Bạn không phải chủ sở hữu không gian VIP này!');

    const panel = createVipControlPanel(voiceChannel.id);
    await message.channel.send(panel);
}

// =========================================================================
// 5. TỰ ĐỘNG CẤP QUYỀN KHI CHỦ PHÒNG TAG TÊN TRONG CHAT VOICE
// =========================================================================
async function handleAutoGrantPermission(message) {
    if (!message.guild || message.author.bot) return;
    if (message.channel.type !== ChannelType.GuildVoice) return;
    if (message.channel.parentId !== process.env.BOOSTER_CATEGORY_ID) return;

    const mentionedMembers = message.mentions.members;
    if (!mentionedMembers || mentionedMembers.size === 0) return;

    const isOwner = message.channel.permissionsFor(message.author).has(PermissionsBitField.Flags.ManageChannels) || message.author.id === process.env.ADMIN_ID;
    if (!isOwner) return;

    try {
        const addedUsers = [];
        for (const [id, member] of mentionedMembers) {
            if (member.user.bot) continue;
            await message.channel.permissionOverwrites.edit(member.id, {
                ViewChannel: true,
                Connect: true,
                Speak: true
            });
            addedUsers.push(`<@${member.id}>`);
        }

        if (addedUsers.length > 0) {
            await message.channel.send({
                content: `✅ **Đã thêm quyền truy cập phòng thành công cho:** ${addedUsers.join(', ')}`
            });
        }
    } catch (error) {
        console.error('Lỗi tự động cấp quyền VIP qua Tag:', error);
    }
}

// =========================================================================
// 6. XỬ LÝ TOÀN BỘ INTERACTION (TỰ ĐỘNG KHỞI TẠO VÀ CẤP PHÁT ROLE VIP)
// =========================================================================
async function handleBoostTicketInteraction(interaction) {
    const customId = interaction.customId || '';

    if (interaction.isModalSubmit()) {
        // --- XỬ LÝ MODAL HOÀN TẤT TẠO VÀ ĐẶT TÊN ROLE VIP ---
        if (customId.startsWith('vip_role_modal_submit_')) {
            await interaction.deferUpdate(); 
            
            const rawColors = customId.replace('vip_role_modal_submit_', '');
            const [color1, color2] = rawColors.split('-');
            
            const intColor1 = parseInt(color1.replace('#', ''), 16);
            const intColor2 = parseInt(color2.replace('#', ''), 16);

            const roleNameInput = interaction.fields.getTextInputValue('vip_role_name_input').trim();
            const member = interaction.member;
            const guild = interaction.guild;
            const ticketChannel = interaction.channel;

            try {
                const rawRoleData = await guild.client.rest.post(
                    `/guilds/${guild.id}/roles`,
                    {
                        body: {
                            name: roleNameInput,
                            color: intColor1,
                            theme_colors: [intColor1, intColor2],
                            style_type: 1,
                            hoist: false,
                            mentionable: false
                        }
                    }
                );

                const vipRole = await guild.roles.fetch(rawRoleData.id);
                if (!vipRole) throw new Error("Không thể map dữ liệu vai trò.");

                await member.roles.add(vipRole);

                const botMember = await guild.members.fetchMe();
                const botHighestRole = botMember.roles.highest;
                if (botHighestRole && botHighestRole.position > 1) {
                    await vipRole.setPosition(botHighestRole.position - 1).catch(() => null);
                }

                let timeLeft = 10;
                const successEmbed = new EmbedBuilder()
                    .setColor(color1)
                    .setTitle('🎉 KÍCH HOẠT DANH HIỆU GRADIENT THÀNH CÔNG!')
                    .setDescription(
                        `> 👑 Tên Role VIP: **${roleNameInput}**\n` +
                        `> 🎨 Hệ màu Gradient: \`${color1}\` ➔ \`${color2}\`\n` +
                        `> 👤 Sở hữu bởi: <@${member.id}>\n\n` +
                        `⏳ **Hệ thống tự động hóa:** Kênh ticket này sẽ tự hủy dọn dẹp sau **${timeLeft} giây** nữa.`
                    );

                const finalMsg = await ticketChannel.send({ embeds: [successEmbed] });

                const countdownInterval = setInterval(async () => {
                    timeLeft--;
                    if (timeLeft > 0) {
                        const updatedEmbed = new EmbedBuilder(successEmbed.data)
                            .setDescription(
                                `> 👑 Tên Role VIP: **${roleNameInput}**\n` +
                                `> 🎨 Hệ màu Gradient: \`${color1}\` ➔ \`${color2}\`\n` +
                                `> 👤 Sở hữu bởi: <@${member.id}>\n\n` +
                                `⏳ **Hệ thống tự động hóa:** Kênh ticket này sẽ tự hủy dọn dẹp sau **${timeLeft} giây** nữa.`
                            );
                        await finalMsg.edit({ embeds: [updatedEmbed] }).catch(() => null);
                    } else {
                        clearInterval(countdownInterval);
                        await ticketChannel.delete().catch(() => null);
                    }
                }, 1000);

                return;
            } catch (error) {
                console.error('Lỗi quy trình tạo Role VIP Gradient:', error);
                return await ticketChannel.send({ content: `❌ **Lỗi đồng bộ phân quyền:** Không thể kích hoạt tab Chuyển Màu. Sếp kiểm tra lại cài đặt Server!` });
            }
        }

        // --- MODAL KHỞI TẠO PHÒNG VOICE VIP ---
        if (customId === 'boost_voice_modal_submit') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const roomName = interaction.fields.getTextInputValue('voice_room_name_input');
            const vipCategoryId = process.env.BOOSTER_CATEGORY_ID;
            const vipCategory = interaction.guild.channels.cache.get(vipCategoryId);

            if (!vipCategory) return await interaction.editReply({ content: '❌ Cấu hình danh mục (Category) VIP chưa khả dụng trên server.' });

            try {
                const staffRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'bò quản trị');
                const permissionOverwrites = [
                    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers
                        ],
                    }
                ];
                if (staffRole) permissionOverwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Speak] });

                const vipVoiceChannel = await interaction.guild.channels.create({
                    name: `💎｜${roomName}`,
                    type: ChannelType.GuildVoice,
                    parent: vipCategoryId,
                    permissionOverwrites: permissionOverwrites,
                });

                const panel = createVipControlPanel(vipVoiceChannel.id);
                return await interaction.editReply({
                    content: `✅ **Khởi tạo thành công!** Kênh đã sẵn sàng tại **${vipCategory.name}**.\n👉 <#${vipVoiceChannel.id}>`,
                    embeds: panel.embeds,
                    components: panel.components
                });
            } catch (error) {
                return await interaction.editReply({ content: '❌ Khởi tạo thất bại do lỗi hệ thống!' });
            }
        }

        // --- MODAL ĐỔI TÊN PHÒNG ---
        if (customId.startsWith('vip_modal_rename_')) {
            const channelId = customId.replace('vip_modal_rename_', '');
            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) return await interaction.reply({ content: '❌ Kênh không tồn tại!', flags: [MessageFlags.Ephemeral] });
            const newName = interaction.fields.getTextInputValue('vip_new_name_input');
            await channel.setName(`💎｜${newName}`);
            return await interaction.reply({ content: `✅ Đã cập nhật danh xưng mới: **💎｜${newName}**`, flags: [MessageFlags.Ephemeral] });
        }

        // --- MODAL CHỈNH GIỚI HẠN NGƯỜI TỰ DO ---
        if (customId.startsWith('vip_modal_limit_')) {
            const channelId = customId.replace('vip_modal_limit_', '');
            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) return await interaction.reply({ content: '❌ Kênh không tồn tại!', flags: [MessageFlags.Ephemeral] });
            
            const limitVal = parseInt(interaction.fields.getTextInputValue('vip_limit_input').trim(), 10);
            if (isNaN(limitVal) || limitVal < 0 || limitVal > 99) {
                return await interaction.reply({ content: '❌ Vui lòng nhập số nguyên từ **0 đến 99**!', flags: [MessageFlags.Ephemeral] });
            }

            await channel.setUserLimit(limitVal);
            const msgText = limitVal === 0 ? '🔄 Đã đặt phòng thành **Vô Hạn người**!' : `👥 Đã chỉnh giới hạn phòng thành **${limitVal} người**!`;
            return await interaction.reply({ content: msgText, flags: [MessageFlags.Ephemeral] });
        }

        // --- MODAL KICK NGƯỜI ---
        if (customId.startsWith('vip_modal_kick_')) {
            const channelId = customId.replace('vip_modal_kick_', '');
            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) return await interaction.reply({ content: '❌ Kênh không tồn tại!', flags: [MessageFlags.Ephemeral] });
            const userInput = interaction.fields.getTextInputValue('vip_kick_user_input').trim().replace(/[<@!>]/g, '');
            try {
                const member = await interaction.guild.members.fetch(userInput);
                if (member.voice.channelId !== channel.id) return await interaction.reply({ content: '❌ Thành viên không ở trong phòng voice!', flags: [MessageFlags.Ephemeral] });
                await member.voice.disconnect();
                return await interaction.reply({ content: `👢 Đã đuổi thành viên <@${member.id}>!`, flags: [MessageFlags.Ephemeral] });
            } catch (e) { return await interaction.reply({ content: '❌ Thao tác thất bại!', flags: [MessageFlags.Ephemeral] }); }
        }
        return; 
    }

    // --- XỬ LÝ MENU CHỌN TONE MÀU ---
    if (interaction.isStringSelectMenu()) {
        if (customId === 'vip_color_select_tone') {
            const selectedTone = interaction.values[0];
            let colorListText = '';
            let nextMenuOptions = [];

            if (selectedTone === 'gradient_cyber') {
                colorListText = `🔮 **STYLE CHUYỂN MÀU: CYBERPUNK NEON (GRADIENT)**\n` +
                                `• **Neon Sunset:** \`#FF007F\` ➔ \`#FF7B00\`\n` +
                                `• **Electric Purple:** \`#7928CA\` ➔ \`#B800FF\`\n` +
                                `• **Deep Ocean:** \`#0070F3\` ➔ \`#00DFD8\`\n` +
                                `• **Toxic Acid:** \`#00FF87\` ➔ \`#60EFFF\`\n` +
                                `• **Synthwave Grid:** \`#8A2387\` ➔ \`#F27121\`\n` +
                                `• **Digital Matrix:** \`#00FF00\` ➔ \`#003300\``;
                nextMenuOptions = [
                    { label: 'Dải màu 01: Neon Sunset', value: '#FF007F-#FF7B00', description: 'Hồng rực rỡ sang Cam Lửa Hoàng Hôn.' },
                    { label: 'Dải màu 02: Electric Purple', value: '#7928CA-#B800FF', description: 'Tím Điện sắc sảo phối Hồng Neon.' },
                    { label: 'Dải màu 03: Deep Ocean', value: '#0070F3-#00DFD8', description: 'Xanh Sapphire sang Cyan mát lạnh.' },
                    { label: 'Dải màu 04: Toxic Acid', value: '#00FF87-#60EFFF', description: 'Xanh Lime phát quang cực cuốn hút.' },
                    { label: 'Dải màu 05: Synthwave Grid', value: '#8A2387-#F27121', description: 'Tông màu Retro thập niên 80 hoài cổ.' },
                    { label: 'Dải màu 06: Digital Matrix', value: '#00FF00-#003300', description: 'Sắc xanh ma trận của hacker công nghệ.' }
                ];
            } else if (selectedTone === 'gradient_luxury') {
                colorListText = `🏛️ **STYLE CHUYỂN MÀU: LUXURY ROYAL (GRADIENT)**\n` +
                                `• **Champagne Gold:** \`#F3A152\` ➔ \`#ECA869\`\n` +
                                `• **Imperial Gold:** \`#B8860B\` ➔ \`#FFD700\`\n` +
                                `• **Midnight Velvet:** \`#0F2027\` ➔ \`#203A43\`\n` +
                                `• **Rose Quartz:** \`#FFCAD4\` ➔ \`#B5E2FA\`\n` +
                                `• **Silver Platinum:** \`#D3D3D3\` ➔ \`#FFFFFF\`\n` +
                                `• **Ruby Diamond:** \`#A8001F\` ➔ \`#DD1818\``;
                nextMenuOptions = [
                    { label: 'Dải màu 07: Champagne Gold', value: '#F3A152-#ECA869', description: 'Vàng sâm banh thanh tú nhẹ nhàng.' },
                    { label: 'Dải màu 08: Imperial Gold', value: '#B8860B-#FFD700', description: 'Chuẩn vương giả tôn vinh vị thế.' },
                    { label: 'Dải màu 09: Midnight Velvet', value: '#0F2027-#203A43', description: 'Xanh đen ánh kim thẫm thượng lưu.' },
                    { label: 'Dải màu 10: Rose Quartz', value: '#FFCAD4-#B5E2FA', description: 'Thạch anh hồng phối băng lam trong trẻo.' },
                    { label: 'Dải màu 11: Silver Platinum', value: '#D3D3D3-#FFFFFF', description: 'Bạch kim sang trọng, bóng bẩy tôn dáng.' },
                    { label: 'Dải màu 12: Ruby Diamond', value: '#A8001F-#DD1818', description: 'Đỏ Ruby quý phái của giới tài phiệt.' }
                ];
            } else if (selectedTone === 'gradient_holo') {
                colorListText = `🦄 **STYLE CHUYỂN MÀU: HOLOGRAPHIC (GRADIENT)**\n` +
                                `• **Aurora Borealis:** \`#00C9FF\` ➔ \`#92FE9D\`\n` +
                                `• **Cotton Candy:** \`#FF9A9E\` ➔ \`#FECFEF\`\n` +
                                `• **Cosmic Nebula:** \`#A18CD1\` ➔ \`#FBC2EB\`\n` +
                                `• **Magic Mint:** \`#69FF97\` ➔ \`#00E4FF\`\n` +
                                `• **Pastel Dreams:** \`#E0C3FC\` ➔ \`#8EC5FC\`\n` +
                                `• **Sweet Lavender:** \`#CC99FF\` ➔ \`#FFCCFF\``;
                nextMenuOptions = [
                    { label: 'Dải màu 13: Aurora Borealis', value: '#00C9FF-#92FE9D', description: 'Ánh cực quang huyền ảo vùng Bắc Cực.' },
                    { label: 'Dải màu 14: Cotton Candy', value: '#FF9A9E-#FECFEF', description: 'Ngọt ngào như kẹo bông mộng mơ.' },
                    { label: 'Dải màu 15: Cosmic Nebula', value: '#A18CD1-#FBC2EB', description: 'Tinh vân vũ trụ tím khói ánh hồng dịu.' },
                    { label: 'Dải màu 16: Magic Mint', value: '#69FF97-#00E4FF', description: 'Bạc hà bừng sáng phối lam trong lành.' },
                    { label: 'Dải màu 17: Pastel Dreams', value: '#E0C3FC-#8EC5FC', description: 'Hệ màu mờ mộng mịn màng thanh lịch.' },
                    { label: 'Dải màu 18: Sweet Lavender', value: '#CC99FF-#FFCCFF', description: 'Sắc hoa oải hương ngọt ngào lãng mạn.' }
                ];
            } else {
                colorListText = `🔥 **STYLE CHUYỂN MÀU: ANIME & FANTASY AURA (GRADIENT)**\n` +
                                `• **Volcanic Magma:** \`#FF416C\` ➔ \`#FF4B2B\`\n` +
                                `• **Super Saiyan:** \`#F7971E\` ➔ \`#FFD200\`\n` +
                                `• **Forest Moss:** \`#11998E\` ➔ \`#38EF7D\`\n` +
                                `• **Frozen Blizzard:** \`#1FA2FF\` ➔ \`#12D8FA\`\n` +
                                `• **Amaterasu:** \`#000000\` ➔ \`#FF0000\`\n` +
                                `• **Hollow Purple:** \`#4A00E0\` ➔ \`#8E2DE2\``;
                nextMenuOptions = [
                    { label: 'Dải màu 19: Volcanic Magma', value: '#FF416C-#FF4B2B', description: 'Đỏ nham thạch cuộn trào rực lửa.' },
                    { label: 'Dải màu 20: Super Saiyan', value: '#F7971E-#FFD200', description: 'Hào quang vàng rực bùng nổ sức mạnh.' },
                    { label: 'Dải màu 21: Forest Moss', value: '#11998E-#38EF7D', description: 'Xanh ngọc bảo lục mang tài lộc thịnh vượng.' },
                    { label: 'Dải màu 22: Frozen Blizzard', value: '#1FA2FF-#12D8FA', description: 'Bão tuyết đại dương cực bắc sắc lạnh.' },
                    { label: 'Dải màu 23: Amaterasu', value: '#000000-#FF0000', description: 'Ngọn lửa đen huyền bí phối Đỏ máu.' },
                    { label: 'Dải màu 24: Hollow Purple', value: '#4A00E0-#8E2DE2', description: 'Tử sắc vô hạn bộc phá cực hạn.' }
                ];
            }

            const nextMenu = new StringSelectMenuBuilder()
                .setCustomId('vip_color_select_match')
                .setPlaceholder('Bấm vào đây để chọn dải màu chuyển sắc sếp thích...')
                .addOptions(nextMenuOptions.map(opt => 
                    new StringSelectMenuOptionBuilder().setLabel(opt.label).setValue(opt.value).setDescription(opt.description)
                ));

            return await interaction.update({
                content: `${colorListText}\n\n👑 **BƯỚC TIẾP THEO:** Sếp hãy chọn một dải màu cụ thể bên dưới để mở Form đặt tên danh hiệu!`,
                components: [new ActionRowBuilder().addComponents(nextMenu)]
            });
        }

        if (customId === 'vip_color_select_match') {
            const colorPairValue = interaction.values[0];
            
            const modal = new ModalBuilder()
                .setCustomId(`vip_role_modal_submit_${colorPairValue}`)
                .setTitle('Đặt Tên Cho Role VIP Gradient');

            const roleNameInput = new TextInputBuilder()
                .setCustomId('vip_role_name_input')
                .setLabel("Nhập tên danh hiệu độc quyền:")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Ví dụ: 👑 VIP ✦ Sếp Cường")
                .setMinLength(2)
                .setMaxLength(30)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(roleNameInput));
            return await interaction.showModal(modal);
        }
        return;
    }

    if (interaction.isButton()) {
        if (customId === 'vip_color_suggest_start') {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('vip_color_select_tone')
                .setPlaceholder('Chọn Style thiết kế Gradient sếp yêu thích...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('🔮 Style 01: Cyberpunk Neon (Hiện đại, rực rỡ)').setValue('gradient_cyber').setDescription('Phong cách tương lai, ánh đèn đêm hoành tráng'),
                    new StringSelectMenuOptionBuilder().setLabel('🏛️ Style 02: Luxury Royal (Hoàng gia, Quý tộc)').setValue('gradient_luxury').setDescription('Phong cách tài phiệt, vàng kim và tối giản tinh tế'),
                    new StringSelectMenuOptionBuilder().setLabel('🦄 Style 03: Holographic (Lấp lánh, Mơ mộng)').setValue('gradient_holo').setDescription('Màu sắc chuyển đổi ảo diệu như lăng kính cầu vồng'),
                    new StringSelectMenuOptionBuilder().setLabel('🔥 Style 04: Anime & Fantasy Aura (Bùng nổ sức mạnh)').setValue('gradient_element').setDescription('Dung nham, Saiyan, Amaterasu, Vô hạn tử sắc...')
                );

            return await interaction.reply({
                content: '🎨 **Trợ Lý Khảo Sát Màu Chuyển Sắc (Gradient):** Vui lòng chọn một trường phái nghệ thuật sếp muốn hướng tới:',
                components: [new ActionRowBuilder().addComponents(menu)],
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (customId === 'boost_voice_modal_trigger') {
            if (!interaction.member.premiumSince && interaction.user.id !== process.env.ADMIN_ID) {
                return await interaction.reply({ content: `❌ Quyền khởi tạo chỉ dành riêng cho **Nitro Booster**!`, flags: [MessageFlags.Ephemeral] });
            }
            const modal = new ModalBuilder().setCustomId('boost_voice_modal_submit').setTitle('Khởi Tạo Không Gian VIP');
            const roomNameInput = new TextInputBuilder()
                .setCustomId('voice_room_name_input')
                .setLabel("Nhập danh xưng phòng độc quyền:")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Ví dụ: Executive Lounge")
                .setMinLength(2).setMaxLength(25).setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(roomNameInput));
            return await interaction.showModal(modal);
        }

        if (customId === 'boost_ticket_create') {
            if (!interaction.member.premiumSince && interaction.user.id !== process.env.ADMIN_ID) {
                return await interaction.reply({ content: `❌ Yêu cầu quyền **Nitro Booster**!`, flags: [MessageFlags.Ephemeral] });
            }

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
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                        },
                        {
                            id: process.env.ADMIN_ROLE_ID || guild.roles.cache.find(r => r.name.toLowerCase().includes('admin'))?.id || guild.id, 
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                        }
                    ],
                });

                await interaction.reply({ content: `✅ Không gian tự động hóa đã mở tại: <#${ticketChannel.id}>.`, flags: [MessageFlags.Ephemeral] });

                const welcomeTicketEmbed = new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle(`🎫 HỆ THỐNG CẤP PHÁT DANH HIỆU VIP TỰ ĐỘNG`)
                    .setDescription(
                        `Chào mừng thành viên tài trợ <@${interaction.user.id}>!\n\n` +
                        `Hệ thống thông minh đã được kích hoạt. Sếp chỉ cần bấm nút bên dưới, chọn dải màu Gradient ưng ý nhất.\n` +
                        `Hệ thống sẽ bật Form để sếp nhập tên danh hiệu cá nhân, sau đó gán màu Gradient thực tế và cấp vào tài khoản ngay tức thì!`
                    );

                const rowSuggest = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('vip_color_suggest_start')
                        .setLabel('🎨 Bắt Đầu Chọn 24 Dải Màu Gradient & Nhận Role')
                        .setStyle(ButtonStyle.Primary)
                );

                return await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [welcomeTicketEmbed], components: [rowSuggest] });
            } catch (e) {
                return await interaction.reply({ content: '❌ Không thể thiết lập không gian, kiểm tra phân quyền của Bot!', flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- BỘ NÚT TƯƠNG TÁC QUẢN TRỊ VOICE VIP ---
        if (customId.startsWith('vip_')) {
            const parts = customId.split('_');
            const action = parts[1]; 
            const channelId = parts[2];
            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) return await interaction.reply({ content: '❌ Không tìm thấy không gian voice!', flags: [MessageFlags.Ephemeral] });

            const isOwner = channel.permissionsFor(interaction.user).has(PermissionsBitField.Flags.ManageChannels) || interaction.user.id === process.env.ADMIN_ID;
            if (!isOwner) return await interaction.reply({ content: '❌ Bạn không có quyền Chủ Phòng!', flags: [MessageFlags.Ephemeral] });

            try {
                if (action === 'lock') {
                    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { Connect: false });
                    return await interaction.reply({ content: '🔒 Đã chuyển trạng thái: **Khóa riêng tư**.', flags: [MessageFlags.Ephemeral] });
                }
                else if (action === 'unlock') {
                    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { Connect: true });
                    return await interaction.reply({ content: '🔓 Đã chuyển trạng thái: **Công khai**.', flags: [MessageFlags.Ephemeral] });
                }
                else if (action === 'allowuser') {
                    return await interaction.reply({ 
                        content: `💡 **Mẹo thêm bạn vào room cực nhanh:** Sếp chỉ cần **Tag trực tiếp tên bạn đó (ví dụ \`@username\`)** ngay tại ô chat của phòng voice này. Bot sẽ tự nhận diện và mở quyền cho bạn ấy vào ngay!`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }
                else if (action === 'kick') {
                    const modal = new ModalBuilder().setCustomId(`vip_modal_kick_${channelId}`).setTitle('Ngắt Kết Nối Thành Viên');
                    const userInput = new TextInputBuilder().setCustomId('vip_kick_user_input').setLabel("Nhập ID hoặc Tag người cần đuổi:").setStyle(TextInputStyle.Short).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(userInput));
                    return await interaction.showModal(modal);
                }
                else if (action === 'muteall') {
                    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { Speak: false });
                    return await interaction.reply({ content: '🔇 Đã vô hiệu hóa Micro người ngoài.', flags: [MessageFlags.Ephemeral] });
                }
                else if (action === 'unmuteall') {
                    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { Speak: true });
                    return await interaction.reply({ content: '🎙️ Đã khôi phục quyền phát thanh.', flags: [MessageFlags.Ephemeral] });
                }
                else if (action === 'hide') {
                    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { ViewChannel: false });
                    return await interaction.reply({ content: '👁️ Đã ẩn phòng.', flags: [MessageFlags.Ephemeral] });
                }
                else if (action === 'unhide') {
                    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { ViewChannel: true });
                    return await interaction.reply({ content: '👀 Đã hiện phòng.', flags: [MessageFlags.Ephemeral] });
                }
                else if (action === 'rename') {
                    const modal = new ModalBuilder().setCustomId(`vip_modal_rename_${channelId}`).setTitle('Thay Đổi Danh Xưng VIP');
                    const nameInput = new TextInputBuilder().setCustomId('vip_new_name_input').setLabel("Nhập tên phòng mới:").setStyle(TextInputStyle.Short).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                    return await interaction.showModal(modal);
                }
                else if (action === 'customlimit') {
                    const modal = new ModalBuilder().setCustomId(`vip_modal_limit_${channelId}`).setTitle('👥 Đổi Giới Hạn Người Vào');
                    const limitInput = new TextInputBuilder()
                        .setCustomId('vip_limit_input')
                        .setLabel("Nhập số lượng giới hạn (0 = Vô Hạn):")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Nhập một số từ 0 đến 99...")
                        .setMinLength(1)
                        .setMaxLength(2)
                        .setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                    return await interaction.showModal(modal);
                }
                else if (action === 'unlimit') {
                    await channel.setUserLimit(0);
                    return await interaction.reply({ content: '🔄 Đã đưa phòng về trạng thái **Vô Hạn người (0)**.', flags: [MessageFlags.Ephemeral] });
                }
                else if (action === 'delete') {
                    await channel.delete();
                    return;
                }
            } catch (e) { return await interaction.reply({ content: '❌ Lỗi hệ thống!', flags: [MessageFlags.Ephemeral] }); }
        }
    }
}

module.exports = {
    handleSpawnVipCommand,
    handleServerBoost,
    handleMenuVipCommand,
    handleAutoGrantPermission,
    handleBoostTicketInteraction
};