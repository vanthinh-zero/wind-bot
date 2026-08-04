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

// 🖼️ URL ẢNH THUMBNAIL SHOP
const SHOP_THUMBNAIL_URL = "https://media.discordapp.net/attachments/1508103127956455536/1534226338947535131/Khong_Co_Tieu_e4_20260727092420.png?ex=6a735b1f&is=6a72099f&hm=46f0e4341042629e9edf0fd7180f19f74eb50c513e6a061971b22558089391f9&=&format=webp&quality=lossless&width=640&height=640";

// 💍 DANH SÁCH NHẪN & QUÀ TẶNG
const RINGS_SHOP = [
    { id: 'co_4_la', name: 'Cỏ 4 Lá', category: 'ring', emoji: '🍀', price: 50000, buff: 1.1, desc: 'May mắn & Thuần khiết' },
    { id: 'thach_anh_hong', name: 'Thạch Anh Hồng', category: 'ring', emoji: '🌸', price: 200000, buff: 1.25, desc: 'Gắn kết trái tim ngọt ngào' },
    { id: 'nhan_bac', name: 'Nhẫn Bạc Đính Kim', category: 'ring', emoji: '💍', price: 500000, buff: 1.5, desc: 'Lấp lánh tình yêu đôi lứa' },
    { id: 'orchid', name: 'Orchid', category: 'ring', emoji: '🪷', price: 1000000, buff: 2.0, desc: 'Quyến rũ & Tinh tế (Cao cấp)' },
    { id: 'vuong_mien', name: 'Vương Miện Vĩnh Cửu', category: 'ring', emoji: '👑', price: 5000000, buff: 3.5, desc: 'Tình yêu trường tồn bất diệt' },
    { id: 'socola', name: 'Hộp Socola Trái Tim', category: 'gift', emoji: '🍫', price: 30000, buff: 1.05, desc: 'Tăng điểm yêu thương khi tặng' },
    { id: 'hoa_hong', name: 'Bó 999 Bông Hồng', category: 'gift', emoji: '🌹', price: 150000, buff: 1.2, desc: 'Lãng mạn & Ngọt ngào' }
];

// 🐶 DANH SÁCH THÚ CƯNG & DỊCH VỤ
const PETS_SHOP = [
    { id: 'pet_new', name: 'Mua Thú Cưng Mới', category: 'pet', emoji: '🐶', price: 10000, desc: 'Nhận 1 Pet ngẫu nhiên (Giá: 10.000 Cowcoin)' },
    { id: 'pet_food', name: 'Th thức Ăn Thú Cưng', category: 'pet', emoji: '🍖', price: 500, desc: 'Tăng độ no (+30 no, +15 EXP)' },
    { id: 'pet_lock_10m', name: 'Khóa Chống Trộm (10 phút)', category: 'pet_service', emoji: '🔒', price: 1000, desc: 'Bảo vệ Pet khỏi bị trộm trong 10 phút' },
    { id: 'pet_lock_60m', name: 'Khóa Chống Trộm (1 Giờ)', category: 'pet_service', emoji: '🛡️', price: 5000, desc: 'Bảo vệ Pet khỏi bị trộm trong 60 phút' }
];

const ITEM_SHOP = [...RINGS_SHOP, ...PETS_SHOP];

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
        return userData.money ?? userData.coins ?? userData.cash ?? userData.balance ?? 0;
    }
    return 0;
}

