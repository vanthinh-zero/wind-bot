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
// 🛡️ HÀM QUẢN LÝ TIỀN TỆ AN TOÀN - CHỐNG TRIỆT ĐỂ LỖI NaN$
// =========================================================
function getMoney(userId) {
    const db = readJson(moneyDbPath);
    // Nếu chưa có user hoặc balance không phải là số hợp lệ, ép về 0
    if (!db[userId] || typeof db[userId].balance !== 'number' || isNaN(db[userId].balance)) {
        return 0;
    }
    return db[userId].balance;
}

function addMoney(userId, amount) {
    const db = readJson(moneyDbPath);
    
    // Khởi tạo nếu user chưa tồn tại
    if (!db[userId]) {
        db[userId] = { balance: 0, lastDaily: null };
    }
    
    // Bảo vệ biến balance hiện tại không bị undefined/NaN
    if (typeof db[userId].balance !== 'number' || isNaN(db[userId].balance)) {
        db[userId].balance = 0;
    }

    // Ép kiểu lượng tiền thay đổi về số nguyên
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
        // Tự động sửa cấu trúc dữ liệu nếu là tài khoản từ bản cũ chuyển sang
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
// 💸 HÀM TỰ ĐỘNG TÍNH VÀ CỘNG TIỀN THỤ ĐỘNG THEO THỜI GIAN
// =========================================================
function updatePassiveIncome(userId, userPetData) {
    if (!userPetData.inventory || userPetData.inventory.length === 0) return 0;

    const now = Date.now();
    const timePassedMs = now - userPetData.lastClaimTime;
    
    // Tính số phút trôi qua (Mỗi 1 phút tích lũy tiền 1 lần)
    const minutesPassed = Math.floor(timePassedMs / (60 * 1000)); 

    if (minutesPassed > 0) {
        // Tính tổng cấp độ của TẤT CẢ các Pet nằm trong kho đồ (kể cả con đang dắt)
        const totalPetLevels = userPetData.inventory.reduce((sum, pet) => sum + (parseInt(pet.level) || 1), 0);

        // Công thức: Tiền thụ động = Số phút * Tổng cấp độ Pet
        const passiveMoneyEarned = minutesPassed * totalPetLevels;

        if (passiveMoneyEarned > 0) {
            addMoney(userId, passiveMoneyEarned);
            
            // Dịch chuyển mốc thời gian, giữ lại số mili-giây dư thừa chưa đủ 1 phút
            userPetData.lastClaimTime = userPetData.lastClaimTime + (minutesPassed * 60 * 1000);
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

    // Bộ lọc lệnh
    const petCommands = ['!pet', '!shop-pet', '!muapet', '!choan', '!nangcap', '!help', '!tromcho', '!thave', '!khopet', '!laypet'];
    if (!petCommands.some(cmd => content.startsWith(cmd))) return;

    // Giới hạn kênh nuôi pet
    const configuredPetChannel = process.env.KENH_NUOI_PET;
    if (configuredPetChannel && message.channel.id !== configuredPetChannel) {
        return message.reply(`❌ Khu vực chăm sóc Linh Thú chỉ mở tại riêng kênh <#${configuredPetChannel}>!`).catch(() => {});
    }

    // Nạp dữ liệu Pet của User
    let userPetData = getPetData(userId);

    // =========================================================
    // 💰 THU HOẠCH TIỀN THỤ ĐỘNG MỖI KHI GÕ LỆNH PET
    // =========================================================
    const earned = updatePassiveIncome(userId, userPetData);
    if (earned > 0) {
        await message.channel.send(`💰 **[Linh Thú Trợ Lực]** Trong lúc bạn đi vắng, các Linh Thú trong kho đã tự động tu luyện và mang về cho bạn **+${earned} linh thạch**!`).catch(() => {});
    }

    let userMoney = getMoney(userId);
    let activePet = userPetData.inventory.find(p => p.id === userPetData.activePetId);

    // =========================================================
    // 📖 LỆNH: !help
    // =========================================================
    if (content === '!help') {
        let helpMsg = `📜 **CẨM NANG LINH THÚ (TÍCH HỢP HOÀN CHỈNH)** 📜\n`;
        helpMsg += `-------------------------------------------\n`;
        helpMsg += `💸 *Cơ chế Thần Tài: Toàn bộ Pet trong kho (cất đi hay dắt theo) đều tự động sinh tiền mỗi phút theo cấp độ của chúng. Càng nhiều Pet cấp cao, tiền sinh ra càng khủng!*\n\n`;
        helpMsg += `➔ \`!shop-pet\` : Mở cửa hàng mua trứng và thức ăn.\n`;
        helpMsg += `➔ \`!muapet [Tên]\` : Mua Linh Thú mới (tự động vào kho).\n`;
        helpMsg += `➔ \`!pet\` : Xem chỉ số của Linh Thú đang dắt theo người.\n`;
        helpMsg += `➔ \`!choan\` / \`!nangcap\` : Chăm sóc nâng cấp độ Pet.\n`;
        helpMsg += `➔ \`!khopet\` : Mở kho đồ xem toàn bộ Linh Thú đang sở hữu & tốc độ sinh tiền.\n`;
        helpMsg += `➔ \`!laypet [STT]\` : Thay thế Linh Thú xuất trận (không cần thả pet cũ).\n`;
        helpMsg += `➔ \`!tromcho [@User]\` : Tỉ lệ 30% cướp 1 Pet ngẫu nhiên trong kho nạn nhân. Thất bại phạt tiền chuyển THẲNG cho nạn nhân.\n`;
        helpMsg += `➔ \`!thave\` : Phóng sinh vĩnh viễn con Pet đang dắt theo.\n`;
        helpMsg += `➔ \`!thave @User\` : Trả lại con Pet đang dắt về cho chủ sở hữu gốc của nó.\n`;
        return message.reply(helpMsg).catch(() => {});
    }

    // =========================================================
    // 🏪 LỆNH: !shop-pet
    // =========================================================
    if (content === '!shop-pet') {
        let shopMsg = `🏪 **TRÂN THÚ CÁC (CỬA HÀNG PET)** 🏪\n`;
        shopMsg += `-------------------------------------------\n`;
        shopMsg += `🥚 **!muapet [Tên_Pet]** ➔ Giá: **${PRICE_BUY_PET}** linh thạch\n`;
        shopMsg += `🍖 **!choan** ➔ Giá: **${PRICE_FOOD}** linh thạch (Tăng +30 no, +15 EXP)\n`;
        shopMsg += `⚡ **!nangcap** ➔ Tiêu hao linh thạch đột phá cấp bậc nhanh chóng.`;
        return message.reply(shopMsg).catch(() => {});
    }

    // =========================================================
    // 🥚 LỆNH: !muapet
    // =========================================================
    if (content.startsWith('!muapet')) {
        if (userMoney < PRICE_BUY_PET) return message.reply(`❌ Đạo hữu không đủ **${PRICE_BUY_PET}** linh thạch!`);

        let petName = args.slice(1).join(" ");
        if (!petName) petName = "Tiểu Linh Thú";

        const petTypes = ["Hỏa Kỳ Lân", "Băng Phượng Hoàng", "Hắc Ám Ma Lang", "Cửu Vĩ Thiên Hồ", "Thần Côn"];
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
        return message.reply(`🎉 Bạn đã mua thành công **${newPet.name}**! Thú đã được đưa vào kho đồ và kích hoạt cơ chế sinh tiền thụ động.`);
    }

    // =========================================================
    // 📦 LỆNH: XEM KHO ĐỒ PET (!khopet)
    // =========================================================
    if (content === '!khopet') {
        if (userPetData.inventory.length === 0) return message.reply(`🎒 Kho linh thú của bạn đang trống rỗng.`);
        
        const currentSpeed = userPetData.inventory.reduce((sum, pet) => sum + (parseInt(pet.level) || 1), 0);

        let invMsg = `🎒 **KHO LINH THÚ CỦA ${message.author.username.toUpperCase()}** 🎒\n`;
        invMsg += `-------------------------------------------\n`;
        invMsg += `💸 Tổng công suất sinh tiền: **+${currentSpeed} linh thạch/phút**\n\n`;
        
        userPetData.inventory.forEach((petItem, index) => {
            const isActive = petItem.id === userPetData.activePetId ? "👉 [ĐANG DẮT]" : "";
            const isStolen = petItem.originalOwner !== userId ? " 🏴‍☠️ (Thú Trộm Được)" : "";
            invMsg += `**${index + 1}.** ${petItem.name} - Cấp ${petItem.level} ${isActive}${isStolen} *(+${petItem.level}$/phút)*\n`;
        });
        invMsg += `-------------------------------------------\n💡 Gõ \`!laypet [STT]\` để thay thế Linh Thú xuất trận.`;
        return message.reply(invMsg);
    }

    // =========================================================
    // 🔄 LỆNH: THAY THẾ / LẤY PET RA KHỎI KHO (!laypet [STT])
    // =========================================================
    if (content.startsWith('!laypet')) {
        const index = parseInt(args[1]) - 1;
        if (isNaN(index) || index < 0 || index >= userPetData.inventory.length) {
            return message.reply(`❌ Vui lòng nhập số thứ tự Pet hợp lệ trong kho (Ví dụ: \`!laypet 2\`).`);
        }

        userPetData.activePetId = userPetData.inventory[index].id;
        savePetData(userId, userPetData);
        
        return message.reply(`🔄 Bạn đã cất thú cũ và dắt **${userPetData.inventory[index].name}** xuất trận!`);
    }

    // =========================================================
    // 🥷 LỆNH: TRỘM CHÓ - PHẠT TIỀN CHUYỂN THẲNG CHO BỊ HẠI (!tromcho)
    // =========================================================
    if (content.startsWith('!tromcho')) {
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`❌ Vui lòng tag người muốn trộm (Ví dụ: \`!tromcho @Target\`).`);
        if (targetUser.id === userId) return message.reply(`❌ Bạn không thể tự trộm chính mình.`);
        if (targetUser.bot) return message.reply(`❌ Không thể trộm của Bot.`);

        const lastTrom = tromchoCooldowns.get(userId) || 0;
        if (Date.now() - lastTrom < 5 * 60 * 1000) {
            const timeRemaining = Math.ceil((5 * 60 * 1000 - (Date.now() - lastTrom)) / 1000);
            return message.reply(`⏰ Hãy ẩn nấp thêm **${timeRemaining} giây** trước khi thực hiện vụ trộm tiếp theo.`);
        }

        // Đồng bộ cập nhật tiền thụ động cho nạn nhân trước khi kho đồ của họ thay đổi
        const targetPetData = getPetData(targetUser.id);
        updatePassiveIncome(targetUser.id, targetPetData);

        if (targetPetData.inventory.length === 0) {
            return message.reply(`❌ Trong kho của **${targetUser.username}** không có con Linh Thú nào để trộm.`);
        }

        tromchoCooldowns.set(userId, Date.now());

        if (Math.random() <= 0.30) {
            // Thành công: Lấy ngẫu nhiên 1 pet trong kho nạn nhân
            const randomIndex = Math.floor(Math.random() * targetPetData.inventory.length);
            const stolenPet = targetPetData.inventory.splice(randomIndex, 1)[0];

            if (targetPetData.activePetId === stolenPet.id) {
                targetPetData.activePetId = targetPetData.inventory[0]?.id || null;
            }
            savePetData(targetUser.id, targetPetData);

            userPetData.inventory.push(stolenPet);
            savePetData(userId, userPetData);

            return message.reply(`🥷 **ĐẠO TẶC THÀNH CÔNG!!** Bạn đã đột nhập kho của <@${targetUser.id}> và cuỗm mất con **${stolenPet.name}** (Cấp ${stolenPet.level}) về kho của mình!`);
        } else {
            // Thất bại: Phạt tiền và CHUYỂN THẲNG tiền vào ví nạn nhân
            const fine = 300;
            addMoney(userId, -fine);
            addMoney(targetUser.id, fine); 

            return message.reply(`🚨 **BẮT QUẢ TANG!** Bạn lẻn vào nhà <@${targetUser.id}> thì bị xích chó vướng chân ngã sấp mặt. Bạn bị gia chủ tóm gọn và phải **bồi thường nóng ${fine} linh thạch** chuyển thẳng vào ví của họ!`);
        }
    }

    // --- CÁC LỆNH DƯỚI ĐÂY BẮT BUỘC PHẢI DẮT THEO MỘT CON PET MỚI DÙNG ĐƯỢC ---
    if (!activePet) {
        return message.reply(`🥚 Bạn chưa dắt Linh Thú nào theo người cả! Hãy gõ \`!khopet\` rồi chọn Pet ra trận bằng \`!laypet [STT]\`.`);
    }

    // =========================================================
    // 🍂 LỆNH: !thave VÀ !thave @User (TRẢ CHÓ VỀ CHO CHỦ CŨ)
    // =========================================================
    if (content.startsWith('!thave')) {
        const targetMention = message.mentions.users.first();

        // TRƯỜNG HỢP 1: !thave @User (Trả thú trộm được về cho chính chủ)
        if (targetMention) {
            if (activePet.originalOwner !== targetMention.id) {
                return message.reply(`❌ Con **${activePet.name}** này không phải do <@${targetMention.id}> sở hữu ban đầu, không thể trả cho họ!`);
            }

            message.reply(`🤝 Bạn muốn hoàn trả Linh Thú **${activePet.name}** về lại cho chủ cũ của nó là <@${targetMention.id}> chứ?\nGõ \`ok\` trong 15 giây để xác nhận trả.`);
            
            const filter = m => m.author.id === userId && m.content.toLowerCase() === 'ok';
            message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
                .then(() => {
                    // Xóa khỏi kho kẻ trộm
                    userPetData.inventory = userPetData.inventory.filter(p => p.id !== activePet.id);
                    userPetData.activePetId = userPetData.inventory[0]?.id || null;
                    savePetData(userId, userPetData);

                    // Trả lại kho chủ cũ
                    const originalOwnerData = getPetData(targetMention.id);
                    updatePassiveIncome(targetMention.id, originalOwnerData); // Cập nhật thu nhập thụ động chủ cũ trước
                    
                    originalOwnerData.inventory.push(activePet);
                    if (!originalOwnerData.activePetId) originalOwnerData.activePetId = activePet.id;
                    savePetData(targetMention.id, originalOwnerData);

                    return message.channel.send(`🕊️ **Hoàn bích quy Triệu!** <@${userId}> đã trao trả tận tay Linh Thú **${activePet.name}** về cho chính chủ <@${targetMention.id}> thành công.`);
                }).catch(() => message.reply(`❌ Hủy bỏ lệnh trả lại.`));
            return;
        }

        // TRƯỜNG HỢP 2: !thave (Phóng sinh thông thường về tự nhiên)
        message.reply(`🍂 Bạn muốn phóng sinh **${activePet.name}** về núi rừng thiên nhiên vĩnh viễn chứ?\nGõ \`ok\` trong 15 giây để xác nhận.`);
        
        const filter = m => m.author.id === userId && m.content.toLowerCase() === 'ok';
        message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
            .then(() => {
                userPetData.inventory = userPetData.inventory.filter(p => p.id !== activePet.id);
                userPetData.activePetId = userPetData.inventory[0]?.id || null;
                savePetData(userId, userPetData);
                return message.channel.send(`🕊️ Bạn đã giải thoát cho **${activePet.name}**. Nó tự do chạy thẳng vào rừng sâu.`);
            }).catch(() => message.reply(`❌ Hủy phóng sinh.`));
        return;
    }

    // =========================================================
    // ℹ️ LỆNH: XEM CHỈ SỐ PET ĐANG DẮT THEO (!pet)
    // =========================================================
    if (content === '!pet') {
        const expNeeded = activePet.level * 100;
        
        if (Math.random() < 0.3 && activePet.food > 10) {
            activePet.food -= Math.floor(Math.random() * 5) + 1;
        }

        let petMsg = `🐾 **LINH THÚ ĐANG XUẤT TRẬN CỦA ${message.author.username.toUpperCase()}** 🐾\n`;
        petMsg += `-------------------------------------------\n`;
        petMsg += `🔮 **Danh Xưng:** ${activePet.name}\n`;
        petMsg += `⭐ **Tu Vi (Cấp):** Cấp ${activePet.level} *(Đang kiếm về: +${activePet.level} linh thạch/phút)*\n`;
        petMsg += `✨ **Kinh Nghiệm:** [${activePet.exp}/${expNeeded}] EXP\n`;
        
        let foodBar = "🍖 " + "🟩".repeat(Math.ceil(activePet.food / 10)) + "⬜".repeat(10 - Math.ceil(activePet.food / 10)) + ` (${activePet.food}/100)`;
        if (activePet.food <= 30) foodBar += " ⚠️ *Đang rất đói!*";
        petMsg += `🍖 **Độ No:** ${foodBar}\n`;
        petMsg += `👤 **Chủ sở hữu gốc:** <@${activePet.originalOwner}>\n\n`;
        petMsg += `💡 *Mẹo: Gõ \`!khopet\` để xem tổng tốc độ đào linh thạch từ tất cả các Pet của bạn.*`;

        savePetData(userId, userPetData);
        return message.reply(petMsg).catch(() => {});
    }

    // =========================================================
    // 🍖 LỆNH: CHO PET ĂN (!choan)
    // =========================================================
    if (content === '!choan') {
        if (activePet.food >= 100) return message.reply(`❌ **${activePet.name}** đang quá no rồi!`);
        if (userMoney < PRICE_FOOD) return message.reply(`❌ Bạn không đủ **${PRICE_FOOD}** linh thạch!`);

        addMoney(userId, -PRICE_FOOD);
        activePet.food = Math.min(100, activePet.food + 30);
        activePet.exp += 15; 
        
        const expNeeded = activePet.level * 100;
        let upLevelText = "";
        if (activePet.exp >= expNeeded) {
            activePet.exp -= expNeeded;
            activePet.level += 1;
            upLevelText = `\n✨ **ĐỘT PHÁ!** Linh thú đã thăng lên **Cấp ${activePet.level}**! Tốc độ sinh tiền thụ động tăng lên!`;
        }

        savePetData(userId, userPetData);
        return message.reply(`🍖 Bạn tiêu **${PRICE_FOOD}** linh thạch mua thức ăn cho **${activePet.name}**. Độ no: **${activePet.food}/100** (+15 EXP).${upLevelText}`);
    }

    // =========================================================
    // ⚡ LỆNH: NÂNG CẤP PET (!nangcap)
    // =========================================================
    if (content === '!nangcap') {
        const expNeeded = activePet.level * 100;
        const upgradeCost = activePet.level * 300;

        if (userMoney < upgradeCost) return message.reply(`❌ Chi phí nâng cấp cần **${upgradeCost}** linh thạch.`);
        if (activePet.food < 40) return message.reply(`❌ Thú đang quá đói không thể đột phá tu vi! Hãy cho ăn trước.`);

        addMoney(userId, -upgradeCost);
        activePet.exp += 150; 
        
        let responseText = `⚡ Tiêu hao **${upgradeCost}** linh thạch để truyền linh lực cho **${activePet.name}** (+150 EXP).\n`;

        if (activePet.exp >= expNeeded) {
            activePet.exp -= expNeeded;
            activePet.level += 1;
            responseText += `🎉 **ĐỘT PHÁ THÀNH CÔNG!** Thú tiến hóa lên **Cấp ${activePet.level}**! Công suất đào tiền thụ động được nâng cao!`;
        } else {
            responseText += `✨ Kinh nghiệm: **[${activePet.exp}/${expNeeded}]** EXP.`;
        }

        savePetData(userId, userPetData);
        return message.reply(responseText).catch(() => {});
    }
}

module.exports = { handlePetSystem };