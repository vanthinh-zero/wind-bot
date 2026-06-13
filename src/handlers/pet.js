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

// Lấy tiền & Thay đổi tiền liên kết với taixiu.js
function getMoney(userId) {
    const db = readJson(moneyDbPath);
    return db[userId]?.balance || 0;
}
function addMoney(userId, amount) {
    const db = readJson(moneyDbPath);
    if (!db[userId]) db[userId] = { balance: 0, lastDaily: null };
    db[userId].balance += amount;
    writeJson(moneyDbPath, db);
}

// Lấy thông tin Pet (Hệ thống Kho đồ tích hợp tự động sinh tiền)
function getPetData(userId) {
    const db = readJson(petDbPath);
    
    if (!db[userId]) {
        db[userId] = {
            activePetId: null,
            inventory: [],
            lastClaimTime: Date.now() // Lưu mốc thời gian bắt đầu tính tiền thụ động
        };
        writeJson(petDbPath, db);
    } else {
        // Cập nhật cấu hình cho các tài khoản cũ chưa có trường lastClaimTime
        if (!db[userId].lastClaimTime) {
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
    
    // Đổi ra số phút trôi qua (Ví dụ: Cứ mỗi 1 phút sinh tiền 1 lần)
    const minutesPassed = Math.floor(timePassedMs / (60 * 1000)); 

    if (minutesPassed > 0) {
        // Tính tổng cấp độ của TẤT CẢ các Pet nằm trong kho đồ (bao gồm cả con đang active)
        const totalPetLevels = userPetData.inventory.reduce((sum, pet) => sum + (pet.level || 1), 0);

        // Công thức: Số tiền nhận = Số phút trôi qua * Tổng cấp độ Pet
        // Bạn có thể nhân thêm hệ số nếu muốn cho nhiều tiền hơn, ví dụ: minutesPassed * totalPetLevels * 2;
        const passiveMoneyEarned = minutesPassed * totalPetLevels;

        if (passiveMoneyEarned > 0) {
            addMoney(userId, passiveMoneyEarned);
            
            // Cập nhật lại mốc thời gian sang chu kỳ mới (giữ lại số mili-giây dư thừa)
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

    // Danh sách lệnh hợp lệ
    const petCommands = ['!pet', '!shop-pet', '!muapet', '!choan', '!nangcap', '!help', '!tromcho', '!thave', '!khopet', '!laypet'];
    if (!petCommands.some(cmd => content.startsWith(cmd))) return;

    // Kiểm tra kênh cấu hình
    const configuredPetChannel = process.env.KENH_NUOI_PET;
    if (configuredPetChannel && message.channel.id !== configuredPetChannel) {
        return message.reply(`❌ Khu vực chăm sóc Linh Thú chỉ mở tại riêng kênh <#${configuredPetChannel}>!`).catch(() => {});
    }

    // Nạp dữ liệu Pet của User
    let userPetData = getPetData(userId);

    // =========================================================
    // 💰 THỰC THI THU THẬP TIỀN THỤ ĐỘNG TRƯỚC KHI XỬ LÝ LỆNH
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
        let helpMsg = `📜 **CẨM NANG LINH THÚ (MỚI: SINH TIỀN THỤ ĐỘNG)** 📜\n`;
        helpMsg += `-------------------------------------------\n`;
        helpMsg += `💸 *Cơ chế Thần Tài: Toàn bộ Pet trong kho đồ (cất đi hay dắt theo) đều tự động tạo ra tiền mỗi phút. Cấp độ càng cao, tiền sinh ra càng nhiều!*\n\n`;
        helpMsg += `➔ \`!shop-pet\` : Mở cửa hàng mua trứng và thức ăn.\n`;
        helpMsg += `➔ \`!muapet [Tên]\` : Mua và khế ước Linh Thú mới (tự động vào kho).\n`;
        helpMsg += `➔ \`!pet\` : Xem chỉ số của Linh Thú đang dắt theo người.\n`;
        helpMsg += `➔ \`!choan\` / \`!nangcap\` : Chăm sóc nuôi nấng Pet.\n`;
        helpMsg += `➔ \`!khopet\` : Mở kho đồ xem toàn bộ Linh Thú đang sở hữu.\n`;
        helpMsg += `➔ \`!laypet [STT]\` : Đổi Linh Thú xuất trận.\n`;
        helpMsg += `➔ \`!tromcho [@User]\` : Tỉ lệ 30% cướp 1 Pet ngẫu nhiên trong kho nạn nhân.\n`;
        helpMsg += `➔ \`!thave\` : Phóng sinh vĩnh viễn con Pet đang dắt theo.\n`;
        helpMsg += `➔ \`!thave @User\` : Trả tự do/Trả lại con Pet đang dắt về cho chủ cũ.\n`;
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
        shopMsg += `⚡ **!nangcap** ➔ Tiêu hao linh thạch đột phá cấp bậc.`;
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
        return message.reply(`🎉 Bạn đã mua thành công **${newPet.name}**! Thú đã được đưa vào kho đồ và bắt đầu kích hoạt cơ chế đào mỏ tự động.`);
    }

    // =========================================================
    // 📦 LỆNH: XEM KHO ĐỒ PET (!khopet)
    // =========================================================
    if (content === '!khopet') {
        if (userPetData.inventory.length === 0) return message.reply(`🎒 Kho linh thú của bạn đang trống rỗng.`);
        
        // Tính trước tổng tốc độ đào mỏ hiện tại
        const currentSpeed = userPetData.inventory.reduce((sum, pet) => sum + (pet.level || 1), 0);

        let invMsg = `🎒 **KHO LINH THÚ CỦA ${message.author.username.toUpperCase()}** 🎒\n`;
        invMsg += `-------------------------------------------\n`;
        invMsg += `💸 Tốc độ sinh linh thạch hiện tại: **+${currentSpeed}/phút**\n\n`;
        
        userPetData.inventory.forEach((petItem, index) => {
            const isActive = petItem.id === userPetData.activePetId ? "👉 [ĐANG DẮT]" : "";
            const isStolen = petItem.originalOwner !== userId ? " 🏴‍☠️ (Thú Trộm Được)" : "";
            invMsg += `**${index + 1}.** ${petItem.name} - Cấp ${petItem.level} ${isActive}${isStolen} *(+${petItem.level}$/phút)*\n`;
        });
        invMsg += `-------------------------------------------\n💡 Gõ \`!laypet [STT]\` để thay đổi Linh Thú xuất trận hành tẩu.`;
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
        
        return message.reply(`🔄 Bạn đã cất thú cũ và dắt **${userPetData.inventory[index].name}** đi hành tẩu cùng!`);
    }

    // =========================================================
    // 🥷 LỆNH: TRỘM CHÓ VÀ CHUYỂN TIỀN PHẠT CHO NẠN NHÂN (!tromcho)
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

        // Đồng bộ cập nhật tiền thụ động cho nạn nhân trước khi kho của họ bị thay đổi
        const targetPetData = getPetData(targetUser.id);
        updatePassiveIncome(targetUser.id, targetPetData);

        if (targetPetData.inventory.length === 0) {
            return message.reply(`❌ Trong kho của **${targetUser.username}** không có bất kỳ con Linh Thú nào để trộm.`);
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

            return message.reply(`🥷 **ĐẠO TẶC THÀNH CÔNG!!** Bạn đã lẻn vào kho đồ của <@${targetUser.id}> và cuỗm mất con **${stolenPet.name}** (Cấp ${stolenPet.level}) đem về kho đồ của mình! Cướp luôn cả tốc độ sinh tiền thụ động của nó!`);
        } else {
            const fine = 300;
            addMoney(userId, -fine);
            addMoney(targetUser.id, fine);

            return message.reply(`🚨 **BẮT QUẢ TANG!** Bạn lẻn vào nhà <@${targetUser.id}> thì đá trúng cái chậu vỡ làm đánh động gia chủ. Bạn bị đấm tơi tả và phải **bồi thường bạt tay nóng ${fine} linh thạch** thẳng vào tài khoản của họ!`);
        }
    }

    // --- CÁC LỆNH DƯỚI ĐÂY BẮT BUỘC PHẢI DẮT THEO MỘT CON PET MỚI DÙNG ĐƯỢC ---
    if (!activePet) {
        return message.reply(`🥚 Bạn chưa dắt Linh Thú nào theo người cả! Hãy gõ \`!khopet\` rồi chọn Pet ra trận bằng \`!laypet [STT]\`.`);
    }

    // =========================================================
    // 🍂 LỆNH: !thave VÀ !thave @User (TRẢ PET CHO CHỦ SỞ HỮU GỐC)
    // =========================================================
    if (content.startsWith('!thave')) {
        const targetMention = message.mentions.users.first();

        if (targetMention) {
            if (activePet.originalOwner !== targetMention.id) {
                return message.reply(`❌ Con **${activePet.name}** này không phải do <@${targetMention.id}> sở hữu ban đầu, bạn không thể trả lại cho họ!`);
            }

            message.reply(`🤝 Bạn muốn hoàn trả Linh Thú **${activePet.name}** về lại cho chủ cũ của nó là <@${targetMention.id}> chứ?\nGõ \`ok\` trong 15 giây để xác nhận trả.`);
            
            const filter = m => m.author.id === userId && m.content.toLowerCase() === 'ok';
            message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
                .then(() => {
                    userPetData.inventory = userPetData.inventory.filter(p => p.id !== activePet.id);
                    userPetData.activePetId = userPetData.inventory[0]?.id || null;
                    savePetData(userId, userPetData);

                    const originalOwnerData = getPetData(targetMention.id);
                    // Đồng bộ tiền thụ động của chủ cũ trước khi nạp thêm pet mới vào kho của họ
                    updatePassiveIncome(targetMention.id, originalOwnerData);
                    
                    originalOwnerData.inventory.push(activePet);
                    if (!originalOwnerData.activePetId) originalOwnerData.activePetId = activePet.id;
                    savePetData(targetMention.id, originalOwnerData);

                    return message.channel.send(`🕊️ **Hoàn bích quy Triệu!** <@${userId}> đã trao trả tận tay Linh Thú **${activePet.name}** về cho chính chủ <@${targetMention.id}> thành công.`);
                }).catch(() => message.reply(`❌ Hủy bỏ lệnh trả lại.`));
            return;
        }

        message.reply(`🍂 Bạn muốn phóng sinh **${activePet.name}** về núi rừng thiên nhiên vĩnh viễn chứ?\nGõ \`ok\` trong 15 giây để xác nhận.`);
        
        const filter = m => m.author.id === userId && m.content.toLowerCase() === 'ok';
        message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
            .then(() => {
                userPetData.inventory = userPetData.inventory.filter(p => p.id !== activePet.id);
                userPetData.activePetId = userPetData.inventory[0]?.id || null;
                savePetData(userId, userPetData);
                return message.channel.send(`🕊️ Bạn đã tháo khế ước giải thoát cho **${activePet.name}**. Nó tự do chạy thẳng vào rừng sâu.`);
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
        petMsg += `⭐ **Tu Vi (Cấp):** Cấp ${activePet.level} *(Đang kiếm về: +${activePet.level}$/phút)*\n`;
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
            upLevelText = `\n✨ **ĐỘT PHÁ!** Linh thú đã thăng lên **Cấp ${activePet.level}**! Tốc độ đào tiền thụ động tăng lên!`;
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
            responseText += `🎉 **ĐỘT PHÁ THÀNH CÔNG!** Thú tiến hóa lên **Cấp ${activePet.level}**! Công suất đào tiền thụ động được nâng cao đáng kể!`;
        } else {
            responseText += `✨ Kinh nghiệm: **[${activePet.exp}/${expNeeded}]** EXP.`;
        }

        savePetData(userId, userPetData);
        return message.reply(responseText).catch(() => {});
    }
}

module.exports = { handlePetSystem };