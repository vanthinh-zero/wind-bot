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
    PermissionFlagsBits
} = require('discord.js');
require('dotenv').config();

// ==========================================
// 1. LỆNH !spawnVIProom (LUXURY & ELEGANT DESIGN)
// ==========================================
async function handleSpawnVipRoomCommand(message) {
    const isServerAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
                          message.author.id === process.env.ADMIN_ID;
    if (!isServerAdmin) return;

    const embed = new EmbedBuilder()
        .setColor('#D4AF37') // Vàng Kim Metallic Premium
        .setAuthor({ 
            name: 'P R E M I U M   V I P   L O U N G E', 
            iconURL: message.guild.iconURL({ dynamic: true }) 
        })
        .setTitle('🏛️ KHUNG GIỜ KÍCH HOẠT PHÒNG VOICE ĐẶC QUYỀN')
        .setDescription(
            `Chào mừng quý thành viên sở hữu đặc quyền Nitro Booster.\n` +
            `Hệ thống sẵn sàng khởi tạo không gian trò chuyện riêng biệt với tiêu chuẩn bảo mật cao nhất.\n\n` +
            `─── ✦ **ĐẶC QUYỀN HỆ THỐNG** ✦ ───\n\n` +
            `🔹 **Bảo mật tuyệt đối:** Mặc định phòng sẽ khóa. Chỉ có **Chủ phòng**, **Admin** và **Staff** mới có quyền truy cập ban đầu.\n` +
            `🔹 **Sở hữu vĩnh viễn:** Kênh Voice duy trì cố định, không tự động xóa khi trống thành viên hoặc khi chủ phòng ngắt kết nối.\n` +
            `🔹 **Bộ điều khiển toàn năng:** Toàn quyền tùy chỉnh Khóa/Mở, Đổi tên, Mute/Unmute, Kick hoặc Giới hạn thành viên thông qua Menu VIP.\n\n` +
            `───────────────────────────\n` +
            `*Nhấn vào nút bên dưới để thiết lập tên phòng và bắt đầu khởi tạo.*`
        )
        .setFooter({ 
            text: 'VIP Privilege Systems • Executive Access Only', 
            iconURL: 'https://i.imgur.com/vH308z1.gif' 
        })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('boost_voice_modal_trigger')
            .setLabel('✦ Khởi Tạo Phòng VIP')
            .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    try { await message.delete(); } catch (e) {}
}

// ==========================================
// 2. TỰ ĐỘNG THÔNG BÁO KHI CÓ BOOSTER MỚI
// ==========================================
async function handleServerBoost(oldMember, newMember) {
    if (!oldMember.premiumSince && newMember.premiumSince) {
        const boostChannel = newMember.guild.channels.cache.get(process.env.BOOST_THANK_YOU_CHANNEL_ID);
        if (!boostChannel) return;

        const thankYouEmbed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setAuthor({ name: 'N I T R O   B O O S T E R   A N N O U N C E M E N T' })
            .setTitle('🏛️ TRI ÂN THÀNH VIÊN TÀI TRỢ SERVER')
            .setDescription(
                `Trân trọng cảm ơn **<@${newMember.user.id}>** đã kích hoạt Nitro Boost cho Server!\n\n` +
                `Sự đóng góp của bạn là động lực to lớn giúp cộng đồng phát triển vững mạnh.`
            )
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await boostChannel.send({ embeds: [thankYouEmbed] });

        const boosterActionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('boost_ticket_create').setLabel('🎫 Nhận Role & Mã Màu').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('boost_voice_modal_trigger').setLabel('✦ Tạo Phòng VIP Vĩnh Viễn').setStyle(ButtonStyle.Success)
        );

        const inviteEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setDescription(`> 📢 **Đặc quyền dành riêng cho <@${newMember.user.id}>:** Bạn nhận được quyền sở hữu **01 Role tùy chỉnh ngầm** và **01 Phòng Voice VIP Vĩnh Viễn**.\n> Nhấn nút phía dưới để bắt đầu thiết lập.`);

        await boostChannel.send({ content: `📢 Thông báo đặc quyền: <@${newMember.user.id}>`, embeds: [inviteEmbed], components: [boosterActionRow] });
    }
}

