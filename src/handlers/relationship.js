const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    MessageFlags, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Đường dẫn tới các tệp cơ sở dữ liệu JSON
const dbPath = path.join(process.cwd(), 'profiles.json');
const moneyDbPath = path.join(process.cwd(), 'money.json');

// 💍 DANH SÁCH NHẪN TRONG CỬA HÀNG (SHOP NHẪN)
const RING_SHOP = [
    { id: 'co_4_la', name: 'Cỏ 4 Lá', emoji: '🍀', price: 50000, buff: 1.1, desc: 'May mắn & Thuần khiết' },
    { id: 'thach_anh_hong', name: 'Thạch Anh Hồng', emoji: '🌸', price: 200000, buff: 1.25, desc: 'Gắn kết trái tim ngọt ngào' },
    { id: 'nhan_bac', name: 'Nhẫn Bạc Đính Kim', emoji: '💍', price: 500000, buff: 1.5, desc: 'Lấp lánh tình yêu đôi lứa' },
    { id: 'orchid', name: 'Orchid', emoji: '🪷', price: 1000000, buff: 2.0, desc: 'Quyến rũ & Tinh tế (Cao cấp)' },
    { id: 'vuong_mien', name: 'Vương Miện Vĩnh Cửu', emoji: '👑', price: 5000000, buff: 3.5, desc: 'Tình yêu trường tồn bất diệt' }
];

// 🎯 KHO DATA GIF ANIME MẶC ĐỊNH DÀNH CHO CÁC CỬ CHỈ
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

