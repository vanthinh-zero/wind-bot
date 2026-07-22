const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'profiles.json');

// 🎯 KHO DATA GIF ANIME MẶC ĐỊNH
const ACTION_DATA = {
    om: {
        title: '🤗 CÁI ÔM ẤM ÁP',
        color: '#FFB6C1',
        gifs: [
            'https://nekos.best/api/v2/hug/0001.gif',
            'https://nekos.best/api/v2/hug/0005.gif',
            'https://nekos.best/api/v2/hug/0012.gif',
            'https://nekos.best/api/v2/hug/0018.gif'
        ],
        messages: [
            'đã chạy đến ôm chầm lấy',
            'đã trao một cái ôm thật chặt và ấm áp cho',
            'dúi đầu vào vai và ôm siết lấy',
            'sà vào lòng và ôm chặt'
        ]
    },
    hon: {
        title: '💋 NỤ HÔN NGỌT NGÀO',
        color: '#FF1493',
        gifs: [
            'https://nekos.best/api/v2/kiss/0001.gif',
            'https://nekos.best/api/v2/kiss/0008.gif',
            'https://nekos.best/api/v2/kiss/0015.gif',
            'https://nekos.best/api/v2/kiss/0022.gif'
        ],
        messages: [
            'nhẹ nhàng đặt một nụ hôn lên má',
            'trao một nụ hôn nồng thắm cho',
            'bất ngờ hôn nhẹ lên trán của',
            'kiễng chân trao một nụ hôn ngọt ngào cho'
        ]
    },
    xoadau: {
        title: '🫳 XOA ĐẦU CƯNG NỰNG',
        color: '#FFD700',
        gifs: [
            'https://nekos.best/api/v2/pat/0002.gif',
            'https://nekos.best/api/v2/pat/0009.gif',
            'https://nekos.best/api/v2/pat/0014.gif'
        ],
        messages: [
            'xoa đầu nũng nịu',
            'nhẹ nhàng đưa tay xoa đầu cưng nựng',
            'xoa xoa mái tóc xinh đẹp của',
            'vỗ nhẹ lên đầu và mỉm cười với'
        ]
    },
    veoma: {
        title: '🤏 VÉO MÁ ĐÁNG YÊU',
        color: '#FFA07A',
        gifs: [
            'https://i.postimg.cc/mD83S8gX/pinch1.gif',
            'https://i.postimg.cc/8PzS6xZk/pinch2.gif'
        ],
        messages: [
            'véo nhẹ đôi má phúng phính của',
            'nắm lấy hai má và kéo nhẹ',
            'trêu ghẹo bằng cách nắn nắn má của'
        ]
    },
    namtay: {
        title: '🤝 NẮM TAY ẤM ÁP',
        color: '#00FA9A',
        gifs: [
            'https://nekos.best/api/v2/handhold/0001.gif',
            'https://nekos.best/api/v2/handhold/0005.gif'
        ],
        messages: [
            'chủ động đan chặt tay vào tay',
            'nhẹ nhàng nắm lấy bàn tay nhỏ bé của',
            'kéo tay và dắt đi cùng'
        ]
    }
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function readDatabase() {
    try {
        if (!fs.existsSync(dbPath)) return {};
        const raw = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(raw || '{}');
    } catch (error) {
        return {};
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Lỗi ghi profiles.json:', error);
    }
}

// 📌 QUẢN LÝ TÙY CHỈNH GIF CÁ NHÂN
function setUserCustomGif(userId, actionType, gifUrl) {
    const db = readDatabase();
    if (!db[userId]) db[userId] = {};
    if (!db[userId].customGifs) db[userId].customGifs = {};

    db[userId].customGifs[actionType] = gifUrl;
    writeDatabase(db);
}

function unsetUserCustomGif(userId, actionType) {
    const db = readDatabase();
    if (!db[userId] || !db[userId].customGifs || !db[userId].customGifs[actionType]) return false;

    delete db[userId].customGifs[actionType];
    writeDatabase(db);
    return true;
}

function getUserCustomGif(userId, actionType) {
    const db = readDatabase();
    return db[userId]?.customGifs?.[actionType] || null;
}

function setRelationship(user1Id, user2Id, type) {
    const db = readDatabase();
    if (!db[user1Id]) db[user1Id] = {};
    if (!db[user2Id]) db[user2Id] = {};

    if (!db[user1Id].relationships) db[user1Id].relationships = { totinh: null, kethon: null, banthan: null };
    if (!db[user2Id].relationships) db[user2Id].relationships = { totinh: null, kethon: null, banthan: null };

    db[user1Id].relationships[type] = user2Id;
    db[user2Id].relationships[type] = user1Id;

    writeDatabase(db);
}

function removeRelationship(userId, type) {
    const db = readDatabase();
    if (!db[userId] || !db[userId].relationships || !db[userId].relationships[type]) return null;

    const partnerId = db[userId].relationships[type];
    db[userId].relationships[type] = null;

    if (db[partnerId] && db[partnerId].relationships) {
        db[partnerId].relationships[type] = null;
    }

    writeDatabase(db);
    return partnerId;
}

const buildActionCommand = (name, description) => {
    return new SlashCommandBuilder()
        .setName(name)
        .setDescription(description)
        .addUserOption(opt => opt.setName('user').setDescription('Người bạn muốn thực hiện hành động').setRequired(true))
        .addStringOption(opt => opt.setName('link_gif').setDescription('Dùng tạm 1 link GIF cho lần này (Ghi đè cài đặt)').setRequired(false));
};

const commandsData = [
    // --- LỆNH TÙY CHỈNH GIF CÁ NHÂN ---
    new SlashCommandBuilder()
        .setName('setgif')
        .setDescription('⚙️ Lưu link GIF mặc định cá nhân cho các cử chỉ')
        .addStringOption(opt => opt.setName('loai').setDescription('Chọn hành động cử chỉ').setRequired(true)
            .addChoices(
                { name: '💋 Nụ hôn (/hon)', value: 'hon' },
                { name: '🤗 Cái ôm (/om)', value: 'om' },
                { name: '🫳 Xoa đầu (/xoadau)', value: 'xoadau' },
                { name: '🤏 Véo má (/veoma)', value: 'veoma' },
                { name: '🤝 Nắm tay (/namtay)', value: 'namtay' }
            ))
        .addStringOption(opt => opt.setName('link_gif').setDescription('Dán URL ảnh/GIF trực tiếp vào đây').setRequired(true)),

    new SlashCommandBuilder()
        .setName('unsetgif')
        .setDescription('🗑️ Xóa GIF cá nhân đã lưu (quay về GIF mặc định)')
        .addStringOption(opt => opt.setName('loai').setDescription('Chọn hành động muốn xóa GIF').setRequired(true)
            .addChoices(
                { name: '💋 Nụ hôn (/hon)', value: 'hon' },
                { name: '🤗 Cái ôm (/om)', value: 'om' },
                { name: '🫳 Xoa đầu (/xoadau)', value: 'xoadau' },
                { name: '🤏 Véo má (/veoma)', value: 'veoma' },
                { name: '🤝 Nắm tay (/namtay)', value: 'namtay' }
            )),

    // --- LỆNH MỐI QUAN HỆ ---
    new SlashCommandBuilder()
        .setName('totinh')
        .setDescription('Gửi lời tỏ tình ngọt ngào 💖')
        .addUserOption(opt => opt.setName('user').setDescription('Người bạn muốn tỏ tình').setRequired(true))
        .addStringOption(opt => opt.setName('loinhan').setDescription('Lời nhắn tình cảm').setRequired(false)),
    new SlashCommandBuilder()
        .setName('kethon')
        .setDescription('Cầu hôn người ấy 💍')
        .addUserOption(opt => opt.setName('user').setDescription('Người bạn muốn cầu hôn').setRequired(true))
        .addStringOption(opt => opt.setName('loinhan').setDescription('Lời thề nguyện').setRequired(false)),
    new SlashCommandBuilder()
        .setName('banthan')
        .setDescription('Mời kết bạn thân / tri kỷ 🤝')
        .addUserOption(opt => opt.setName('user').setDescription('Người bạn muốn kết làm bạn thân').setRequired(true)),
    new SlashCommandBuilder()
        .setName('huymoquanhe')
        .setDescription('Hủy bỏ một mối quan hệ hiện tại')
        .addStringOption(opt => opt.setName('loai').setDescription('Chọn mối quan hệ muốn hủy').setRequired(true)
            .addChoices(
                { name: '💖 Tỏ tình / Người yêu', value: 'totinh' },
                { name: '💍 Kết hôn / Bạn đời', value: 'kethon' },
                { name: '🤝 Bạn thân / Tri kỷ', value: 'banthan' }
            )),

    // --- LỆNH CỬ CHỈ ---
    buildActionCommand('om', 'Trao một cái ôm ấm áp 🤗'),
    buildActionCommand('hon', 'Trao một nụ hôn ngọt ngào 💋'),
    buildActionCommand('xoadau', 'Xoa đầu cưng nựng 🫳'),
    buildActionCommand('veoma', 'Véo má đáng yêu 🤏'),
    buildActionCommand('namtay', 'Nắm lấy tay nhau 🤝')
].map(cmd => cmd.toJSON());

async function handleRelationshipInteraction(interaction) {
    if (interaction.isChatInputCommand()) {
        const { commandName, user, options } = interaction;

        // --- XỬ LÝ LỆNH /SETGIF ---
        if (commandName === 'setgif') {
            const actionType = options.getString('loai');
            const gifUrl = options.getString('link_gif');

            if (!gifUrl.startsWith('http://') && !gifUrl.startsWith('https://')) {
                return interaction.reply({ content: '❌ Link GIF không hợp lệ! Phải bắt đầu bằng `http://` hoặc `https://`', flags: MessageFlags.Ephemeral });
            }

            setUserCustomGif(user.id, actionType, gifUrl);
            return interaction.reply({
                content: `✅ Đã lưu GIF cá nhân cho lệnh **/${actionType}** thành công! Từ giờ khi dùng lệnh, GIF này sẽ luôn xuất hiện.`,
                flags: MessageFlags.Ephemeral
            });
        }

        // --- XỬ LÝ LỆNH /UNSETGIF ---
        if (commandName === 'unsetgif') {
            const actionType = options.getString('loai');
            const success = unsetUserCustomGif(user.id, actionType);

            if (!success) {
                return interaction.reply({ content: `❌ Bạn chưa từng cài đặt GIF cá nhân cho lệnh **/${actionType}**!`, flags: MessageFlags.Ephemeral });
            }

            return interaction.reply({
                content: `🗑️ Đã gỡ bỏ GIF cá nhân của lệnh **/${actionType}**. Lệnh sẽ dùng lại kho GIF mặc định!`,
                flags: MessageFlags.Ephemeral
            });
        }

        // --- LỆNH TỎ TÌNH ---
        if (commandName === 'totinh') {
            const targetUser = options.getUser('user');
            const loinhan = options.getString('loinhan') || 'Cậu có đồng ý trở thành một nửa ngọt ngào của tớ không? 🌸';

            if (targetUser.id === user.id) return interaction.reply({ content: '❌ Bạn không thể tự tỏ tình với chính mình!', flags: MessageFlags.Ephemeral });
            if (targetUser.bot) return interaction.reply({ content: '❌ Bot không thể đáp lại tình cảm!', flags: MessageFlags.Ephemeral });

            const expireTime = Math.floor((Date.now() + 60000) / 1000);

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('💖 LỜI TỎ TÌNH TỪ TRÁI TIM 💖')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(`Thành viên ${user} vừa gửi lời tỏ tình ngọt ngào đến ${targetUser}!`)
                .addFields(
                    { name: '💌 Lời Nhắn', value: `\`\`\`fix\n"${loinhan}"\`\`\``, inline: false },
                    { name: '⏳ Hạn Phản Hồi', value: `⏰ Lời mời sẽ hết hạn <t:${expireTime}:R>`, inline: false }
                )
                .setFooter({ text: 'Bấm nút bên dưới để phản hồi', iconURL: user.displayAvatarURL() })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rel_accept_totinh_${user.id}_${targetUser.id}`).setLabel('Đồng Ý 💕').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rel_refuse_totinh_${user.id}_${targetUser.id}`).setLabel('Từ Chối 💔').setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({ content: `${targetUser}, bạn có lời mời mới!`, embeds: [embed], components: [row] });
        }

        // --- LỆNH KẾT HÔN ---
        if (commandName === 'kethon') {
            const targetUser = options.getUser('user');
            const loinhan = options.getString('loinhan') || 'Cùng nắm tay nhau đi hết quãng đường còn lại nhé! 💍';

            if (targetUser.id === user.id) return interaction.reply({ content: '❌ Bạn không thể tự kết hôn với chính mình!', flags: MessageFlags.Ephemeral });
            if (targetUser.bot) return interaction.reply({ content: '❌ Bot không thể kết hôn!', flags: MessageFlags.Ephemeral });

            const expireTime = Math.floor((Date.now() + 60000) / 1000);

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('💍 LỄ CẦU HÔN TRỌNG ĐẠI 💍')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(`Thành viên ${user} đang quỳ gối ngỏ lời cầu hôn ${targetUser}!`)
                .addFields(
                    { name: '📜 Lời Thề Nguyện', value: `\`\`\`css\n"${loinhan}"\`\`\``, inline: false },
                    { name: '⏳ Hạn Phản Hồi', value: `⏰ Lời mời sẽ hết hạn <t:${expireTime}:R>`, inline: false }
                )
                .setFooter({ text: 'Lễ đường chứng giám tình yêu hai bạn', iconURL: user.displayAvatarURL() })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rel_accept_kethon_${user.id}_${targetUser.id}`).setLabel('Đồng Ý Kết Hôn 💍').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rel_refuse_kethon_${user.id}_${targetUser.id}`).setLabel('Từ Chối 🥀').setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({ content: `${targetUser}, lời cầu hôn dành cho bạn!`, embeds: [embed], components: [row] });
        }

        // --- LỆNH BẠN THÂN ---
        if (commandName === 'banthan') {
            const targetUser = options.getUser('user');

            if (targetUser.id === user.id) return interaction.reply({ content: '❌ Bạn không thể tự kết bạn thân với chính mình!', flags: MessageFlags.Ephemeral });
            if (targetUser.bot) return interaction.reply({ content: '❌ Không thể chọn Bot làm bạn thân!', flags: MessageFlags.Ephemeral });

            const expireTime = Math.floor((Date.now() + 60000) / 1000);

            const embed = new EmbedBuilder()
                .setColor('#00FFFF')
                .setTitle('🤝 LỜI MỜI KẾT BẠN THÂN 🤝')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(`${user} muốn mời ${targetUser} trở thành **Bạn Thân / Tri Kỷ**!`)
                .addFields({ name: '⏳ Hạn Phản Hồi', value: `⏰ Lời mời sẽ hết hạn <t:${expireTime}:R>`, inline: false })
                .setFooter({ text: 'Bấm nút bên dưới để phản hồi', iconURL: user.displayAvatarURL() })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rel_accept_banthan_${user.id}_${targetUser.id}`).setLabel('Đồng Ý 🤝').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`rel_refuse_banthan_${user.id}_${targetUser.id}`).setLabel('Từ Chối 🚫').setStyle(ButtonStyle.Secondary)
            );

            return interaction.reply({ content: `${targetUser}, bạn có lời mời kết bạn thân!`, embeds: [embed], components: [row] });
        }

        // --- LỆNH HỦY MỐI QUAN HỆ ---
        if (commandName === 'huymoquanhe') {
            const type = options.getString('loai');
            const partnerId = removeRelationship(user.id, type);

            if (!partnerId) {
                return interaction.reply({ content: '❌ Bạn hiện tại không có mối quan hệ này để hủy!', flags: MessageFlags.Ephemeral });
            }

            const typeNames = { totinh: '💖 Người yêu', kethon: '💍 Bạn đời', banthan: '🤝 Bạn thân' };
            return interaction.reply({ content: `💔 Đã hủy mối quan hệ **${typeNames[type]}** với <@${partnerId}> thành công.` });
        }

        // --- 🎭 XỬ LÝ CÁC LỆNH CỬ CHỈ THÂN MẬT ---
        if (ACTION_DATA[commandName]) {
            const targetUser = options.getUser('user');
            const inputGif = options.getString('link_gif'); // Link nhập đè tạm thời
            const savedGif = getUserCustomGif(user.id, commandName); // Link đã lưu trong DB

            if (targetUser.id === user.id) {
                return interaction.reply({ 
                    content: '❌ Bạn không thể tự thực hiện hành động này với chính mình đâu!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // 🎲 10% TỈ LỆ BOT GIẬN DỖI (EASTER EGG)
            if (Math.random() < 0.1) {
                return interaction.reply({
                    content: 't chán làm việc này rồi >:(, tydc cái éo gì'
                });
            }

            const action = ACTION_DATA[commandName];

            // 🔥 ƯU TIÊN: Link nhập đè > Link đã set trong database > GIF mặc định của Bot
            const selectedGif = inputGif || savedGif || getRandom(action.gifs);
            const selectedMsg = getRandom(action.messages);

            const embed = new EmbedBuilder()
                .setColor(action.color)
                .setAuthor({ 
                    name: action.title, 
                    iconURL: user.displayAvatarURL({ dynamic: true }) 
                })
                .setDescription(
                    `✨ **${user}** ${selectedMsg} **${targetUser}**!\n` +
                    `────────୨ৎ────────`
                )
                .setImage(selectedGif)
                .setFooter({ 
                    text: `Yêu thương tràn ngập • Dành riêng cho ${targetUser.displayName}`, 
                    iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
                })
                .setTimestamp();

            return await interaction.reply({ embeds: [embed] });
        }
    }

    // Xử lý nút bấm tương tác (Đồng ý / Từ chối)
    if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId.startsWith('rel_accept_') || customId.startsWith('rel_refuse_')) {
            const parts = customId.split('_');
            const action = parts[1];
            const type = parts[2];
            const senderId = parts[3];
            const targetId = parts[4];

            if (interaction.user.id !== targetId) {
                return interaction.reply({ content: '❌ Lời mời này không dành cho bạn!', flags: MessageFlags.Ephemeral });
            }

            if (action === 'refuse') {
                const embedRefuse = new EmbedBuilder()
                    .setColor('#FF3333')
                    .setTitle('💔 LỜI MỜI ĐÃ BỊ TỪ CHỐI')
                    .setDescription(`Rất tiếc, ${interaction.user} đã từ chối lời mời **${type}** từ <@${senderId}>.`);

                await interaction.update({ embeds: [embedRefuse], components: [] });
                return;
            }

            if (action === 'accept') {
                setRelationship(senderId, targetId, type);

                let title = '';
                let desc = '';
                let color = '#FF69B4';

                if (type === 'totinh') {
                    title = '🎉 TỎ TÌNH THÀNH CÔNG! 🎉';
                    desc = `💖 <@${senderId}> và ${interaction.user} đã chính thức trở thành người yêu của nhau!`;
                    color = '#FF1493';
                } else if (type === 'kethon') {
                    title = '💒 LỄ ĐƯỜNG CHÚC MỪNG HÔN LỄ! 💒';
                    desc = `💍 <@${senderId}> và ${interaction.user} đã chính thức kết duyên vợ chồng!`;
                    color = '#FFD700';
                } else if (type === 'banthan') {
                    title = '🤝 CHÚC MỪNG BẠN THÂN MỚI! 🤝';
                    desc = `✨ <@${senderId}> và ${interaction.user} đã chính thức trở thành bạn thân tri kỷ!`;
                    color = '#00FFFF';
                }

                const embedSuccess = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(title)
                    .setDescription(desc)
                    .setTimestamp();

                await interaction.update({ embeds: [embedSuccess], components: [] });
                return;
            }
        }
    }
}

module.exports = {
    commandsData,
    handleInteraction: handleRelationshipInteraction,
    handleRelationshipInteraction
};