// ==========================================
// 3. MENU VIP NÂNG CẠO (SANG TRỌNG & TỐI GIẢN)
// ==========================================
function createVipControlPanel(channelId) {
    const embed = new EmbedBuilder()
        .setColor('#D4AF37')
        .setAuthor({ name: 'C O N T R O L   C E N T E R' })
        .setTitle('👑 BẢNG ĐIỀU KHIỂN VOICE VIP EXECUTIVE')
        .setDescription(
            `Trung tâm quản trị không gian riêng <#${channelId}>:\n\n` +
            `🔒 **Quyền vào:** Khóa/Mở kết nối chung cho người ngoài.\n` +
            `➕ **Duyệt bạn:** Cấp quyền kết nối cho 1 thành viên chỉ định.\n` +
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
        new ButtonBuilder().setCustomId(`vip_allowuser_${channelId}`).setLabel('➕ Duyệt Bạn Vào').setStyle(ButtonStyle.Primary),
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
        new ButtonBuilder().setCustomId(`vip_limit5_${channelId}`).setLabel('👥 Limit 5').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`vip_unlimit_${channelId}`).setLabel('🔄 Vô Hạn').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`vip_delete_${channelId}`).setLabel('❌ Xóa Phòng').setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row1, row2, row3] };
}

// ==========================================
// 4. LỆNH !menuvip TRONG CHAT
// ==========================================
async function handleMenuVipCommand(message) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return await message.reply('❌ Bạn phải tham gia vào phòng Voice VIP của mình để gọi bảng điều khiển!');
    if (voiceChannel.parentId !== process.env.BOOSTER_CATEGORY_ID) return await message.reply('❌ Kênh voice hiện tại không phải thuộc khu vực Voice VIP!');

    const hasPermission = voiceChannel.permissionsFor(message.author).has(PermissionsBitField.Flags.ManageChannels);
    if (!hasPermission) return await message.reply('❌ Bạn không phải chủ sở hữu không gian VIP này!');

    const panel = createVipControlPanel(voiceChannel.id);
    await message.channel.send(panel);
}

