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
const { ITEM_SHOP } = require('./shop'); // Import danh sách shop

const dbPath = path.join(process.cwd(), 'profiles.json');

const ACTION_DATA = {
    om: {
        title: '🤗 CÁI ÔM ẤM ÁP', color: '#FFB6C1',
        gifs: ['https://nekos.best/api/v2/hug/0001.gif', 'https://nekos.best/api/v2/hug/0005.gif'],
        messages: ['đã chạy đến ôm chầm lấy', 'đã trao một cái ôm thật chặt cho']
    },
    hon: {
        title: '💋 NỤ HÔN NGỌT NGÀO', color: '#FF1493',
        gifs: ['https://nekos.best/api/v2/kiss/0001.gif', 'https://nekos.best/api/v2/kiss/0008.gif'],
        messages: ['nhẹ nhàng đặt một nụ hôn lên má', 'trao một nụ hôn nồng thắm cho']
    },
    xoadau: {
        title: '🫳 XOA ĐẦU CƯNG NỰNG', color: '#FFD700',
        gifs: ['https://nekos.best/api/v2/pat/0002.gif'],
        messages: ['nhẹ nhàng đưa tay xoa đầu cưng nựng']
    },
    veoma: {
        title: '🤏 VÉO MÁ ĐÁNG YÊU', color: '#FFA07A',
        gifs: ['https://i.postimg.cc/mD83S8gX/pinch1.gif'],
        messages: ['véo nhẹ đôi má phúng phính của']
    },
    namtay: {
        title: '🤝 NẮM TAY ẤM ÁP', color: '#00FA9A',
        gifs: ['https://nekos.best/api/v2/handhold/0001.gif'],
        messages: ['chủ động đan chặt tay vào tay']
    }
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function readDatabase() {
    try {
        if (!fs.existsSync(dbPath)) return {};
        return JSON.parse(fs.readFileSync(dbPath, 'utf8') || '{}');
    } catch { return {}; }
}

function writeDatabase(data) {
    try { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8'); } catch (e) { console.error(e); }
}

function ensureUserExists(db, userId) {
    if (!db[userId]) {
        db[userId] = { customGifs: {}, relationships: { totinh: null, kethon: null, banthan: null }, inventory: [{ ringId: 'co_4_la', name: 'Cỏ 4 Lá', emoji: '🍀' }], marriageData: null };
    }
    return db[userId];
}

function formatNumber(num) { return (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function getMarriedDays(marriedAt) { return Math.floor(Math.abs(new Date() - new Date(marriedAt)) / (1000 * 60 * 60 * 24)); }
function getMarriedDateFormatted(marriedAt) {
    const date = new Date(marriedAt);
    return `${date.getDate()} tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
}

function setRelationship(user1Id, user2Id, type) {
    const db = readDatabase();
    ensureUserExists(db, user1Id);
    ensureUserExists(db, user2Id);

    db[user1Id].relationships[type] = user2Id;
    db[user2Id].relationships[type] = user1Id;

    if (type === 'kethon') {
        const defaultMarriageData = {
            marriedAt: new Date().toISOString(),
            ring: { ringId: 'co_4_la', name: 'Cỏ 4 Lá', emoji: '🍀' },
            lovePoints: 100, streakDays: 1, lastInteractedAt: new Date().toISOString(),
            quote: '𝒩𝑜𝓌 𝒾𝓈𝓈! (´・ω・`) ♡', wallpaper: null
        };
        db[user1Id].marriageData = { ...defaultMarriageData };
        db[user2Id].marriageData = { ...defaultMarriageData };
    }
    writeDatabase(db);
}

function removeRelationship(userId, type) {
    const db = readDatabase();
    if (!db[userId]?.relationships?.[type]) return null;

    const partnerId = db[userId].relationships[type];
    db[userId].relationships[type] = null;
    if (db[partnerId]?.relationships) db[partnerId].relationships[type] = null;

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
        .setAuthor({ name: `💖 ${user.username} đang hạnh phúc với ${partnerUser ? partnerUser.username : 'Người ấy'}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(
            `📅 **Ngày kết hôn :** ${marriedDateStr} (${marriedDays} ngày)\n` +
            `💒 **Nhẫn đính hôn :** ${ringInfo.emoji} **${ringInfo.name}**\n` +
            `💒 **Điểm yêu thương :** **${formatNumber(marriageData.lovePoints)}** 🍬\n` +
            `🔥 **Chuỗi Thân mật :** **${marriageData.streakDays} ngày**\n\n` +
            `│ *${marriageData.quote || '𝒩𝑜𝓌 𝓀𝒾𝓈𝓈! (´・ω・`) ♡'}*`
        )
        .setThumbnail(partnerUser ? partnerUser.displayAvatarURL({ dynamic: true, size: 256 }) : null);

    if (marriageData.wallpaper) embed.setImage(marriageData.wallpaper);
    else if (partnerUser) embed.setImage(partnerUser.displayAvatarURL({ dynamic: true, size: 512 }));

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rel_card_gift_${user.id}_${partnerUser ? partnerUser.id : ''}`).setLabel('Tặng Quà').setEmoji('✨').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rel_card_changering_${user.id}_${partnerUser ? partnerUser.id : ''}`).setLabel('Đổi nhẫn').setEmoji('💍').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

const buildActionCommand = (name, description) => new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .addUserOption(opt => opt.setName('user').setDescription('Người nhận').setRequired(true))
    .addStringOption(opt => opt.setName('link_gif').setDescription('Link GIF tạm thời').setRequired(false));

const relationshipCommands = [
    new SlashCommandBuilder().setName('totinh').setDescription('Gửi lời tỏ tình 💖').addUserOption(opt => opt.setName('user').setDescription('Đối phương').setRequired(true)).addStringOption(opt => opt.setName('loinhan').setDescription('Lời nhắn')),
    new SlashCommandBuilder().setName('kethon').setDescription('Cầu hôn người ấy 💍').addUserOption(opt => opt.setName('user').setDescription('Đối phương').setRequired(true)).addStringOption(opt => opt.setName('loinhan').setDescription('Lời thề')),
    new SlashCommandBuilder().setName('banthan').setDescription('Kết bạn thân 🤝').addUserOption(opt => opt.setName('user').setDescription('Đối phương').setRequired(true)),
    new SlashCommandBuilder().setName('ket-hon').setDescription('💒 Xem thẻ hồ sơ kết hôn').addUserOption(opt => opt.setName('user').setDescription('Xem của ai')),
    new SlashCommandBuilder().setName('setquote').setDescription('✍️ Đổi câu chúc trên thẻ kết hôn').addStringOption(opt => opt.setName('text').setDescription('Lời chúc').setRequired(true)),
    new SlashCommandBuilder().setName('huymoquanhe').setDescription('💔 Hủy mối quan hệ').addStringOption(opt => opt.setName('loai').setDescription('Mối quan hệ').setRequired(true).addChoices({ name: 'Tỏ tình', value: 'totinh' }, { name: 'Kết hôn', value: 'kethon' }, { name: 'Bạn thân', value: 'banthan' })),
    buildActionCommand('om', 'Cái ôm 🤗'),
    buildActionCommand('hon', 'Nụ hôn 💋'),
    buildActionCommand('xoadau', 'Xoa đầu 🫳'),
    buildActionCommand('veoma', 'Véo má 🤏'),
    buildActionCommand('namtay', 'Nắm tay 🤝')
].map(cmd => cmd.toJSON());

async function handleRelationshipInteraction(interaction) {
    if (interaction.isChatInputCommand()) {
        const { commandName, user, options, client } = interaction;
        const db = readDatabase();
        ensureUserExists(db, user.id);

        if (commandName === 'totinh') {
            const targetUser = options.getUser('user');
            const loinhan = options.getString('loinhan') || 'Cậu có đồng ý trở thành một nửa ngọt ngào của tớ không? 🌸';
            if (targetUser.id === user.id || targetUser.bot) return interaction.reply({ content: '❌ Đối phương không hợp lệ!', flags: MessageFlags.Ephemeral });

            const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('💖 LỜI TỎ TÌNH 💖').setDescription(`${user} gửi lời tỏ tình đến ${targetUser}!\n> "${loinhan}"`);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rel_accept_totinh_${user.id}_${targetUser.id}`).setLabel('Đồng Ý 💕').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rel_refuse_totinh_${user.id}_${targetUser.id}`).setLabel('Từ Chối 💔').setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ content: `${targetUser}`, embeds: [embed], components: [row] });
        }

        if (commandName === 'kethon') {
            const targetUser = options.getUser('user');
            const loinhan = options.getString('loinhan') || 'Cùng nắm tay nhau đi hết quãng đường còn lại nhé! 💍';
            if (targetUser.id === user.id || targetUser.bot) return interaction.reply({ content: '❌ Đối phương không hợp lệ!', flags: MessageFlags.Ephemeral });

            const embed = new EmbedBuilder().setColor('#FFD700').setTitle('💍 LỄ CẦU HÔN 💍').setDescription(`${user} ngỏ lời cầu hôn ${targetUser}!\n> "${loinhan}"`);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rel_accept_kethon_${user.id}_${targetUser.id}`).setLabel('Đồng Ý 💍').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rel_refuse_kethon_${user.id}_${targetUser.id}`).setLabel('Từ Chối 🥀').setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ content: `${targetUser}`, embeds: [embed], components: [row] });
        }

        if (commandName === 'ket-hon') {
            const targetUser = options.getUser('user') || user;
            ensureUserExists(db, targetUser.id);
            const marriageData = db[targetUser.id]?.marriageData;
            const partnerId = db[targetUser.id]?.relationships?.kethon;

            if (!marriageData || !partnerId) return interaction.reply({ content: '💔 Không tìm thấy dữ liệu kết hôn!', flags: MessageFlags.Ephemeral });

            const partnerUser = await client.users.fetch(partnerId).catch(() => null);
            const cardData = await createMarriageCardEmbed(client, targetUser, partnerUser, marriageData);
            return interaction.reply(cardData);
        }

        if (commandName === 'huymoquanhe') {
            const type = options.getString('loai');
            const partnerId = removeRelationship(user.id, type);
            if (!partnerId) return interaction.reply({ content: '❌ Bạn không có mối quan hệ này!', flags: MessageFlags.Ephemeral });
            return interaction.reply({ content: `💔 Đã hủy mối quan hệ với <@${partnerId}>.` });
        }

        if (ACTION_DATA[commandName]) {
            const targetUser = options.getUser('user');
            const action = ACTION_DATA[commandName];
            const embed = new EmbedBuilder()
                .setColor(action.color)
                .setDescription(`✨ **${user}** ${getRandom(action.messages)} **${targetUser}**!`)
                .setImage(getRandom(action.gifs));
            return interaction.reply({ embeds: [embed] });
        }
    }

    if (interaction.isButton()) {
        const customId = interaction.customId;
        const db = readDatabase();

        if (customId.startsWith('rel_accept_') || customId.startsWith('rel_refuse_')) {
            const [, action, type, senderId, targetId] = customId.split('_');
            if (interaction.user.id !== targetId) return interaction.reply({ content: '❌ Lời mời không dành cho bạn!', flags: MessageFlags.Ephemeral });

            if (action === 'refuse') return interaction.update({ content: '💔 Lời mời đã bị từ chối.', embeds: [], components: [] });

            setRelationship(senderId, targetId, type);
            return interaction.update({ content: `🎉 Chúc mừng hai bạn đã chính thức lập mối quan hệ!`, embeds: [], components: [] });
        }

        if (customId.startsWith('rel_card_gift_')) {
            const [, , , user1Id, user2Id] = customId.split('_');
            if (interaction.user.id !== user1Id && interaction.user.id !== user2Id) return interaction.reply({ content: '❌ Bạn không ở trong cuộc hôn nhân này!', flags: MessageFlags.Ephemeral });

            const marriageData = db[user1Id]?.marriageData;
            if (!marriageData) return interaction.reply({ content: '❌ Mối quan hệ không tồn tại.', flags: MessageFlags.Ephemeral });

            const ringShopItem = ITEM_SHOP.find(r => r.id === marriageData.ring?.ringId) || { buff: 1.0 };
            const addedPoints = Math.floor(1000 * ringShopItem.buff);

            marriageData.lovePoints = (marriageData.lovePoints || 0) + addedPoints;
            if (db[user2Id]?.marriageData) db[user2Id].marriageData = { ...marriageData };
            writeDatabase(db);

            const partnerId = interaction.user.id === user1Id ? user2Id : user1Id;
            const partnerUser = await interaction.client.users.fetch(partnerId).catch(() => null);
            const updatedCard = await createMarriageCardEmbed(interaction.client, interaction.user, partnerUser, marriageData);

            await interaction.update(updatedCard);
            return interaction.followUp({ content: `✨ Tặng quà thành công! +${formatNumber(addedPoints)} Điểm yêu thương!`, flags: MessageFlags.Ephemeral });
        }

        if (customId.startsWith('rel_card_changering_')) {
            const [, , , user1Id, user2Id] = customId.split('_');
            const userData = ensureUserExists(db, interaction.user.id);
            const rings = (userData.inventory || []).filter(item => item.category === 'ring' || item.ringId);

            if (rings.length === 0) return interaction.reply({ content: '💼 Bạn chưa có nhẫn nào trong kho! Dùng `/shop` để mua.', flags: MessageFlags.Ephemeral });

            const options = rings.map((item, idx) => ({ label: item.name, value: `${item.ringId}_${idx}`, emoji: item.emoji }));
            const selectMenu = new StringSelectMenuBuilder().setCustomId(`equip_ring_select_${user1Id}_${user2Id}`).setPlaceholder('Chọn nhẫn để đeo...').addOptions(options);

            return interaction.reply({ components: [new ActionRowBuilder().addComponents(selectMenu)], flags: MessageFlags.Ephemeral });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('equip_ring_select_')) {
        const db = readDatabase();
        const [, , , user1Id, user2Id] = interaction.customId.split('_');
        const selectedValue = interaction.values[0].split('_')[0];
        const ringShopItem = ITEM_SHOP.find(r => r.id === selectedValue) || { name: 'Cỏ 4 Lá', emoji: '🍀', id: 'co_4_la' };

        if (db[user1Id]?.marriageData) db[user1Id].marriageData.ring = { ringId: ringShopItem.id, name: ringShopItem.name, emoji: ringShopItem.emoji };
        if (db[user2Id]?.marriageData) db[user2Id].marriageData.ring = { ringId: ringShopItem.id, name: ringShopItem.name, emoji: ringShopItem.emoji };
        writeDatabase(db);

        return interaction.update({ content: `✅ Đã đổi nhẫn sang **${ringShopItem.emoji} ${ringShopItem.name}** thành công!`, components: [] });
    }
}

module.exports = {
    relationshipCommands,
    handleRelationshipInteraction
};