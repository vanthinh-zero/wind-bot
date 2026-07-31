const fs = require('fs');
const path = require('path');

// Đường dẫn database
const petDbPath = path.join(__dirname, '../../pet_db.json');
const moneyDbPath = path.join(__dirname, '../../money.json');

// --- HÀM TRỢ GIÚP ĐỌC/GHI DATABASE ---
function readJson(filePath) {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}), 'utf8');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
}

// =========================================================
// 🛡️ HÀM QUẢN LÝ TIỀN TỆ AN TOÀN
// =========================================================
function getMoney(userId) {
    const db = readJson(moneyDbPath);
    if (!db[userId] || typeof db[userId].balance !== 'number' || isNaN(db[userId].balance)) {
        return 0;
    }
    return db[userId].balance;
}

function addMoney(userId, amount) {
    const db = readJson(moneyDbPath);
    
    if (!db[userId]) {
        db[userId] = { balance: 0, lastDaily: null };
    }
    
    if (typeof db[userId].balance !== 'number' || isNaN(db[userId].balance)) {
        db[userId].balance = 0;
    }

    const safeAmount = parseInt(amount);
    if (isNaN(safeAmount)) {
        console.error(`[Lỗi Hệ Thống] Lượng tiền truyền vào addMoney bị NaN:`, amount);
        return; 
    }

    db[userId].balance += safeAmount;
    writeJson(moneyDbPath, db);
}

// --- HÀM ĐỌC/GHI DỮ LIỆU PET ---
function getPetData(userId) {
    const db = readJson(petDbPath);
    
    if (!db[userId]) {
        db[userId] = {
            activePetId: null,
            inventory: [],
            lastClaimTime: Date.now() 
        };
        writeJson(petDbPath, db);
    } else {
        if (db[userId].hasPet !== undefined) {
            const oldData = db[userId];
            db[userId] = {
                activePetId: oldData.hasPet ? "pet_legacy_1" : null,
                inventory: oldData.hasPet ? [{
                    id: "pet_legacy_1",
                    name: oldData.name,
                    level: oldData.level || 1,
                    exp: oldData.exp || 0,
                    food: oldData.food || 100,
                    originalOwner: userId
                }] : [],
                lastClaimTime: Date.now()
            };
            writeJson(petDbPath, db);
        } else if (!db[userId].lastClaimTime) {
            db[userId].lastClaimTime = Date.now();
            writeJson(petDbPath, db);
        }
    }
    return db[userId];
}

function savePetData(userId, data) {
    const db = readJson(petDbPath);
    db[userId] = data;
    writeJson(petDbPath, db);
}

// =========================================================
// 💸 HÀM TỰ ĐỘNG TÍNH VÀ CỘNG TIỀN THỤ ĐỘNG THEO THỜI GIAN (ĐÃ SỬA CHỐNG LẠM PHÁT)
// =========================================================
function updatePassiveIncome(userId, userPetData) {
    if (!userPetData.inventory || userPetData.inventory.length === 0) return 0;

    // CHỈ TÍNH CHO CON PET ĐANG DẮT
    const activePet = userPetData.inventory.find(p => p.id === userPetData.activePetId);
    if (!activePet || activePet.food <= 0) return 0; // Đói hoặc không dắt -> Không tạo ra tiền

    const now = Date.now();
    const timePassedMs = now - userPetData.lastClaimTime;
    const minutesPassed = Math.floor(timePassedMs / (60 * 1000)); 

    if (minutesPassed > 0) {
        const petLevel = parseInt(activePet.level) || 1;
        const passiveMoneyEarned = minutesPassed * petLevel;

        if (passiveMoneyEarned > 0) {
            // Giảm độ no theo thời gian (Mỗi 5 phút trừ 1 độ no)
            const foodLoss = Math.floor(minutesPassed / 5);
            activePet.food = Math.max(0, activePet.food - foodLoss);

            addMoney(userId, passiveMoneyEarned);
            userPetData.lastClaimTime = userPetData.lastClaimTime + (minutesPassed * 60 * 1000);
            savePetData(userId, userPetData);
            return passiveMoneyEarned;
        }
    }
    return 0;
}