// ==========================================
// 5. XỬ LÝ INTERACTION (MODAL & BUTTONS)
// ==========================================
async function handleBoostTicketInteraction(interaction) {
    const customId = interaction.customId || '';

    // A. Modal khởi tạo phòng
    if (interaction.isButton() && customId === 'boost_voice_modal_trigger') {
        if (!interaction.member.premiumSince && interaction.user.id !== process.env.ADMIN_ID) {
            return await interaction.reply({
                content: `❌ **Yêu cầu đặc quyền:** Quyền khởi tạo chỉ dành riêng cho **Nitro Booster**!`,
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const modal = new ModalBuilder().setCustomId('boost_voice_modal_submit').setTitle('Khởi Tạo Không Gian VIP');
        const roomNameInput = new TextInputBuilder()
            .setCustomId('voice_room_name_input')
            .setLabel("Nhập danh xưng phòng độc quyền:")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ví dụ: Executive Lounge")
            .setMinLength(2)
            .setMaxLength(25)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(roomNameInput));
        return await interaction.showModal(modal);
    }

    // B. Xử lý tạo phòng từ Form Modal Submit
    if (interaction.isModalSubmit() && customId === 'boost_voice_modal_submit') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const roomName = interaction.fields.getTextInputValue('voice_room_name_input');
        const vipCategoryId = process.env.BOOSTER_CATEGORY_ID;
        const vipCategory = interaction.guild.channels.cache.get(vipCategoryId);

        if (!vipCategory) {
            return await interaction.editReply({ content: '❌ Cấu hình danh mục (Category) VIP chưa khả dụng trên server.' });
        }

        try {
            const staffRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'bò quản trị');

            const permissionOverwrites = [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.Connect],
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.Speak,
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.MoveMembers,
                        PermissionFlagsBits.MuteMembers
                    ],
                }
            ];

            if (staffRole) {
                permissionOverwrites.push({
                    id: staffRole.id,
                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Speak],
                });
            }

            const vipVoiceChannel = await interaction.guild.channels.create({
                name: `💎｜${roomName}`,
                type: ChannelType.GuildVoice,
                parent: vipCategoryId,
                permissionOverwrites: permissionOverwrites,
            });

            const panel = createVipControlPanel(vipVoiceChannel.id);
            return await interaction.editReply({
                content: `✅ **Khởi tạo thành công!** Phòng vĩnh viễn đã sẵn sàng tại **${vipCategory.name}**.\n👉 Truy cập ngay tại đây: <#${vipVoiceChannel.id}>\n\n🔒 *Trạng thái: Đã khóa bảo mật.*`,
                embeds: panel.embeds,
                components: panel.components
            });
        } catch (error) {
            console.error(error);
            return await interaction.editReply({ content: '❌ Khởi tạo thất bại do lỗi hệ thống!' });
        }
    }

    // C. Modal đổi tên
    if (interaction.isModalSubmit() && customId.startsWith('vip_modal_rename_')) {
        const channelId = customId.replace('vip_modal_rename_', '');
        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel) return await interaction.reply({ content: '❌ Kênh không tồn tại!', flags: [MessageFlags.Ephemeral] });

        const newName = interaction.fields.getTextInputValue('vip_new_name_input');
        await channel.setName(`💎｜${newName}`);
        return await interaction.reply({ content: `✅ Đã cập nhật danh xưng mới: **💎｜${newName}**`, flags: [MessageFlags.Ephemeral] });
    }

    // D. Modal cấp quyền thành viên
    if (interaction.isModalSubmit() && customId.startsWith('vip_modal_allowuser_')) {
        const channelId = customId.replace('vip_modal_allowuser_', '');
        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel) return await interaction.reply({ content: '❌ Kênh không tồn tại!', flags: [MessageFlags.Ephemeral] });

        const userInput = interaction.fields.getTextInputValue('vip_user_id_input').trim().replace(/[<@!>]/g, '');
        try {
            const member = await interaction.guild.members.fetch(userInput);
            if (!member) return await interaction.reply({ content: '❌ Không tìm thấy người dùng!', flags: [MessageFlags.Ephemeral] });

            await channel.permissionOverwrites.edit(member.id, {
                Connect: true,
                ViewChannel: true
            });

            return await interaction.reply({ content: `✅ Đã duyệt quyền kết nối cho <@${member.id}>!`, flags: [MessageFlags.Ephemeral] });
        } catch (e) {
            return await interaction.reply({ content: '❌ ID hoặc Tag người dùng không hợp lệ!', flags: [MessageFlags.Ephemeral] });
        }
    }

    // E. Modal Kick thành viên
    if (interaction.isModalSubmit() && customId.startsWith('vip_modal_kick_')) {
        const channelId = customId.replace('vip_modal_kick_', '');
        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel) return await interaction.reply({ content: '❌ Kênh không tồn tại!', flags: [MessageFlags.Ephemeral] });

        const userInput = interaction.fields.getTextInputValue('vip_kick_user_input').trim().replace(/[<@!>]/g, '');
        try {
            const member = await interaction.guild.members.fetch(userInput);
            if (!member || member.voice.channelId !== channel.id) {
                return await interaction.reply({ content: '❌ Thành viên hiện không có mặt trong phòng voice!', flags: [MessageFlags.Ephemeral] });
            }

            await member.voice.disconnect();
            await channel.permissionOverwrites.delete(member.id).catch(() => null);

            return await interaction.reply({ content: `👢 Đã ngắt kết nối đối với <@${member.id}>!`, flags: [MessageFlags.Ephemeral] });
        } catch (e) {
            return await interaction.reply({ content: '❌ Định dạng tài khoản không hợp lệ hoặc thành viên đã thoát!', flags: [MessageFlags.Ephemeral] });
        }
    }

    if (interaction.replied || interaction.deferred) return;

    // F. Xử lý Nút lệnh Menu VIP
    if (interaction.isButton() && customId.startsWith('vip_')) {
        const parts = customId.split('_');
        const action = parts[1]; 
        const channelId = parts[2];

        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel) return await interaction.reply({ content: '❌ Không tìm thấy không gian voice!', flags: [MessageFlags.Ephemeral] });

        const isOwner = channel.permissionsFor(interaction.user).has(PermissionsBitField.Flags.ManageChannels) ||
                        interaction.user.id === process.env.ADMIN_ID;
                        
        if (!isOwner) return await interaction.reply({ content: '❌ Thao tác bị từ chối: Yêu cầu quyền Chủ Phòng!', flags: [MessageFlags.Ephemeral] });

        try {
            if (action === 'lock') {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { Connect: false });
                return await interaction.reply({ content: '🔒 Đã chuyển trạng thái: **Khóa riêng tư**.', flags: [MessageFlags.Ephemeral] });
            }
            if (action === 'unlock') {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { Connect: true });
                return await interaction.reply({ content: '🔓 Đã chuyển trạng thái: **Công khai**.', flags: [MessageFlags.Ephemeral] });
            }
            if (action === 'allowuser') {
                const modal = new ModalBuilder().setCustomId(`vip_modal_allowuser_${channelId}`).setTitle('Duyệt Cấp Quyền Kết Nối');
                const userInput = new TextInputBuilder()
                    .setCustomId('vip_user_id_input')
                    .setLabel("Nhập ID hoặc Tag người được cấp quyền:")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Ví dụ: 123456789012345678 hoặc @User")
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(userInput));
                return await interaction.showModal(modal);
            }
            if (action === 'kick') {
                const modal = new ModalBuilder().setCustomId(`vip_modal_kick_${channelId}`).setTitle('Ngắt Kết Nối Thành Viên');
                const userInput = new TextInputBuilder()
                    .setCustomId('vip_kick_user_input')
                    .setLabel("Nhập ID hoặc Tag người cần đuổi:")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Ví dụ: @User")
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(userInput));
                return await interaction.showModal(modal);
            }
            if (action === 'muteall') {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { Speak: false });
                return await interaction.reply({ content: '🔇 Đã vô hiệu hóa Micro đối với thành viên thường.', flags: [MessageFlags.Ephemeral] });
            }
            if (action === 'unmuteall') {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { Speak: true });
                return await interaction.reply({ content: '🎙️ Đã khôi phục quyền phát thanh toàn phòng.', flags: [MessageFlags.Ephemeral] });
            }
            if (action === 'hide') {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { ViewChannel: false });
                return await interaction.reply({ content: '👁️ Đã ẩn phòng khỏi danh sách hiển thị.', flags: [MessageFlags.Ephemeral] });
            }
            if (action === 'unhide') {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { ViewChannel: true });
                return await interaction.reply({ content: '👀 Đã công khai hiển thị phòng.', flags: [MessageFlags.Ephemeral] });
            }
            if (action === 'rename') {
                const modal = new ModalBuilder().setCustomId(`vip_modal_rename_${channelId}`).setTitle('Thay Đổi Danh Xưng VIP');
                const nameInput = new TextInputBuilder()
                    .setCustomId('vip_new_name_input')
                    .setLabel("Nhập tên phòng mới:")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Nhập danh xưng tại đây...")
                    .setMinLength(2)
                    .setMaxLength(25)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                return await interaction.showModal(modal);
            }
            if (action === 'limit5') {
                await channel.setUserLimit(5);
                return await interaction.reply({ content: '👥 Giới hạn số lượng kết nối: **5 người**.', flags: [MessageFlags.Ephemeral] });
            }
            if (action === 'unlimit') {
                await channel.setUserLimit(0);
                return await interaction.reply({ content: '🔄 Giới hạn kết nối: **Vô hạn**.', flags: [MessageFlags.Ephemeral] });
            }
            if (action === 'delete') {
                await interaction.reply({ content: '🗑️ Đang tiến hành giải phóng phòng Voice VIP theo lệnh...', flags: [MessageFlags.Ephemeral] });
                return await channel.delete('Chủ phòng thực hiện xóa chủ động.');
            }
        } catch (err) {
            return await interaction.reply({ content: '❌ Thao tác bất thành, vui lòng thử lại sau!', flags: [MessageFlags.Ephemeral] });
        }
    }

    // G. Ticket Role thiết kế riêng
    if (interaction.isButton() && customId === 'boost_ticket_create') {
        if (!interaction.member.premiumSince && interaction.user.id !== process.env.ADMIN_ID) {
            return await interaction.reply({
                content: `❌ **Lỗi đặc quyền:** Yêu cầu quyền **Nitro Booster**!`,
                flags: [MessageFlags.Ephemeral] 
            });
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

            await interaction.reply({ content: `✅ Đã khởi tạo kênh tiếp nhận tại: <#${ticketChannel.id}>.`, flags: [MessageFlags.Ephemeral] });

            const welcomeTicketEmbed = new EmbedBuilder()
                .setColor('#D4AF37')
                .setTitle(`🎫 TIẾP NHẬN THIẾT KẾ DANH HIỆU VIP`)
                .setDescription(`Chào mừng thành viên <@${interaction.user.id}>!\n\nVui lòng cung cấp thông tin thiết kế:\n1. **Tên Danh Hiệu (Role):** [Điền tên]\n2. **Mã màu thiết kế (Hex):** [#ff0000]\n\n*Ban quản trị sẽ cập nhật danh hiệu cho bạn trong thời gian sớm nhất.*`);

            await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [welcomeTicketEmbed] });
        } catch (error) {
            if (!interaction.replied) await interaction.reply({ content: '❌ Không thể khởi tạo kênh hỗ trợ!', flags: [MessageFlags.Ephemeral] });
        }
    }
}

