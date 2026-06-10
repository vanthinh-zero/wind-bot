// src/handlers/pet.js
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

// Lấy thông tin Pet của người chơi
function getPetData(userId) {
    const db = readJson(petDbPath);
    if (!db[userId]) {
        db[userId] = {
            hasPet: false,
            name: "Chưa có",
            level: 1,
            exp: 0,
            food: 100 
        };
        writeJson(petDbPath, db);
    }
    return db[userId];
}
function savePetData(userId, data) {
    const db = readJson(petDbPath);
    db[userId] = data;
    writeJson(petDbPath, db);
}

// --- CONFIG CỬA HÀNG ---
const PRICE_BUY_PET = 1000;    
const PRICE_FOOD = 50;         

async function handlePetSystem(message) {
    const content = message.content.trim().toLowerCase();
    const args = message.content.trim().split(/\s+/);
    const userId = message.author.id;

    // 1. Kiểm tra xem tin nhắn có phải lệnh của hệ thống Pet không (Đã thêm !help)
    const petCommands = ['!pet', '!shop-pet', '!muapet', '!choan', '!nangcap', '!help'];
    if (!petCommands.some(cmd => content.startsWith(cmd))) return;

    // =========================================================
    // 🔒 2. KIỂM TRA KÊNH: NẾU SAI KÊNH -> THÔNG BÁO CHO HỌ BIẾT
    // =========================================================
    const configuredPetChannel = process.env.KENH_NUOI_PET;
    if (configuredPetChannel && message.channel.id !== configuredPetChannel) {
        return message.reply(`❌ Đạo hữu ơi, khu vực chăm sóc Linh Thú (Pet) chỉ mở tại riêng kênh <#${configuredPetChannel}> thôi nhé! Vui lòng di chuyển qua đó để thực hiện lệnh.`).catch(() => {});
    }

    // =========================================================
    // 📖 LỆNH MỚI: XEM HƯỚNG DẪN HỆ THỐNG PET (!help)
    // =========================================================
    if (content === '!help') {
        let helpMsg = `📜 **CẨM NANG NUÔI LINH THÚ (PET SYSTEM)** 📜\n`;
        helpMsg += `-------------------------------------------\n`;
        helpMsg += `Chào mừng đạo hữu đến với thế giới Linh Thú! Dưới đây là danh sách các mật lệnh điều khiển:\n\n`;
        helpMsg += `➔ \`!shop-pet\` : Mở Trân Thú Các (Xem giá trứng, thức ăn).\n`;
        helpMsg += `➔ \`!muapet [Tên_Pet]\` : Tiêu hao linh thạch nuôi một Linh Thú ngẫu nhiên.\n`;
        helpMsg += `➔ \`!pet\` : Kiểm tra trạng thái hiện tại (Cấp độ, EXP, Độ no) của Linh Thú.\n`;
        helpMsg += `➔ \`!choan\` : Cho Linh Thú ăn để tăng Độ No và nhận một ít EXP.\n`;
        helpMsg += `➔ \`!nangcap\` : Truyền linh lực giúp Linh Thú nhận lượng lớn EXP để nhanh chóng đột phá lên cấp mới.\n`;
        helpMsg += `-------------------------------------------\n`;
        helpMsg += `⚠️ *Lưu ý: Nếu Linh Thú quá đói (Độ no < 40), đạo hữu sẽ không thể tiến hành nâng cấp!*`;
        return message.reply(helpMsg).catch(() => {});
    }

    let pet = getPetData(userId);
    let userMoney = getMoney(userId);

    // =========================================================
    // 🏪 LỆNH 1: XEM CỬA HÀNG PET (!shop-pet)
    // =========================================================
    if (content === '!shop-pet') {
        let shopMsg = `🏪 **TRÂN THÚ CÁC (CỬA HÀNG PET)** 🏪\n`;
        shopMsg += `-------------------------------------------\n`;
        shopMsg += `🥚 **🥚 !muapet [Tên_Pet]** ➔ Giá: **${PRICE_BUY_PET}** linh thạch\n`;
        shopMsg += `*Khai mở đan điền, nhận nuôi một Linh Thú ngẫu nhiên.*\n\n`;
        shopMsg += `🍖 **🍖 !choan** ➔ Giá: **${PRICE_FOOD}** linh thạch / phần\n`;
        shopMsg += `*Mua Thức ăn Thần Thú, hồi phục +30 Độ No.*\n\n`;
        shopMsg += `⚡ **⚡ !nangcap** ➔ Tiêu hao linh thạch dựa trên cấp độ\n`;
        shopMsg += `*Đột phá tu vi cho Linh Thú tăng cấp.*`;
        return message.reply(shopMsg).catch(() => {});
    }

    // =========================================================
    // 🥚 LỆNH 2: MUA PET (!muapet [Tên_Pet])
    // =========================================================
    if (content.startsWith('!muapet')) {
        if (pet.hasPet) return message.reply(`❌ Đạo hữu đã có một Linh Thú tên là **${pet.name}** rồi, không thể nhận nuôi thêm!`).catch(() => {});
        if (userMoney < PRICE_BUY_PET) return message.reply(`❌ Đạo hữu không đủ **${PRICE_BUY_PET}** linh thạch để thỉnh Linh Thú!`).catch(() => {});

        let petName = args.slice(1).join(" ");
        if (!petName) petName = "Tiểu Linh Thú";

        const petTypes = ["Hỏa Kỳ Lân", "Băng Phượng Hoàng", "Hắc Ám Ma Lang", "Cửu Vĩ Thiên Hồ", "Thần Côn"];
        const randomType = petTypes[Math.floor(Math.random() * petTypes.length)];

        addMoney(userId, -PRICE_BUY_PET);
        pet.hasPet = true;
        pet.name = `${petName} (${randomType})`;
        pet.level = 1;
        pet.exp = 0;
        pet.food = 100;
        savePetData(userId, pet);

        return message.reply(`🎉 **Chúc mừng!** Đạo hữu đã tiêu hao **${PRICE_BUY_PET}** linh thạch để khế ước thành công Linh Thú: **${pet.name}**! Hãy gõ \`!pet\` để xem.`).catch(() => {});
    }

    // Kiểm tra các lệnh sau bắt buộc phải có Pet mới dùng được
    if (!pet.hasPet) {
        return message.reply(`🥚 Đạo hữu chưa nuôi Linh Thú nào cả! Hãy gõ \`!shop-pet\` để vào cửa hàng mua một quả trứng nhé.`).catch(() => {});
    }

    // =========================================================
    // ℹ️ LỆNH 3: XEM THÔNG TIN PET CỦA MÌNH (!pet)
    // =========================================================
    if (content === '!pet') {
        const expNeeded = pet.level * 100;
        
        if (Math.random() < 0.3 && pet.food > 10) {
            pet.food -= Math.floor(Math.random() * 5) + 1;
            savePetData(userId, pet);
        }

        let petMsg = `🐾 **LINH THÚ CỦA ${message.author.username.toUpperCase()}** 🐾\n`;
        petMsg += `-------------------------------------------\n`;
        petMsg += `🔮 **Danh Xưng:** ${pet.name}\n`;
        petMsg += `⭐ **Tu Vi (Cấp):** Cấp ${pet.level}\n`;
        petMsg += `✨ **Kinh Nghiệm:** [${pet.exp}/${expNeeded}] EXP\n`;
        
        let foodBar = "🍖 " + "🟩".repeat(Math.ceil(pet.food / 10)) + "⬜".repeat(10 - Math.ceil(pet.food / 10)) + ` (${pet.food}/100)`;
        if (pet.food <= 30) foodBar += " ⚠️ *Đang rất đói!*";
        petMsg += `🍖 **Độ No:** ${foodBar}\n\n`;
        petMsg += `💡 *Mẹo: Gõ \`!choan\` để nuôi hoặc \`!nangcap\` để đột phá tu vi.*`;

        return message.reply(petMsg).catch(() => {});
    }

    // =========================================================
    // 🍖 LỆNH 4: CHO PET ĂN (!choan)
    // =========================================================
    if (content === '!choan') {
        if (pet.food >= 100) return message.reply(`❌ **${pet.name}** đang quá no rồi, không muốn ăn thêm đâu đạo hữu!`).catch(() => {});
        if (userMoney < PRICE_FOOD) return message.reply(`❌ Đạo hữu không đủ **${PRICE_FOOD}** linh thạch để mua Thức ăn Thần Thú!`).catch(() => {});

        addMoney(userId, -PRICE_FOOD);
        pet.food = Math.min(100, pet.food + 30);
        pet.exp += 15; 
        
        const expNeeded = pet.level * 100;
        let upLevelText = "";
        if (pet.exp >= expNeeded) {
            pet.exp -= expNeeded;
            pet.level += 1;
            upLevelText = `\n✨ **ĐỘT PHÁ!** Linh thú của bạn đã tự động thăng lên **Cấp ${pet.level}**!`;
        }

        savePetData(userId, pet);
        return message.reply(`🍖 Đạo hữu tốn **${PRICE_FOOD}** linh thạch mua thức ăn cho **${pet.name}**. Đồ no hiện tại: **${pet.food}/100** (+15 EXP).${upLevelText}`).catch(() => {});
    }

    // =========================================================
    // ⚡ LỆNH 5: NÂNG CẤP PET (!nangcap)
    // =========================================================
    if (content === '!nangcap') {
        const expNeeded = pet.level * 100;
        const upgradeCost = pet.level * 300;

        if (userMoney < upgradeCost) {
            return message.reply(`❌ Chi phí nâng cấp Linh Thú lên bậc tiếp theo cần **${upgradeCost}** linh thạch. Đạo hữu không đủ tiền!`).catch(() => {});
        }

        if (pet.food < 40) {
            return message.reply(`❌ **${pet.name}** đang quá đói (${pet.food}/100), không đủ thể lực để tiến hành đột phá tu vi! Hãy cho ăn trước.`).catch(() => {});
        }

        addMoney(userId, -upgradeCost);
        pet.exp += 150; 
        
        let responseText = `⚡ Đạo hữu tiêu hao **${upgradeCost}** linh thạch để truyền linh lực truyền công cho **${pet.name}** (+150 EXP).\n`;

        if (pet.exp >= expNeeded) {
            pet.exp -= expNeeded;
            pet.level += 1;
            responseText += `🎉 **ĐỘT PHÁ THÀNH CÔNG!** **${pet.name}** đã tiến hóa lên **Cấp ${pet.level}**!`;
        } else {
            responseText += `✨ Kinh nghiệm hiện tại: **[${pet.exp}/${expNeeded}]** EXP. Còn một chút nữa thôi!`;
        }

        savePetData(userId, pet);
        return message.reply(responseText).catch(() => {});
    }
}

module.exports = { handlePetSystem };