// --- CONFIG CỬA HÀNG & COOLDOWN ---
const PRICE_BUY_PET = 1000;    
const PRICE_FOOD = 50;        
const tromchoCooldowns = new Map();

async function handlePetSystem(message) {
    const content = message.content.trim().toLowerCase();
    const args = message.content.trim().split(/\s+/);
    const userId = message.author.id;

    const petCommands = ['!pet', '!shop-pet', '!muapet', '!choan', '!nangcap', '!help', '!tromcho', '!thave', '!khopet', '!laypet'];
    if (!petCommands.some(cmd => content.startsWith(cmd))) return;

    const configuredPetChannel = process.env.KENH_NUOI_PET;
    if (configuredPetChannel && message.channel.id !== configuredPetChannel) {
        return message.reply(`❌ Kênh nuôi thú cưng chỉ mở tại phòng <#${configuredPetChannel}>!`).catch(() => {});
    }

    let userPetData = getPetData(userId);

    const earned = updatePassiveIncome(userId, userPetData);
    if (earned > 0) {
        await message.channel.send(`💰 **[Thu Nhập Thụ Động]** Thú cưng đang dắt đã mang về cho bạn **+${earned} Cowcoin**!`).catch(() => {});
    }

    let userMoney = getMoney(userId);
    let activePet = userPetData.inventory.find(p => p.id === userPetData.activePetId);

    // =========================================================
    // 📖 LỆNH: !help
    // =========================================================
    if (content === '!help') {
        let helpMsg = `📜 **HƯỚNG DẪN HỆ THỐNG THÚ CƯNG (PET)** 📜\n`;
        helpMsg += `-------------------------------------------\n`;
        helpMsg += `💸 *Cơ chế thu nhập: Thú cưng đang dắt sẽ tự động tạo ra tiền mỗi phút dựa trên cấp độ (Cần duy trì độ no).* \n\n`;
        helpMsg += `➔ \`!shop-pet\` : Mở cửa hàng mua thú cưng và thức ăn.\n`;
        helpMsg += `➔ \`!muapet [Tên]\` : Mua thú cưng mới (tự động chuyển vào kho).\n`;
        helpMsg += `➔ \`!pet\` : Xem thông tin thú cưng đang dắt theo.\n`;
        helpMsg += `➔ \`!choan\` / \`!nangcap\` : Chăm sóc và tăng cấp cho Pet.\n`;
        helpMsg += `➔ \`!khopet\` : Xem danh sách thú cưng đang sở hữu.\n`;
        helpMsg += `➔ \`!laypet [STT]\` : Đổi thú cưng xuất trận.\n`;
        helpMsg += `➔ \`!tromcho [@User]\` : Tỉ lệ 30% trộm 1 Pet trong kho người khác. Thất bại sẽ bị phạt tiền trả cho nạn nhân.\n`;
        helpMsg += `➔ \`!thave\` : Thả vĩnh viễn thú cưng đang dắt.\n`;
        helpMsg += `➔ \`!thave @User\` : Trả lại thú cưng cho chủ sở hữu ban đầu.\n`;
        return message.reply(helpMsg).catch(() => {});
    }

    // =========================================================
    // 🏪 LỆNH: !shop-pet
    // =========================================================
    if (content === '!shop-pet') {
        let shopMsg = `🏪 **CỬA HÀNG THÚ CƯNG** 🏪\n`;
        shopMsg += `-------------------------------------------\n`;
        shopMsg += `🐶 **!muapet [Tên_Pet]** ➔ Giá: **${PRICE_BUY_PET}** Cowcoin\n`;
        shopMsg += `🍖 **!choan** ➔ Giá: **${PRICE_FOOD}** Cowcoin (+30 độ no, +15 EXP)\n`;
        shopMsg += `⚡ **!nangcap** ➔ Dùng Cowcoin để tăng kinh nghiệm cho Pet.`;
        return message.reply(shopMsg).catch(() => {});
    }

    // =========================================================
    // 🐶 LỆNH: !muapet
    // =========================================================
    if (content.startsWith('!muapet')) {
        if (userMoney < PRICE_BUY_PET) return message.reply(`❌ Bạn không đủ **${PRICE_BUY_PET}** Cowcoin!`);

        let petName = args.slice(1).join(" ");
        if (!petName) petName = "Thú Cưng";

        const petTypes = ["Chó Shiba", "Mèo Dù", "Thỏ Ngọc", "Cáo Tuyết", "Gấu PANDA"];
        const randomType = petTypes[Math.floor(Math.random() * petTypes.length)];

        const newPet = {
            id: "pet_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            name: `${petName} (${randomType})`,
            level: 1,
            exp: 0,
            food: 100,
            originalOwner: userId
        };

        addMoney(userId, -PRICE_BUY_PET);
        userPetData.inventory.push(newPet);
        
        if (!userPetData.activePetId) {
            userPetData.activePetId = newPet.id;
        }

        savePetData(userId, userPetData);
        return message.reply(`🎉 Bạn đã mua thành công **${newPet.name}**! Thú cưng đã được thêm vào kho và bắt đầu tạo tiền thụ động.`);
    }

    // =========================================================
    // 📦 LỆNH: XEM KHO ĐỒ PET (!khopet)
    // =========================================================
    if (content === '!khopet') {
        if (userPetData.inventory.length === 0) return message.reply(`🎒 Kho thú cưng của bạn đang trống.`);
        
        let invMsg = `🎒 **KHO THÚ CƯNG CỦA ${message.author.username.toUpperCase()}** 🎒\n`;
        invMsg += `-------------------------------------------\n\n`;
        
        userPetData.inventory.forEach((petItem, index) => {
            const isActive = petItem.id === userPetData.activePetId ? "👉 [ĐANG DẮT]" : "";
            const isStolen = petItem.originalOwner !== userId ? " 🏴‍☠️ (Thú Trộm)" : "";
            invMsg += `**${index + 1}.** ${petItem.name} - Cấp ${petItem.level} ${isActive}${isStolen} *(+${petItem.level} Cowcoin/phút)*\n`;
        });
        invMsg += `-------------------------------------------\n💡 Dùng \`!laypet [STT]\` để đổi thú cưng ra trận.`;
        return message.reply(invMsg);
    }

    // =========================================================
    // 🔄 LỆNH: THAY THẾ PET (!laypet [STT])
    // =========================================================
    if (content.startsWith('!laypet')) {
        const index = parseInt(args[1]) - 1;
        if (isNaN(index) || index < 0 || index >= userPetData.inventory.length) {
            return message.reply(`❌ Vui lòng nhập đúng số thứ tự của Pet trong kho (Ví dụ: \`!laypet 2\`).`);
        }

        userPetData.activePetId = userPetData.inventory[index].id;
        savePetData(userId, userPetData);
        
        return message.reply(`🔄 Bạn đã đổi sang dắt **${userPetData.inventory[index].name}**!`);
    }

    // =========================================================
    // 🥷 LỆNH: TRỘM CHÓ (!tromcho)
    // =========================================================
    if (content.startsWith('!tromcho')) {
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`❌ Vui lòng tag người muốn trộm (Ví dụ: \`!tromcho @Target\`).`);
        if (targetUser.id === userId) return message.reply(`❌ Bạn không thể tự trộm của chính mình.`);
        if (targetUser.bot) return message.reply(`❌ Không thể trộm của Bot.`);

        const lastTrom = tromchoCooldowns.get(userId) || 0;
        if (Date.now() - lastTrom < 5 * 60 * 1000) {
            const timeRemaining = Math.ceil((5 * 60 * 1000 - (Date.now() - lastTrom)) / 1000);
            return message.reply(`⏰ Vui lòng chờ **${timeRemaining} giây** nữa để thực hiện lại.`);
        }

        const targetPetData = getPetData(targetUser.id);
        updatePassiveIncome(targetUser.id, targetPetData);

        if (targetPetData.inventory.length === 0) {
            return message.reply(`❌ Trong kho của **${targetUser.username}** không có thú cưng nào.`);
        }

        tromchoCooldowns.set(userId, Date.now());

        if (Math.random() <= 0.30) {
            const randomIndex = Math.floor(Math.random() * targetPetData.inventory.length);
            const stolenPet = targetPetData.inventory.splice(randomIndex, 1)[0];

            if (targetPetData.activePetId === stolenPet.id) {
                targetPetData.activePetId = targetPetData.inventory[0]?.id || null;
            }
            savePetData(targetUser.id, targetPetData);

            userPetData.inventory.push(stolenPet);
            savePetData(userId, userPetData);

            return message.reply(`🥷 **TRỘM THÀNH CÔNG!** Bạn đã lấy mất con **${stolenPet.name}** (Cấp ${stolenPet.level}) từ kho của <@${targetUser.id}>!`);
        } else {
            const fine = 300;
            addMoney(userId, -fine);
            addMoney(targetUser.id, fine); 

            return message.reply(`🚨 **BỊ BẮT QUẢ TANG!** Bạn trộm hụt và bị phát hiện. Bạn phải bồi thường **${fine} Cowcoin** trực tiếp cho <@${targetUser.id}>!`);
        }
    }

    if (!activePet) {
        return message.reply(`🐶 Bạn chưa dắt thú cưng nào! Dùng \`!khopet\` và gõ \`!laypet [STT]\` để chọn Pet.`);
    }

    // =========================================================
    // 🍂 LỆNH: !thave VÀ !thave @User
    // =========================================================
    if (content.startsWith('!thave')) {
        const targetMention = message.mentions.users.first();

        if (targetMention) {
            if (activePet.originalOwner !== targetMention.id) {
                return message.reply(`❌ **${activePet.name}** không phải do <@${targetMention.id}> sở hữu ban đầu!`);
            }

            message.reply(`🤝 Bạn có chắc muốn trả lại **${activePet.name}** cho <@${targetMention.id}> không?\nGõ \`ok\` trong 15 giây để xác nhận.`);
            
            const filter = m => m.author.id === userId && m.content.toLowerCase() === 'ok';
            message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
                .then(() => {
                    userPetData.inventory = userPetData.inventory.filter(p => p.id !== activePet.id);
                    userPetData.activePetId = userPetData.inventory[0]?.id || null;
                    savePetData(userId, userPetData);

                    const originalOwnerData = getPetData(targetMention.id);
                    updatePassiveIncome(targetMention.id, originalOwnerData);
                    
                    originalOwnerData.inventory.push(activePet);
                    if (!originalOwnerData.activePetId) originalOwnerData.activePetId = activePet.id;
                    savePetData(targetMention.id, originalOwnerData);

                    return message.channel.send(`🕊️ <@${userId}> đã trả lại thú cưng **${activePet.name}** cho <@${targetMention.id}> thành công.`);
                }).catch(() => message.reply(`❌ Đã hủy lệnh trả Pet.`));
            return;
        }

        message.reply(`🍂 Bạn có chắc muốn thả **${activePet.name}** đi không?\nGõ \`ok\` trong 15 giây để xác nhận.`);
        
        const filter = m => m.author.id === userId && m.content.toLowerCase() === 'ok';
        message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
            .then(() => {
                userPetData.inventory = userPetData.inventory.filter(p => p.id !== activePet.id);
                userPetData.activePetId = userPetData.inventory[0]?.id || null;
                savePetData(userId, userPetData);
                return message.channel.send(`🕊️ Bạn đã thả **${activePet.name}** về tự nhiên.`);
            }).catch(() => message.reply(`❌ Đã hủy thả thú cưng.`));
        return;
    }

    // =========================================================
    // ℹ️ LỆNH: THÔNG TIN PET (!pet)
    // =========================================================
    if (content === '!pet') {
        const expNeeded = activePet.level * 100;

        let petMsg = `🐾 **THÔNG TIN THÚ CƯNG CỦA ${message.author.username.toUpperCase()}** 🐾\n`;
        petMsg += `-------------------------------------------\n`;
        petMsg += `🏷️ **Tên:** ${activePet.name}\n`;
        petMsg += `⭐ **Cấp độ:** Cấp ${activePet.level} *(Tạo ra: +${activePet.level} Cowcoin/phút)*\n`;
        petMsg += `✨ **Kinh nghiệm:** [${activePet.exp}/${expNeeded}] EXP\n`;
        
        let foodBar = "🍖 " + "🟩".repeat(Math.ceil(activePet.food / 10)) + "⬜".repeat(10 - Math.ceil(activePet.food / 10)) + ` (${activePet.food}/100)`;
        if (activePet.food <= 30) foodBar += " ⚠️ *Đang đói!*";
        petMsg += `🍖 **Độ no:** ${foodBar}\n`;
        petMsg += `👤 **Chủ ban đầu:** <@${activePet.originalOwner}>\n\n`;
        petMsg += `💡 *Dùng lệnh \`!khopet\` để xem danh sách thú cưng.*`;

        savePetData(userId, userPetData);
        return message.reply(petMsg).catch(() => {});
    }

    // =========================================================
    // 🍖 LỆNH: CHO PET ĂN (!choan)
    // =========================================================
    if (content === '!choan') {
        if (activePet.food >= 100) return message.reply(`❌ **${activePet.name}** đã no rồi!`);
        if (userMoney < PRICE_FOOD) return message.reply(`❌ Bạn không đủ **${PRICE_FOOD}** Cowcoin!`);

        addMoney(userId, -PRICE_FOOD);
        activePet.food = Math.min(100, activePet.food + 30);
        activePet.exp += 15; 
        
        const expNeeded = activePet.level * 100;
        let upLevelText = "";
        if (activePet.exp >= expNeeded) {
            activePet.exp -= expNeeded;
            activePet.level += 1;
            upLevelText = `\n✨ **THĂNG CẤP!** Thú cưng đã lên **Cấp ${activePet.level}**! Tốc độ tạo tiền tăng lên!`;
        }

        savePetData(userId, userPetData);
        return message.reply(`🍖 Bạn tốn **${PRICE_FOOD}** Cowcoin mua thức ăn cho **${activePet.name}**. Độ no: **${activePet.food}/100** (+15 EXP).${upLevelText}`);
    }

    // =========================================================
    // ⚡ LỆNH: NÂNG CẤP PET (!nangcap)
    // =========================================================
    if (content === '!nangcap') {
        const expNeeded = activePet.level * 100;
        const upgradeCost = activePet.level * 300;

        if (userMoney < upgradeCost) return message.reply(`❌ Chi phí nâng cấp cần **${upgradeCost}** Cowcoin.`);
        if (activePet.food < 40) return message.reply(`❌ Thú cưng đang đói, hãy cho ăn trước khi nâng cấp!`);

        addMoney(userId, -upgradeCost);
        activePet.exp += 150; 
        
        let responseText = `⚡ Dùng **${upgradeCost}** Cowcoin nâng cấp cho **${activePet.name}** (+150 EXP).\n`;

        if (activePet.exp >= expNeeded) {
            activePet.exp -= expNeeded;
            activePet.level += 1;
            responseText += `🎉 **LÊN CẤP THÀNH CÔNG!** Thú cưng đạt **Cấp ${activePet.level}**!`;
        } else {
            responseText += `✨ Kinh nghiệm: **[${activePet.exp}/${expNeeded}]** EXP.`;
        }

        savePetData(userId, userPetData);
        return message.reply(responseText).catch(() => {});
    }
}

module.exports = { handlePetSystem };