// ==========================================
// 6. PHÂN BIỆT DỌN DẸP AN TOÀN (SỬA LỖI XÓA NHẦM KÊNH CỐ ĐỊNH)
// ==========================================
async function checkAndCleanVipRoom(oldState, newState) {
    if (!oldState.channelId) return;

    const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);
    if (!oldChannel) return;

    // Chỉ kiểm tra khi phòng trống hoàn toàn 0 người
    if (oldChannel.members.size === 0) {
        
        // 🛑 1. GIỮ NGUYÊN PHÒNG VOICE VIP (Thuộc Danh Mục Booster VIP)
        if (process.env.BOOSTER_CATEGORY_ID && oldChannel.parentId === process.env.BOOSTER_CATEGORY_ID) {
            return; 
        }

        // 🛑 2. GIỮ NGUYÊN KÊNH TẠO PHÒNG GỐC (Click to Create)
        if (oldChannel.id === process.env.VOICEMASTER_CHANNEL_ID) {
            return;
        }

        // ⚡ 3. NHẬN DIỆN PHÒNG TẠM THỜI DO VOICEMASTER TẠO RA:
        const isVoiceMasterCategory = process.env.VOICEMASTER_CATEGORY_ID && oldChannel.parentId === process.env.VOICEMASTER_CATEGORY_ID;
        const isVoiceMasterName = oldChannel.name.includes('Phòng của') || oldChannel.name.includes('Room của');

        // 🛡️ BẢO VỆ: Nếu KHÔNG PHẢI phòng do VoiceMaster tạo ra -> Giữ nguyên phòng cố định của server!
        if (!isVoiceMasterCategory && !isVoiceMasterName) {
            return;
        }

        // 👉 Nếu chính xác là phòng tạm VoiceMaster thì tiến hành xóa dọn dẹp
        try {
            await oldChannel.delete('Dọn dẹp phòng tạm thời VoiceMaster khi trống thành viên.');
        } catch (err) {
            // Bỏ qua nếu phòng đã bị xóa trước đó
        }
    }
}

module.exports = { 
    handleServerBoost, 
    handleBoostTicketInteraction, 
    checkAndCleanVipRoom, 
    handleMenuVipCommand, 
    handleSpawnVipRoomCommand 
};