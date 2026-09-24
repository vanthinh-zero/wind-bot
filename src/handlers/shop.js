const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    MessageFlags, 
    ActionRowBuilder, 
    StringSelectMenuBuilder 
} = require('discord.js');
const { db, getGuildMoney, addGuildMoney, getUserPetData, saveUserPetData } = require('../utils/db');
const { COLORS, author, footer } = require('../utils/embedTheme');

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

async function readDatabase() {
    try {
        return (await db.get('profiles')) || {};
    } catch { return {}; }
}

async function writeDatabase(data) {
    try { 
        await db.set('profiles', data); 
    } catch (e) { 
        console.error('Lỗi lưu profiles trong shop.js:', e); 
    }
}

async function deductUserMoney(guildId, userId, amount) {
    return await addGuildMoney(guildId, userId, -amount);
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
async function createShopMenu(userId, guildId) {
    const currentBalance = await getGuildMoney(guildId, userId);

    const embed = new EmbedBuilder()
        .setColor(COLORS.gold)
        .setAuthor(author('MARKETPLACE'))
        .setTitle('✦ MARKETPLACE • Cửa hàng của Wind')
        .setDescription(
            `💰 **Số dư của bạn:** **${formatNumber(currentBalance)} Cowcoin**\n\n` +
            `💍 **JEWELRY & GIFTS**\n` +
            `Nhẫn và quà tặng để nâng niu những mối quan hệ.\n\n` +
            `🐾 **PET LOUNGE**\n` +
            `Thú cưng, thức ăn và dịch vụ bảo vệ trong kho của bạn.`
        )
        .setThumbnail(SHOP_THUMBNAIL_URL)
        .setFooter(footer('Chọn một danh mục bên dưới để bắt đầu mua sắm.'))
        .setTimestamp();

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
        const db = await readDatabase();
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
        const db = await readDatabase();
        ensureUserExists(db, user.id);

        if (commandName === 'shop') {
            const shopPayload = await createShopMenu(user.id, interaction.guild?.id);
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
            const currentBalance = await getGuildMoney(interaction.guild?.id, userId);

            if (!item) return;

            if (currentBalance < item.price) {
                return interaction.reply({
                    content: `❌ Bạn không đủ tiền! Cần **${formatNumber(item.price)} Cowcoin** nhưng bạn chỉ có **${formatNumber(currentBalance)} Cowcoin**.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Xử lý trừ tiền
            await deductUserMoney(interaction.guild?.id, userId, item.price);

            // 1. Mua Nhẫn / Quà
            if (item.category === 'ring' || item.category === 'gift') {
                const db = await readDatabase();
                const userData = ensureUserExists(db, userId);
                userData.inventory.push({
                    ringId: item.id,
                    name: item.name,
                    emoji: item.emoji,
                    category: item.category
                });
                await writeDatabase(db);
            } 
            // 2. Mua Pet Mới
            else if (item.id === 'pet_new') {
                const petData = await getUserPetData(userId);

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

                petData.inventory.push(newPet);
                if (!petData.activePetId) petData.activePetId = newPet.id;
                await saveUserPetData(userId, petData);
            }
            // 3. Mua Thức Ăn cho Pet
            else if (item.id === 'pet_food') {
                const petData = await getUserPetData(userId);

                const activePet = petData.inventory.find(p => p.id === petData.activePetId);
                if (activePet) {
                    activePet.food = Math.min(100, activePet.food + 30);
                    activePet.exp += 15;
                    await saveUserPetData(userId, petData);
                }
            }
            // 4. Mua Gia Hạn Khóa Chống Trộm
            else if (item.id === 'pet_lock_10m' || item.id === 'pet_lock_60m') {
                const petData = await getUserPetData(userId);

                const activePet = petData.inventory.find(p => p.id === petData.activePetId);
                if (activePet) {
                    const lockTimeMs = (item.id === 'pet_lock_10m' ? 10 : 60) * 60 * 1000;
                    const currentLock = activePet.lockUntil && activePet.lockUntil > Date.now() ? activePet.lockUntil : Date.now();
                    activePet.lockUntil = currentLock + lockTimeMs;
                    await saveUserPetData(userId, petData);
                }
            }

            const newBalance = await getGuildMoney(interaction.guild?.id, userId);
            return interaction.reply({
                content: `🎉 Bạn đã mua thành công **${item.emoji} ${item.name}** với giá **${formatNumber(item.price)} Cowcoin**!\n💰 Số dư còn lại: **${formatNumber(newBalance)} Cowcoin**.`,
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