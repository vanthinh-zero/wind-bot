const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    MessageFlags, 
    ActionRowBuilder, 
    StringSelectMenuBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'profiles.json');
const moneyDbPath = path.join(process.cwd(), 'money.json');

// 🛍️ DANH SÁCH VẬT PHẨM TRONG CỬA HÀNG CẢI TIẾN
const ITEM_SHOP = [
    // --- LẠI NHẪN ---
    { id: 'co_4_la', name: 'Cỏ 4 Lá', category: 'ring', emoji: '🍀', price: 50000, buff: 1.1, desc: 'May mắn & Thuần khiết' },
    { id: 'thach_anh_hong', name: 'Thạch Anh Hồng', category: 'ring', emoji: '🌸', price: 200000, buff: 1.25, desc: 'Gắn kết trái tim ngọt ngào' },
    { id: 'nhan_bac', name: 'Nhẫn Bạc Đính Kim', category: 'ring', emoji: '💍', price: 500000, buff: 1.5, desc: 'Lấp lánh tình yêu đôi lứa' },
    { id: 'orchid', name: 'Orchid', category: 'ring', emoji: '🪷', price: 1000000, buff: 2.0, desc: 'Quyến rũ & Tinh tế (Cao cấp)' },
    { id: 'vuong_mien', name: 'Vương Miện Vĩnh Cửu', category: 'ring', emoji: '👑', price: 5000000, buff: 3.5, desc: 'Tình yêu trường tồn bất diệt' },
    
    // --- QUÀ TẶNG & VẬT PHẨM TÌNH YÊU ---
    { id: 'socola', name: 'Hộp Socola Trái Tim', category: 'gift', emoji: '🍫', price: 30000, buff: 1.05, desc: 'Tăng điểm yêu thương khi tặng' },
    { id: 'hoa_hong', name: 'Bó 999 Bông Hồng', category: 'gift', emoji: '🌹', price: 150000, buff: 1.2, desc: 'Lãng mạn & Ngọt ngào' }
];

function readDatabase() {
    try {
        if (!fs.existsSync(dbPath)) return {};
        return JSON.parse(fs.readFileSync(dbPath, 'utf8') || '{}');
    } catch { return {}; }
}

function writeDatabase(data) {
    try { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8'); } catch (e) { console.error(e); }
}

function readMoneyDatabase() {
    try {
        if (!fs.existsSync(moneyDbPath)) return {};
        return JSON.parse(fs.readFileSync(moneyDbPath, 'utf8') || '{}');
    } catch { return {}; }
}

function writeMoneyDatabase(data) {
    try { fs.writeFileSync(moneyDbPath, JSON.stringify(data, null, 2), 'utf8'); } catch (e) { console.error(e); }
}

function getUserMoney(userId) {
    const moneyDb = readMoneyDatabase();
    const userData = moneyDb[userId];
    if (typeof userData === 'number') return userData;
    if (typeof userData === 'object' && userData !== null) {
        return userData.money ?? userData.coins ?? userData.cash ?? 0;
    }
    return 0;
}

function deductUserMoney(userId, amount) {
    const moneyDb = readMoneyDatabase();
    if (!moneyDb[userId]) moneyDb[userId] = { money: 0 };

    if (typeof moneyDb[userId] === 'number') {
        moneyDb[userId] -= amount;
    } else if (typeof moneyDb[userId] === 'object' && moneyDb[userId] !== null) {
        if ('money' in moneyDb[userId]) moneyDb[userId].money -= amount;
        else if ('coins' in moneyDb[userId]) moneyDb[userId].coins -= amount;
        else if ('cash' in moneyDb[userId]) moneyDb[userId].cash -= amount;
        else moneyDb[userId].money = -amount;
    }
    writeMoneyDatabase(moneyDb);
}

function ensureUserExists(db, userId) {
    if (!db[userId]) {
        db[userId] = { customGifs: {}, relationships: { totinh: null, kethon: null, banthan: null }, inventory: [], marriageData: null };
    }
    if (!db[userId].inventory) db[userId].inventory = [];
    return db[userId];
}

function formatNumber(num) {
    return (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const shopCommands = [
    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('🛍️ Cửa hàng vật phẩm & Nhẫn đính hôn cao cấp'),
    
    new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('🎒 Xem túi đồ / kho vật phẩm cá nhân')
].map(cmd => cmd.toJSON());

async function handleShopInteraction(interaction) {
    if (interaction.isChatInputCommand()) {
        const { commandName, user } = interaction;
        const db = readDatabase();
        ensureUserExists(db, user.id);

        if (commandName === 'shop') {
            const currentBalance = getUserMoney(user.id);

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🛍️ CỬA HÀNG VẬT PHẨM & NHẪN CẶP ĐÔI')
                .setDescription(`💰 Số dư của bạn: **${formatNumber(currentBalance)} Cowcoin**\n\nChọn một món đồ dưới menu để tiến hành mua hàng:`)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3028/3028308.png');

            const selectOptions = ITEM_SHOP.map(item => ({
                label: item.name,
                description: `${formatNumber(item.price)} Cowcoin | Buff: x${item.buff} (${item.desc})`,
                value: item.id,
                emoji: item.emoji
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`shop_buy_item_${user.id}`)
                .setPlaceholder('--- Chọn vật phẩm muốn mua ---')
                .addOptions(selectOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
        }

        if (commandName === 'inventory') {
            const inventory = db[user.id]?.inventory || [];
            
            if (inventory.length === 0) {
                return interaction.reply({ content: '🎒 Kho đồ của bạn hiện đang trống! Hãy dùng `/shop` để mua sắm.', flags: MessageFlags.Ephemeral });
            }

            const itemCounts = {};
            inventory.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || { ...item, count: 0 });
                itemCounts[item.name].count += 1;
            });

            const itemListStr = Object.values(itemCounts)
                .map(item => `${item.emoji} **${item.name}** x${item.count}`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setColor('#00FA9A')
                .setTitle(`🎒 TÚI ĐỒ CỦA ${user.username.toUpperCase()}`)
                .setDescription(itemListStr)
                .setFooter({ text: `Tổng số lượng: ${inventory.length} vật phẩm` });

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('shop_buy_item_')) {
            const db = readDatabase();
            const selectedId = interaction.values[0];
            const item = ITEM_SHOP.find(r => r.id === selectedId);
            const userData = ensureUserExists(db, interaction.user.id);
            const currentBalance = getUserMoney(interaction.user.id);

            if (currentBalance < item.price) {
                return interaction.reply({
                    content: `❌ Bạn không đủ Cowcoin! Cần **${formatNumber(item.price)} Cowcoin** nhưng bạn chỉ có **${formatNumber(currentBalance)} Cowcoin**.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            deductUserMoney(interaction.user.id, item.price);
            userData.inventory.push({
                ringId: item.id,
                name: item.name,
                emoji: item.emoji,
                category: item.category
            });
            writeDatabase(db);

            return interaction.reply({
                content: `🎉 Bạn đã mua thành công **${item.emoji} ${item.name}** với giá **${formatNumber(item.price)} Cowcoin**!\n💰 Số dư còn lại: **${formatNumber(getUserMoney(interaction.user.id))} Cowcoin**.`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

module.exports = {
    ITEM_SHOP,
    shopCommands,
    handleShopInteraction
};