// 📄 HÀM ĐỌC / GHI CƠ SỞ DỮ LIỆU PROFILES.JSON
function readDatabase() {
    try {
        if (!fs.existsSync(dbPath)) return {};
        const raw = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(raw || '{}');
    } catch (error) {
        console.error('Lỗi đọc profiles.json:', error);
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

// 💵 HÀM ĐỌC / GHI VÀ THAO TÁC TRÊN MONEY.JSON
function readMoneyDatabase() {
    try {
        if (!fs.existsSync(moneyDbPath)) return {};
        const raw = fs.readFileSync(moneyDbPath, 'utf8');
        return JSON.parse(raw || '{}');
    } catch (error) {
        console.error('Lỗi đọc money.json:', error);
        return {};
    }
}

function writeMoneyDatabase(data) {
    try {
        fs.writeFileSync(moneyDbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Lỗi ghi money.json:', error);
    }
}

// Lấy số dư ví tiền từ money.json (Hỗ trợ dạng số trực tiếp hoặc Object { money / coins / cash })
function getUserMoney(userId) {
    const moneyDb = readMoneyDatabase();
    const userData = moneyDb[userId];
    if (typeof userData === 'number') return userData;
    if (typeof userData === 'object' && userData !== null) {
        return userData.money ?? userData.coins ?? userData.cash ?? 0;
    }
    return 0;
}

// Trừ tiền mua nhẫn trực tiếp trong money.json
function deductUserMoney(userId, amount) {
    const moneyDb = readMoneyDatabase();
    if (!moneyDb[userId]) moneyDb[userId] = { money: 0 };

    if (typeof moneyDb[userId] === 'number') {
        moneyDb[userId] -= amount;
    } else if (typeof moneyDb[userId] === 'object' && moneyDb[userId] !== null) {
        if ('money' in moneyDb[userId]) {
            moneyDb[userId].money -= amount;
        } else if ('coins' in moneyDb[userId]) {
            moneyDb[userId].coins -= amount;
        } else if ('cash' in moneyDb[userId]) {
            moneyDb[userId].cash -= amount;
        } else {
            moneyDb[userId].money = -amount;
        }
    }
    writeMoneyDatabase(moneyDb);
}

// Khởi tạo thông tin mặc định cho user nếu chưa tồn tại trong profiles.json
function ensureUserExists(db, userId) {
    if (!db[userId]) {
        db[userId] = {
            customGifs: {},
            relationships: { totinh: null, kethon: null, banthan: null },
            inventory: [
                { ringId: 'co_4_la', name: 'Cỏ 4 Lá', emoji: '🍀' } // Nhẫn mặc định khi bắt đầu
            ],
            marriageData: null
        };
    }
    if (!db[userId].inventory) db[userId].inventory = [{ ringId: 'co_4_la', name: 'Cỏ 4 Lá', emoji: '🍀' }];
    if (!db[userId].relationships) db[userId].relationships = { totinh: null, kethon: null, banthan: null };
    return db[userId];
}

function formatNumber(num) {
    return (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getMarriedDays(marriedAt) {
    const diffTime = Math.abs(new Date() - new Date(marriedAt));
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getMarriedDateFormatted(marriedAt) {
    const date = new Date(marriedAt);
    const months = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];
    return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

function setUserCustomGif(userId, actionType, gifUrl) {
    const db = readDatabase();
    ensureUserExists(db, userId);
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
    ensureUserExists(db, user1Id);
    ensureUserExists(db, user2Id);

    db[user1Id].relationships[type] = user2Id;
    db[user2Id].relationships[type] = user1Id;

    // Nếu mối quan hệ là Kết Hôn, tạo thêm dữ liệu hôn nhân
    if (type === 'kethon') {
        const defaultMarriageData = {
            marriedAt: new Date().toISOString(),
            ring: { ringId: 'co_4_la', name: 'Cỏ 4 Lá', emoji: '🍀' },
            lovePoints: 100,
            streakDays: 1,
            lastInteractedAt: new Date().toISOString(),
            quote: '𝒩𝑜𝓌 𝓀𝒾𝓈𝓈! (´・ω・`) ♡',
            wallpaper: null
        };
        db[user1Id].marriageData = { ...defaultMarriageData };
        db[user2Id].marriageData = { ...defaultMarriageData };
    }

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

    if (type === 'kethon') {
        db[userId].marriageData = null;
        if (db[partnerId]) db[partnerId].marriageData = null;
    }

    writeDatabase(db);
    return partnerId;
}

async function createMarriageCardEmbed(client, user, partnerUser, marriageData) {
    const marriedDays = getMarriedDays(marriageData.marriedAt);
    const marriedDateStr = getMarriedDateFormatted(marriageData.marriedAt);
    const ringInfo = marriageData.ring || { name: 'Cỏ 4 Lá', emoji: '🍀' };

    const embed = new EmbedBuilder()
        .setColor('#381b2a')
        .setAuthor({
            name: `💖 ${user.username} đang hạnh phúc với ${partnerUser ? partnerUser.username : 'Người ấy'}`,
            iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setDescription(
            `📅 **Ngày kết hôn :** ${marriedDateStr} (${marriedDays} ngày)\n` +
            `💒 **Nhẫn đính hôn :** ${ringInfo.emoji} **${ringInfo.name}**\n` +
            `💒 **Điểm yêu thương :** **${formatNumber(marriageData.lovePoints)}** 🍬\n` +
            `🔥 **Chuỗi Thân mật :** **${marriageData.streakDays} ngày**\n\n` +
            `│ *${marriageData.quote || '𝒩𝑜𝓌 𝓀𝒾𝓈𝓈! (´・ω・`) ♡'}*`
        )
        .setThumbnail(partnerUser ? partnerUser.displayAvatarURL({ dynamic: true, size: 256 }) : null);

    if (marriageData.wallpaper) {
        embed.setImage(marriageData.wallpaper);
    } else if (partnerUser) {
        embed.setImage(partnerUser.displayAvatarURL({ dynamic: true, size: 512 }));
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`rel_card_gift_${user.id}_${partnerUser ? partnerUser.id : ''}`)
            .setLabel('Tặng Quà')
            .setEmoji('✨')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`rel_card_changering_${user.id}_${partnerUser ? partnerUser.id : ''}`)
            .setLabel('Đổi nhẫn')
            .setEmoji('💍')
            .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

const buildActionCommand = (name, description) => {
    return new SlashCommandBuilder()
        .setName(name)
        .setDescription(description)
        .addUserOption(opt => opt.setName('user').setDescription('Người bạn muốn thực hiện hành động').setRequired(true))
        .addStringOption(opt => opt.setName('link_gif').setDescription('Dùng tạm 1 link GIF cho lần này (Ghi đè cài đặt)').setRequired(false));
};

const commandsData = [
    // --- ⚙️ LỆNH CÀI ĐẶT GIF CÁ NHÂN ---
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

    // --- 💍 LỆNH MỐI QUAN HỆ & HỒ SƠ ---
    new SlashCommandBuilder()
        .setName('totinh')
        .setDescription('Gửi lời tỏ tình ngọt ngào 💖')
        .addUserOption(opt => opt.setName('user').setDescription('Người bạn muốn tỏ tình').setRequired(true))
        .addStringOption(opt => opt.setName('loinhan').setDescription('Lời nhắn tình cảm').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('kethon')
        .setDescription('Cầu hôn người ấy với nhẫn ước hẹn 💍')
        .addUserOption(opt => opt.setName('user').setDescription('Người bạn muốn cầu hôn').setRequired(true))
        .addStringOption(opt => opt.setName('loinhan').setDescription('Lời thề nguyện').setRequired(false)),

    new SlashCommandBuilder()
        .setName('banthan')
        .setDescription('Mời kết bạn thân / tri kỷ 🤝')
        .addUserOption(opt => opt.setName('user').setDescription('Người bạn muốn kết làm bạn thân').setRequired(true)),

    new SlashCommandBuilder()
        .setName('ket-hon')
        .setDescription('💒 Xem thẻ hồ sơ kết hôn / tình yêu lãng mạn giống mẫu')
        .addUserOption(opt => opt.setName('user').setDescription('Xem hồ sơ của ai (Mặc định là bản thân)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('shop-nhan')
        .setDescription('🛍️ Cửa hàng nhẫn đính hôn cao cấp cho cặp đôi'),

    new SlashCommandBuilder()
        .setName('setquote')
        .setDescription('✍️ Thay đổi câu châm ngôn/lời chúc ngọt ngào trên thẻ kết hôn')
        .addStringOption(opt => opt.setName('text').setDescription('Lời chúc mới của hai bạn').setRequired(true)),

    new SlashCommandBuilder()
        .setName('huymoquanhe')
        .setDescription('💔 Hủy bỏ một mối quan hệ hiện tại (Ly hôn/Trở về độc thân)')
        .addStringOption(opt => opt.setName('loai').setDescription('Chọn mối quan hệ muốn hủy').setRequired(true)
            .addChoices(
                { name: '💖 Tỏ tình / Người yêu', value: 'totinh' },
                { name: '💍 Kết hôn / Bạn đời', value: 'kethon' },
                { name: '🤝 Bạn thân / Tri kỷ', value: 'banthan' }
            )),

    // --- 🎭 LỆNH CỬ CHỈ THÂN MẬT ---
    buildActionCommand('om', 'Trao một cái ôm ấm áp 🤗'),
    buildActionCommand('hon', 'Trao một nụ hôn ngọt ngào 💋'),
    buildActionCommand('xoadau', 'Xoa đầu cưng nựng 🫳'),
    buildActionCommand('veoma', 'Véo má đáng yêu 🤏'),
    buildActionCommand('namtay', 'Nắm lấy tay nhau 🤝')
].map(cmd => cmd.toJSON());

async function handleRelationshipInteraction(interaction) {
    if (interaction.isChatInputCommand()) {
        const { commandName, user, options, client } = interaction;
        const db = readDatabase();
        ensureUserExists(db, user.id);

        // --- ⚙️ /SETGIF ---
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

        // --- ⚙️ /UNSETGIF ---
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

        // --- 💖 /TOTINH ---
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

        // --- 💍 /KETHON ---
        if (commandName === 'kethon') {
            const targetUser = options.getUser('user');
            const loinhan = options.getString('loinhan') || 'Cùng nắm tay nhau đi hết quãng đường còn lại nhé! 💍';

            if (targetUser.id === user.id) return interaction.reply({ content: '❌ Bạn không thể tự kết hôn với chính mình!', flags: MessageFlags.Ephemeral });
            if (targetUser.bot) return interaction.reply({ content: '❌ Bot không thể kết hôn!', flags: MessageFlags.Ephemeral });

            const userRel = db[user.id]?.relationships?.kethon;
            const targetRel = db[targetUser.id]?.relationships?.kethon;
            if (userRel || targetRel) {
                return interaction.reply({ content: '❌ Một trong hai người đã có người chung chăn gối rồi!', flags: MessageFlags.Ephemeral });
            }

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

        // --- 🤝 /BANTHAN ---
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

        // --- 💒 /KET-HON (XEM HỒ SƠ) ---
        if (commandName === 'ket-hon') {
            const targetUser = options.getUser('user') || user;
            ensureUserExists(db, targetUser.id);

            const marriageData = db[targetUser.id]?.marriageData;
            const partnerId = db[targetUser.id]?.relationships?.kethon;

            if (!marriageData || !partnerId) {
                return interaction.reply({
                    content: targetUser.id === user.id 
                        ? '💔 Bạn chưa kết hôn với ai cả. Hãy dùng lệnh `/kethon @nguoi_ay` để cầu hôn nhé!' 
                        : `💔 **${targetUser.username}** hiện vẫn đang độc thân.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const partnerUser = await client.users.fetch(partnerId).catch(() => null);
            const cardData = await createMarriageCardEmbed(client, targetUser, partnerUser, marriageData);
            return interaction.reply(cardData);
        }

        // --- 🛍️ /SHOP-NHAN ---
        if (commandName === 'shop-nhan') {
            ensureUserExists(db, user.id);
            const currentBalance = getUserMoney(user.id);

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('💍 CỬA HÀNG NHẪN ĐÍNH HÔN CAO CẤP')
                .setDescription(`💰 Số dư trong ví: **${formatNumber(currentBalance)} Xu** *(Đồng bộ từ money.json)*\nChọn một chiếc nhẫn bên dưới để mua và lưu vào kho đồ của bạn!`)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3028/3028308.png');

            const selectOptions = RING_SHOP.map(r => ({
                label: r.name,
                description: `${formatNumber(r.price)} Xu • Buff: x${r.buff} điểm (${r.desc})`,
                value: r.id,
                emoji: r.emoji
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`shop_buy_ring_${user.id}`)
                .setPlaceholder('--- Chọn nhẫn bạn muốn mua ---')
                .addOptions(selectOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
        }

        // --- ✍️ /SETQUOTE ---
        if (commandName === 'setquote') {
            const quoteText = options.getString('text');
            const marriageData = db[user.id]?.marriageData;
            const partnerId = db[user.id]?.relationships?.kethon;

            if (!marriageData || !partnerId) {
                return interaction.reply({ content: '❌ Bạn chưa kết hôn nên không thể chỉnh sửa lời chúc!', flags: MessageFlags.Ephemeral });
            }

            marriageData.quote = quoteText;
            if (db[partnerId] && db[partnerId].marriageData) {
                db[partnerId].marriageData.quote = quoteText;
            }
            writeDatabase(db);

            return interaction.reply({ content: `✅ Đã cập nhật lời chúc trên thẻ kết hôn thành:\n*"${quoteText}"*`, flags: MessageFlags.Ephemeral });
        }

        // --- 💔 /HUYMOQUANHE ---
        if (commandName === 'huymoquanhe') {
            const type = options.getString('loai');
            const partnerId = removeRelationship(user.id, type);

            if (!partnerId) {
                return interaction.reply({ content: '❌ Bạn hiện tại không có mối quan hệ này để hủy!', flags: MessageFlags.Ephemeral });
            }

            const typeNames = { totinh: '💖 Người yêu', kethon: '💍 Bạn đời', banthan: '🤝 Bạn thân' };
            return interaction.reply({ content: `💔 Đã hủy mối quan hệ **${typeNames[type]}** với <@${partnerId}> thành công.` });
        }

        // --- 🎭 XỬ LÝ LỆNH CỬ CHỈ ---
        if (ACTION_DATA[commandName]) {
            const targetUser = options.getUser('user');
            const inputGif = options.getString('link_gif');
            const savedGif = getUserCustomGif(user.id, commandName);

            if (targetUser.id === user.id) {
                return interaction.reply({ 
                    content: '❌ Bạn không thể tự thực hiện hành động này với chính mình đâu!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            if (Math.random() < 0.05) {
                return interaction.reply({
                    content: 't chán làm việc này rồi >:(, tydc cái éo gì'
                });
            }

            const action = ACTION_DATA[commandName];
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

    // --- 🔘 XỬ LÝ TƯƠNG TÁC NÚT BẤM ---
    if (interaction.isButton()) {
        const customId = interaction.customId;
        const db = readDatabase();

        // 1. Đồng ý / Từ chối lời mời
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
                    desc = `💍 <@${senderId}> và ${interaction.user} đã chính thức kết duyên vợ chồng! Hãy dùng lệnh \`/ket-hon\` để mở thẻ thiệp cưới.`;
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

        // 2. Nút "Tặng Quà" trên Card Kết hôn
        if (customId.startsWith('rel_card_gift_')) {
            const parts = customId.split('_');
            const user1Id = parts[3];
            const user2Id = parts[4];

            if (interaction.user.id !== user1Id && interaction.user.id !== user2Id) {
                return interaction.reply({ content: '❌ Bạn không phải là người trong cuộc hôn nhân này!', flags: MessageFlags.Ephemeral });
            }

            const marriageData = db[user1Id]?.marriageData;
            if (!marriageData) return interaction.reply({ content: '❌ Mối quan hệ này không còn tồn tại.', flags: MessageFlags.Ephemeral });

            // Lấy hệ số nhẫn
            const ringShopItem = RING_SHOP.find(r => r.id === marriageData.ring?.ringId) || { buff: 1.0 };
            const addedPoints = Math.floor(1000 * ringShopItem.buff);

            marriageData.lovePoints = (marriageData.lovePoints || 0) + addedPoints;

            // Cập nhật streak ngày
            const now = new Date();
            const lastDate = new Date(marriageData.lastInteractedAt || now);
            const isNextDay = now.getDate() !== lastDate.getDate() || now.getMonth() !== lastDate.getMonth();

            if (isNextDay) {
                marriageData.streakDays = (marriageData.streakDays || 1) + 1;
            }
            marriageData.lastInteractedAt = now.toISOString();

            // Đồng bộ dữ liệu cho đối phương
            if (db[user2Id] && db[user2Id].marriageData) {
                db[user2Id].marriageData = { ...marriageData };
            }
            writeDatabase(db);

            const partnerId = interaction.user.id === user1Id ? user2Id : user1Id;
            const partnerUser = await interaction.client.users.fetch(partnerId).catch(() => null);
            const updatedCard = await createMarriageCardEmbed(interaction.client, interaction.user, partnerUser, marriageData);

            await interaction.update(updatedCard);
            return interaction.followUp({
                content: `✨ Bạn đã tặng quà cho người ấy! Cộng **+${formatNumber(addedPoints)}** Điểm yêu thương (Buff x${ringShopItem.buff} từ chiếc nhẫn **${marriageData.ring.name}**)!`,
                flags: MessageFlags.Ephemeral
            });
        }

        // 3. Nút "Đổi Nhẫn" trên Card Kết hôn
        if (customId.startsWith('rel_card_changering_')) {
            const parts = customId.split('_');
            const user1Id = parts[3];
            const user2Id = parts[4];

            if (interaction.user.id !== user1Id && interaction.user.id !== user2Id) {
                return interaction.reply({ content: '❌ Bạn không phải là người trong cuộc hôn nhân này!', flags: MessageFlags.Ephemeral });
            }

            const userData = ensureUserExists(db, interaction.user.id);
            if (!userData.inventory || userData.inventory.length === 0) {
                return interaction.reply({ content: '💼 Bạn chưa sở hữu nhẫn nào trong kho! Dùng lệnh `/shop-nhan` để mua nhé.', flags: MessageFlags.Ephemeral });
            }

            const options = userData.inventory.map((item, idx) => ({
                label: item.name,
                value: `${item.ringId}_${idx}`,
                emoji: item.emoji
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`equip_ring_select_${user1Id}_${user2Id}`)
                .setPlaceholder('Chọn chiếc nhẫn trong kho để đeo...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            return interaction.reply({
                content: '💍 Chọn chiếc nhẫn bạn muốn trang bị cho thiệp kết hôn:',
                components: [row],
                flags: MessageFlags.Ephemeral
            });
        }
    }

    // --- 📋 XỬ LÝ CHỌN SHOP NHẪN VÀ ĐEO NHẪN ---
    if (interaction.isStringSelectMenu()) {
        const customId = interaction.customId;
        const db = readDatabase();

        // 1. Chọn Mua Nhẫn từ Shop
        if (customId.startsWith('shop_buy_ring_')) {
            const selectedRingId = interaction.values[0];
            const ringItem = RING_SHOP.find(r => r.id === selectedRingId);
            const userData = ensureUserExists(db, interaction.user.id);
            const currentBalance = getUserMoney(interaction.user.id);

            if (currentBalance < ringItem.price) {
                return interaction.reply({
                    content: `❌ Bạn không đủ Xu trong ví! Cần **${formatNumber(ringItem.price)} Xu** nhưng bạn chỉ có **${formatNumber(currentBalance)} Xu** trong \`money.json\`.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Trừ tiền trực tiếp vào money.json
            deductUserMoney(interaction.user.id, ringItem.price);

            // Thêm nhẫn vào kho đồ trong profiles.json
            userData.inventory.push({
                ringId: ringItem.id,
                name: ringItem.name,
                emoji: ringItem.emoji
            });
            writeDatabase(db);

            const newBalance = getUserMoney(interaction.user.id);

            return interaction.reply({
                content: `🎉 Chúc mừng bạn đã mua thành công **${ringItem.emoji} ${ringItem.name}** với giá **${formatNumber(ringItem.price)} Xu**!\n💰 Số dư ví hiện tại: **${formatNumber(newBalance)} Xu** (Đã thanh toán qua \`money.json\`).`,
                flags: MessageFlags.Ephemeral
            });
        }

        // 2. Trang bị Nhẫn từ Kho đồ
        if (customId.startsWith('equip_ring_select_')) {
            const parts = customId.split('_');
            const user1Id = parts[3];
            const user2Id = parts[4];

            const selectedValue = interaction.values[0].split('_')[0];
            const ringShopItem = RING_SHOP.find(r => r.id === selectedValue) || { name: 'Cỏ 4 Lá', emoji: '🍀', id: 'co_4_la' };

            const mData1 = db[user1Id]?.marriageData;
            const mData2 = db[user2Id]?.marriageData;

            if (mData1) mData1.ring = { ringId: ringShopItem.id, name: ringShopItem.name, emoji: ringShopItem.emoji };
            if (mData2) mData2.ring = { ringId: ringShopItem.id, name: ringShopItem.name, emoji: ringShopItem.emoji };

            writeDatabase(db);

            return interaction.update({
                content: `✅ Đã đổi nhẫn đính hôn thành **${ringShopItem.emoji} ${ringShopItem.name}** thành công! Mở lại \`/ket-hon\` để xem thay đổi.`,
                components: []
            });
        }
    }
}

module.exports = {
    commandsData,
    handleInteraction: handleRelationshipInteraction,
    handleRelationshipInteraction
};