function deductUserMoney(userId, amount) {
    const moneyDb = readMoneyDatabase();
    if (!moneyDb[userId]) moneyDb[userId] = { money: 0 };

    if (typeof moneyDb[userId] === 'number') {
        moneyDb[userId] -= amount;
    } else if (typeof moneyDb[userId] === 'object' && moneyDb[userId] !== null) {
        if ('balance' in moneyDb[userId]) moneyDb[userId].balance -= amount;
        else if ('money' in moneyDb[userId]) moneyDb[userId].money -= amount;
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
        .setDescription('🛍️ Cửa hàng vật phẩm, nhẫn đính hôn & thú cưng'),
    
    new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('🎒 Xem túi đồ / kho vật phẩm cá nhân')
].map(cmd => cmd.toJSON());

// Hàm tạo Embed và 2 Menu chọn
function createShopMenu(userId) {
    const currentBalance = getUserMoney(userId);

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🛍️ CỬA HÀNG VẬT PHẨM VÀ DỊCH VỤ')
        .setDescription(
            `💰 **Số dư của bạn:** **${formatNumber(currentBalance)} Cowcoin**\n\n` +
            `💍 **PHẦN 1: SHOP NHẪN & QUÀ TẶNG TÌNH YÊU**\n` +
            `👉 *Chọn menu thứ nhất để mua nhẫn đính hôn hoặc quà.*\n\n` +
            `🐶 **PHẦN 2: SHOP THÚ CƯNG & DỊCH VỤ**\n` +
            `👉 *Chọn menu thứ hai để mua thú cưng, thức ăn hoặc gia hạn khóa trộm.*`
        )
        .setThumbnail(SHOP_THUMBNAIL_URL);

    // Menu phần 1: Nhẫn & Quà
    const ringOptions = RINGS_SHOP.map(item => ({
        label: item.name,
        description: `${formatNumber(item.price)} Cowcoin | Buff: x${item.buff}`,
        value: item.id,
        emoji: item.emoji
    }));

    const ringSelect = new StringSelectMenuBuilder()
        .setCustomId(`shop_buy_ring_${userId}`)
        .setPlaceholder('💍 [PHẦN 1] Chọn Nhẫn hoặc Quà Tặng...')
        .addOptions(ringOptions);

    // Menu phần 2: Pet & Dịch vụ
    const petOptions = PETS_SHOP.map(item => ({
        label: item.name,
        description: `${formatNumber(item.price)} Cowcoin | ${item.desc}`,
        value: item.id,
        emoji: item.emoji
    }));

    const petSelect = new StringSelectMenuBuilder()
        .setCustomId(`shop_buy_pet_${userId}`)
        .setPlaceholder('🐶 [PHẦN 2] Chọn Thú Cưng & Dịch Vụ Khóa...')
        .addOptions(petOptions);

    const rowRings = new ActionRowBuilder().addComponents(ringSelect);
    const rowPets = new ActionRowBuilder().addComponents(petSelect);

    return { embeds: [embed], components: [rowRings, rowPets] };
}

// --- XỬ LÝ LỆNH PREFIX (!shop, !muanhan, !khodo) ---
async function handleShopSystem(message) {
    const content = message.content.trim().toLowerCase();
    const userId = message.author.id;

    if (content === '!shop-pet' || content === '!shop') {
        // Hướng dẫn người dùng dùng Slash Command để được bảo mật 100% riêng tư
        return message.reply(`💡 Để xem shop riêng tư (chỉ một mình bạn thấy), vui lòng dùng lệnh Slash **\`/shop\`**!`).catch(() => {});
    }

    if (content === '!khodo' || content === '!inventory') {
        const db = readDatabase();
        const inventory = db[userId]?.inventory || [];
        
        if (inventory.length === 0) {
            return message.reply(`🎒 Kho đồ của bạn hiện đang trống! Dùng \`/shop\` để mua sắm.`);
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
            .setTitle(`🎒 TÚI ĐỒ CỦA ${message.author.username.toUpperCase()}`)
            .setDescription(itemListStr)
            .setFooter({ text: `Tổng số lượng: ${inventory.length} vật phẩm` });

        return message.reply({ embeds: [embed] });
    }
}

// --- XỬ LÝ INTERACTION (SLASH COMMAND & MENU CHỌN MUA HÀNG) ---
async function handleShopInteraction(interaction) {
    if (interaction.isChatInputCommand()) {
        const { commandName, user } = interaction;
        const db = readDatabase();
        ensureUserExists(db, user.id);

        if (commandName === 'shop') {
            const shopPayload = createShopMenu(user.id);
            // ephemeral: true giúp tin nhắn hoàn toàn ẩn với người khác
            return interaction.reply({ ...shopPayload, flags: MessageFlags.Ephemeral });
        }

        if (commandName === 'inventory') {
            const inventory = db[user.id]?.inventory || [];
            
            if (inventory.length === 0) {
                return interaction.reply({ content: '🎒 Kho đồ của bạn hiện đang trống!', flags: MessageFlags.Ephemeral });
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
        const isRingMenu = interaction.customId.startsWith('shop_buy_ring_');
        const isPetMenu = interaction.customId.startsWith('shop_buy_pet_');

        if (isRingMenu || isPetMenu) {
            const userId = interaction.user.id;
            const selectedId = interaction.values[0];
            const item = ITEM_SHOP.find(r => r.id === selectedId);
            const currentBalance = getUserMoney(userId);

            if (!item) return;

            if (currentBalance < item.price) {
                return interaction.reply({
                    content: `❌ Bạn không đủ tiền! Cần **${formatNumber(item.price)} Cowcoin** nhưng bạn chỉ có **${formatNumber(currentBalance)} Cowcoin**.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Xử lý trừ tiền
            deductUserMoney(userId, item.price);

            // 1. Mua Nhẫn / Quà
            if (item.category === 'ring' || item.category === 'gift') {
                const db = readDatabase();
                const userData = ensureUserExists(db, userId);
                userData.inventory.push({
                    ringId: item.id,
                    name: item.name,
                    emoji: item.emoji,
                    category: item.category
                });
                writeDatabase(db);
            } 
            // 2. Mua Pet Mới
            else if (item.id === 'pet_new') {
                const petDbPath = path.join(process.cwd(), 'pet_db.json');
                let petDb = {};
                try { if (fs.existsSync(petDbPath)) petDb = JSON.parse(fs.readFileSync(petDbPath, 'utf8') || '{}'); } catch {}

                if (!petDb[userId]) petDb[userId] = { activePetId: null, inventory: [], lastClaimTime: Date.now() };

                const petTypes = ["Chó Shiba", "Mèo Dù", "Thỏ Ngọc", "Cáo Tuyết", "Gấu PANDA"];
                const randomType = petTypes[Math.floor(Math.random() * petTypes.length)];

                const newPet = {
                    id: "pet_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                    name: `Thú Cưng (${randomType})`,
                    level: 1,
                    exp: 0,
                    food: 100,
                    originalOwner: userId,
                    lockUntil: 0
                };

                petDb[userId].inventory.push(newPet);
                if (!petDb[userId].activePetId) petDb[userId].activePetId = newPet.id;
                fs.writeFileSync(petDbPath, JSON.stringify(petDb, null, 4), 'utf8');
            }
            // 3. Mua Thức Ăn cho Pet
            else if (item.id === 'pet_food') {
                const petDbPath = path.join(process.cwd(), 'pet_db.json');
                let petDb = {};
                try { if (fs.existsSync(petDbPath)) petDb = JSON.parse(fs.readFileSync(petDbPath, 'utf8') || '{}'); } catch {}

                if (petDb[userId] && petDb[userId].inventory) {
                    const activePet = petDb[userId].inventory.find(p => p.id === petDb[userId].activePetId);
                    if (activePet) {
                        activePet.food = Math.min(100, activePet.food + 30);
                        activePet.exp += 15;
                        fs.writeFileSync(petDbPath, JSON.stringify(petDb, null, 4), 'utf8');
                    }
                }
            }
            // 4. Mua Gia Hạn Khóa Chống Trộm (!lockpet)
            else if (item.id === 'pet_lock_10m' || item.id === 'pet_lock_60m') {
                const petDbPath = path.join(process.cwd(), 'pet_db.json');
                let petDb = {};
                try { if (fs.existsSync(petDbPath)) petDb = JSON.parse(fs.readFileSync(petDbPath, 'utf8') || '{}'); } catch {}

                if (petDb[userId] && petDb[userId].inventory) {
                    const activePet = petDb[userId].inventory.find(p => p.id === petDb[userId].activePetId);
                    if (activePet) {
                        const lockTimeMs = (item.id === 'pet_lock_10m' ? 10 : 60) * 60 * 1000;
                        const currentLock = activePet.lockUntil && activePet.lockUntil > Date.now() ? activePet.lockUntil : Date.now();
                        activePet.lockUntil = currentLock + lockTimeMs;
                        fs.writeFileSync(petDbPath, JSON.stringify(petDb, null, 4), 'utf8');
                    }
                }
            }

            return interaction.reply({
                content: `🎉 Bạn đã mua thành công **${item.emoji} ${item.name}** với giá **${formatNumber(item.price)} Cowcoin**!\n💰 Số dư còn lại: **${formatNumber(getUserMoney(userId))} Cowcoin**.`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

module.exports = {
    ITEM_SHOP,
    shopCommands,
    handleShopSystem,
    handleShopInteraction
};