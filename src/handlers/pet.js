const { getPremiumStatus } = require('./premium.js');
const { getSettings } = require('../utils/config');
const { 
    getGuildMoney, 
    addGuildMoney, 
    getUserPetData, 
    saveUserPetData 
} = require('../utils/db');

// --- HÀM TRỢ GIÚP ĐỒNG BỘ DÒNG TIỀN COWCOIN & PET (SQLITE) ---
async function getMoney(guildId, userId) {
    const bal = await getGuildMoney(guildId, userId);
    return typeof bal === 'number' ? bal : 0;
}

async function addMoney(guildId, userId, amount) {
    const safeAmount = parseInt(amount);
    if (isNaN(safeAmount)) {
        console.error(`[Lỗi Hệ Thống] Lượng tiền truyền vào addMoney bị NaN:`, amount);
        return 0;
    }
    return await addGuildMoney(guildId, userId, safeAmount);
}

async function getPetData(userId) {
    return await getUserPetData(userId);
}

async function savePetData(userId, data) {
    await saveUserPetData(userId, data);
}

async function updatePassiveIncome(guildId, userId, userPetData) {
    if (!userPetData.inventory || userPetData.inventory.length === 0) return 0;

    const activePet = userPetData.inventory.find(p => p.id === userPetData.activePetId);
    if (!activePet || activePet.food <= 0) return 0; 

    const now = Date.now();
    const timePassedMs = now - (userPetData.lastClaimTime || now);
    const minutesPassed = Math.floor(timePassedMs / (60 * 1000)); 

    if (minutesPassed > 0) {
        const petLevel = parseInt(activePet.level) || 1;

        const incomeMultiplier = activePet.premium ? Number(premiumBenefits.petIncomeMultiplier) || 2 : 1;
        const passiveMoneyEarned = Math.floor(minutesPassed * (petLevel * 0.1) * incomeMultiplier);

        const foodLoss = Math.floor(minutesPassed / 5);
        activePet.food = Math.max(0, activePet.food - foodLoss);

        userPetData.lastClaimTime = (userPetData.lastClaimTime || now) + (minutesPassed * 60 * 1000);

        if (passiveMoneyEarned > 0) {
            await addMoney(guildId, userId, passiveMoneyEarned);
        }
        
        await savePetData(userId, userPetData);
        return passiveMoneyEarned;
    }
    return 0;
}


const PRICE_BUY_PET = 10000;    
const PRICE_FOOD = 500;        
const COST_PER_LOCK_MINUTE = 100; 
const tromchoCooldowns = new Map();
const premiumBenefits = getSettings().vip?.benefits || {};

async function handlePetSystem(message) {
    const content = message.content.trim().toLowerCase();
    const args = message.content.trim().split(/\s+/);
    const userId = message.author.id;

    const petCommands = [
        '!pet', '!shop-pet', '!muapet', '!choan', '!nangcap', 
        '!help', '!petvip', '!tromcho', '!thave', '!khopet', '!laypet', 
        '!banpet', '!lockpet'
    ];
    if (!petCommands.some(cmd => content.startsWith(cmd))) return;

    const configuredPetChannel = process.env.KENH_NUOI_PET;
    if (configuredPetChannel && message.channel.id !== configuredPetChannel) {
        return message.reply(`❌ Kênh nuôi thú cưng chỉ mở tại phòng <#${configuredPetChannel}>!`).catch(() => {});
    }

    const guildId = message.guild?.id || 'global';
    let userPetData = await getPetData(userId);
    const premiumStatus = await getPremiumStatus(userId, message.guild?.id);

    const earned = await updatePassiveIncome(guildId, userId, userPetData);
    if (earned > 0) {
        await message.channel.send(`💰 **[Thu Nhập Thụ Động]** Thú cưng đang dắt đã mang về cho bạn **+${earned} Cowcoin**!`).catch(() => {});
    }

    let userMoney = await getMoney(guildId, userId);
    let activePet = userPetData.inventory.find(p => p.id === userPetData.activePetId);

    if (content === '!help') {
        let helpMsg = `📜 **HƯỚNG DẪN HỆ THỐNG THÚ CƯNG (PET)** 📜\n`;
        helpMsg += `-------------------------------------------\n`;
        helpMsg += `💸 *Cơ chế thu nhập: Thú cưng đang dắt sẽ tự động tạo ra tiền mỗi phút (Cần duy trì độ no).* \n\n`;
        helpMsg += `➔ \`!shop\` : Mở cửa hàng vật phẩm và thú cưng.\n`;
        helpMsg += `➔ \`!muapet [Tên]\` : Mua thú cưng mới (tự động chuyển vào kho).\n`;
        helpMsg += `➔ \`!pet\` : Xem thông tin thú cưng đang dắt theo.\n`;
        helpMsg += `➔ \`!choan\` / \`!nangcap\` : Chăm sóc và tăng cấp cho Pet.\n`;
        helpMsg += `➔ \`!khopet\` : Xem danh sách thú cưng đang sở hữu.\n`;
        helpMsg += `➔ \`!laypet [STT]\` : Đổi thú cưng xuất trận.\n`;
        helpMsg += `➔ \`!banpet [STT]\` : Bán bớt thú cưng trong kho thu về Cowcoin.\n`;
        helpMsg += `➔ \`!lockpet\` : Khóa bảo vệ 60s cho Pet đang dắt (Bảo vệ chống bị trộm chó. Gõ '!lockpet' để nhận 60s miễn phí).\n`;
        helpMsg += `➔ \`!lockpet [Số_Phút]\` : Dùng Cowcoin mua thêm thời gian bảo vệ cho Pet đang dắt.\n`;
        helpMsg += `➔ \`!lockpet [STT] [Số_Phút]\` : Mua thời gian bảo vệ cho Pet chỉ định trong kho.\n`;
        helpMsg += `➔ \`!tromcho [@User]\` : Tỉ lệ 30% trộm 1 Pet không được bảo vệ. Thất bại bị phạt tiền.\n`;
        helpMsg += `➔ \`!thave\` : Thả vĩnh viễn thú cưng đang dắt.\n`;
        helpMsg += `➔ \`!thave @User\` : Trả lại thú cưng cho chủ sở hữu ban đầu.\n`;
        helpMsg += `➔ \`!petvip\` : Nhận thú cưng Premium độc quyền (chỉ dành cho VIP).\n`;
        return message.reply(helpMsg).catch(() => {});
    }

    if (content === '!petvip') {
        if (!premiumStatus.active) {
            return message.reply('👑 Lệnh này dành riêng cho Wind Premium. Dùng `/vip mua` để mở khóa.');
        }
        if (userPetData.inventory.some(pet => pet.premium)) {
            return message.reply('✨ Bạn đã sở hữu Pet Premium độc quyền rồi.');
        }

        const premiumPet = {
            id: `premium_pet_${userId}_${Date.now()}`,
            name: 'Vệ Thần Wind (Premium)',
            level: Number(premiumBenefits.exclusivePetLevel) || 5,
            exp: 0,
            food: 100,
            originalOwner: userId,
            lockUntil: 0,
            premium: true
        };
        userPetData.inventory.push(premiumPet);
        if (!userPetData.activePetId) userPetData.activePetId = premiumPet.id;
        await savePetData(userId, userPetData);
        return message.reply(`👑 Bạn đã nhận **${premiumPet.name}** cấp ${premiumPet.level}! Pet này có thu nhập Premium x${premiumBenefits.petIncomeMultiplier || 2}.`);
    }

    if (content === '!shop-pet') {
        return message.reply("⚠️ Vui lòng sử dụng lệnh `/shop`").catch(() => {});
    }

    if (content.startsWith('!muapet')) {
        const petLimit = premiumStatus.active ? Number(premiumBenefits.petInventoryLimit) || 12 : 5;
        if (userPetData.inventory.length >= petLimit) {
            return message.reply(`🎒 Kho Pet đã đầy (**${petLimit}** Pet). VIP được mở rộng kho lên **${premiumBenefits.petInventoryLimit || 12}** Pet.`);
        }
        if (userMoney < PRICE_BUY_PET) return message.reply(`❌ Bạn không đủ **${PRICE_BUY_PET.toLocaleString()}** Cowcoin!`);

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
            originalOwner: userId,
            lockUntil: 0
        };

        await addMoney(guildId, userId, -PRICE_BUY_PET);
        userPetData.inventory.push(newPet);
        
        if (!userPetData.activePetId) {
            userPetData.activePetId = newPet.id;
        }

        await savePetData(userId, userPetData);
        return message.reply(`🎉 Bạn đã mua thành công **${newPet.name}**! Thú cưng đã được thêm vào kho và bắt đầu tạo tiền thụ động.`);
    }

    if (content.startsWith('!banpet')) {
        const index = parseInt(args[1]) - 1;
        if (isNaN(index) || index < 0 || index >= userPetData.inventory.length) {
            return message.reply(`❌ Vui lòng nhập đúng số thứ tự Pet trong kho muốn bán (Ví dụ: \`!banpet 1\`).`);
        }

        const targetSellPet = userPetData.inventory[index];
        const sellPrice = Math.floor((PRICE_BUY_PET * 0.5) + (targetSellPet.level * 1000));

        message.reply(`💰 Bạn có chắc muốn bán **${targetSellPet.name}** (Cấp ${targetSellPet.level}) với giá **${sellPrice.toLocaleString()} Cowcoin** không?\nGõ \`ok\` trong 15 giây để xác nhận.`);

        const filter = m => m.author.id === userId && m.content.toLowerCase() === 'ok';
        message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
            .then(async () => {
                userPetData.inventory.splice(index, 1);
                if (userPetData.activePetId === targetSellPet.id) {
                    userPetData.activePetId = userPetData.inventory[0]?.id || null;
                }
                await savePetData(userId, userPetData);
                await addMoney(guildId, userId, sellPrice);

                return message.channel.send(`💵 <@${userId}> đã bán thành công **${targetSellPet.name}** và nhận lại **+${sellPrice.toLocaleString()} Cowcoin**!`);
            }).catch(() => message.reply(`❌ Đã hủy thao tác bán Pet.`));
        return;
    }

    if (content.startsWith('!lockpet')) {
        let targetPet = null;
        let extraMinutes = 0;

        if (args.length === 1) {
            targetPet = activePet;
        } 
        else if (args.length === 2) {
            const param = parseInt(args[1]);
            if (isNaN(param) || param <= 0) {
                return message.reply(`❌ Tham số không hợp lệ! Vui lòng nhập STT Pet hoặc số phút muốn gia hạn.`);
            }
            
            if (param <= userPetData.inventory.length) {
                targetPet = userPetData.inventory[param - 1];
            } else {
                targetPet = activePet;
                extraMinutes = param;
            }
        } 
        else if (args.length >= 3) {
            const index = parseInt(args[1]) - 1;
            if (isNaN(index) || index < 0 || index >= userPetData.inventory.length) {
                return message.reply(`❌ Không tìm thấy Pet ở vị trí số **${args[1]}** trong kho!`);
            }
            targetPet = userPetData.inventory[index];
            extraMinutes = parseInt(args[2]) || 0;
        }

        if (!targetPet) {
            return message.reply(`❌ Bạn chưa dắt Pet nào! Hãy gõ \`!khopet\` và gõ \`!laypet [STT]\` trước.`);
        }

        const now = Date.now();
        const currentLockTime = Math.max(targetPet.lockUntil || 0, now);

        if (extraMinutes <= 0) {
            targetPet.lockUntil = currentLockTime + (60 * 1000);
            await savePetData(userId, userPetData);

            const totalSecs = Math.ceil((targetPet.lockUntil - now) / 1000);
            return message.reply(`🔒 **[Bảo vệ Pet]** Đã cộng thêm **60 giây** bảo vệ chống trộm cho **${targetPet.name}**!\n⏱️ Tổng thời gian khóa còn lại: **${totalSecs} giây**.`);
        }

        const cost = extraMinutes * COST_PER_LOCK_MINUTE;
        if (userMoney < cost) {
            return message.reply(`❌ Bạn không đủ Cowcoin! Gia hạn **${extraMinutes} phút** bảo vệ cần **${cost.toLocaleString()} Cowcoin**.`);
        }

        await addMoney(guildId, userId, -cost);
        targetPet.lockUntil = currentLockTime + (extraMinutes * 60 * 1000);
        await savePetData(userId, userPetData);

        const totalMins = Math.ceil((targetPet.lockUntil - now) / (60 * 1000));
        return message.reply(`🛡️ **[Nâng Cấp Bảo Vệ]** Đã tốn **${cost.toLocaleString()} Cowcoin** gia hạn thêm **${extraMinutes} phút** cho **${targetPet.name}**!\n⏱️ Tổng thời gian khóa hiện tại: **${totalMins} phút**.`);
    }

    if (content === '!khopet') {
        if (userPetData.inventory.length === 0) return message.reply(`🎒 Kho thú cưng của bạn đang trống.`);
        
        let invMsg = `🎒 **KHO THÚ CƯNG CỦA ${message.author.username.toUpperCase()}** 🎒\n`;
        invMsg += `-------------------------------------------\n\n`;
        
        const now = Date.now();
        userPetData.inventory.forEach((petItem, index) => {
            const isActive = petItem.id === userPetData.activePetId ? "👉 [ĐANG DẮT]" : "";
            const isStolen = petItem.originalOwner !== userId ? " 🏴‍☠️ (Thú Trộm)" : "";
            
            let lockStatus = "";
            if (petItem.lockUntil && petItem.lockUntil > now) {
                const diffSecs = Math.ceil((petItem.lockUntil - now) / 1000);
                lockStatus = diffSecs > 60 
                    ? ` 🔒 (${Math.ceil(diffSecs / 60)} phút)` 
                    : ` 🔒 (${diffSecs}s)`;
            }

            invMsg += `**${index + 1}.** ${petItem.name} - Cấp ${petItem.level} ${isActive}${isStolen}${lockStatus}\n`;
        });
        invMsg += `-------------------------------------------\n💡 Dùng \`!laypet [STT]\` để đổi, \`!lockpet [STT]\` để khóa, \`!banpet [STT]\` để bán.`;
        return message.reply(invMsg);
    }

    if (content.startsWith('!laypet')) {
        const index = parseInt(args[1]) - 1;
        if (isNaN(index) || index < 0 || index >= userPetData.inventory.length) {
            return message.reply(`❌ Vui lòng nhập đúng số thứ tự của Pet trong kho (Ví dụ: \`!laypet 2\`).`);
        }

        userPetData.activePetId = userPetData.inventory[index].id;
        await savePetData(userId, userPetData);
        
        return message.reply(`🔄 Bạn đã đổi sang dắt **${userPetData.inventory[index].name}**!`);
    }

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

        const targetPetData = await getPetData(targetUser.id);
        await updatePassiveIncome(guildId, targetUser.id, targetPetData);

        if (targetPetData.inventory.length === 0) {
            return message.reply(`❌ Trong kho của **${targetUser.username}** không có thú cưng nào.`);
        }

        const now = Date.now();
        const stealablePets = targetPetData.inventory.filter(p => !p.lockUntil || p.lockUntil <= now);

        if (stealablePets.length === 0) {
            return message.reply(`🛡️ Tất cả thú cưng của **${targetUser.username}** đều đang được khóa bảo vệ! Không thể trộm.`);
        }

        tromchoCooldowns.set(userId, Date.now());

        if (Math.random() <= 0.30) {
            const randomPetIndex = Math.floor(Math.random() * stealablePets.length);
            const stolenPet = stealablePets[randomPetIndex];

            targetPetData.inventory = targetPetData.inventory.filter(p => p.id !== stolenPet.id);
            if (targetPetData.activePetId === stolenPet.id) {
                targetPetData.activePetId = targetPetData.inventory[0]?.id || null;
            }
            await savePetData(targetUser.id, targetPetData);

            stolenPet.lockUntil = 0;
            userPetData.inventory.push(stolenPet);
            await savePetData(userId, userPetData);

            return message.reply(`🥷 **TRỘM THÀNH CÔNG!** Bạn đã lấy mất con **${stolenPet.name}** (Cấp ${stolenPet.level}) từ kho của <@${targetUser.id}>!`);
        } else {
            const fine = 2000;
            await addMoney(guildId, userId, -fine);
            await addMoney(guildId, targetUser.id, fine); 

            return message.reply(`🚨 **BỊ BẮT QUẢ TANG!** Bạn trộm hụt và bị phát hiện. Bạn phải bồi thường **${fine.toLocaleString()} Cowcoin** trực tiếp cho <@${targetUser.id}>!`);
        }
    }

    if (!activePet) {
        return message.reply(`🐶 Bạn chưa dắt thú cưng nào! Dùng \`!khopet\` và gõ \`!laypet [STT]\` để chọn Pet.`);
    }

    if (content.startsWith('!thave')) {
        const targetMention = message.mentions.users.first();

        if (targetMention) {
            if (activePet.originalOwner !== targetMention.id) {
                return message.reply(`❌ **${activePet.name}** không phải do <@${targetMention.id}> sở hữu ban đầu!`);
            }

            message.reply(`🤝 Bạn có chắc muốn trả lại **${activePet.name}** cho <@${targetMention.id}> không?\nGõ \`ok\` trong 15 giây để xác nhận.`);
            
            const filter = m => m.author.id === userId && m.content.toLowerCase() === 'ok';
            message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
                .then(async () => {
                    userPetData.inventory = userPetData.inventory.filter(p => p.id !== activePet.id);
                    userPetData.activePetId = userPetData.inventory[0]?.id || null;
                    await savePetData(userId, userPetData);

                    const originalOwnerData = await getPetData(targetMention.id);
                    await updatePassiveIncome(guildId, targetMention.id, originalOwnerData);
                    
                    originalOwnerData.inventory.push(activePet);
                    if (!originalOwnerData.activePetId) originalOwnerData.activePetId = activePet.id;
                    await savePetData(targetMention.id, originalOwnerData);

                    return message.channel.send(`🕊️ <@${userId}> đã trả lại thú cưng **${activePet.name}** cho <@${targetMention.id}> thành công.`);
                }).catch(() => message.reply(`❌ Đã hủy lệnh trả Pet.`));
            return;
        }

        message.reply(`🍂 Bạn có chắc muốn thả **${activePet.name}** đi không?\nGõ \`ok\` trong 15 giây để xác nhận.`);
        
        const filter = m => m.author.id === userId && m.content.toLowerCase() === 'ok';
        message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
            .then(async () => {
                userPetData.inventory = userPetData.inventory.filter(p => p.id !== activePet.id);
                userPetData.activePetId = userPetData.inventory[0]?.id || null;
                await savePetData(userId, userPetData);
                return message.channel.send(`🕊️ Bạn đã thả **${activePet.name}** về tự nhiên.`);
            }).catch(() => message.reply(`❌ Đã hủy thả thú cưng.`));
        return;
    }

    if (content === '!pet') {
        const expNeeded = activePet.level * 100;
        const now = Date.now();
        
        let lockInfo = " 🔓 (Không khóa)";
        if (activePet.lockUntil && activePet.lockUntil > now) {
            const diffSecs = Math.ceil((activePet.lockUntil - now) / 1000);
            lockInfo = diffSecs > 60 
                ? ` 🔒 (Đang bảo vệ còn ${Math.ceil(diffSecs / 60)} phút)` 
                : ` 🔒 (Đang bảo vệ còn ${diffSecs}s)`;
        }

        let petMsg = `🐾 **THÔNG TIN THÚ CƯNG CỦA ${message.author.username.toUpperCase()}** 🐾\n`;
        petMsg += `-------------------------------------------\n`;
        petMsg += `🏷️ **Tên:** ${activePet.name}\n`;
        petMsg += `⭐ **Cấp độ:** Cấp ${activePet.level} *(Tạo ra: +${(activePet.level * 0.1).toFixed(1)} Cowcoin/phút)*\n`;
        petMsg += `✨ **Kinh nghiệm:** [${activePet.exp}/${expNeeded}] EXP\n`;
        
        let foodBar = "🍖 " + "🟩".repeat(Math.ceil(activePet.food / 10)) + "⬜".repeat(10 - Math.ceil(activePet.food / 10)) + ` (${activePet.food}/100)`;
        if (activePet.food <= 30) foodBar += " ⚠️ *Đang đói!*";
        petMsg += `🍖 **Độ no:** ${foodBar}\n`;
        petMsg += `🛡️ **Trạng thái:** ${lockInfo}\n`;
        petMsg += `👤 **Chủ ban đầu:** <@${activePet.originalOwner}>\n\n`;
        petMsg += `💡 *Dùng lệnh \`!khopet\` để xem danh sách thú cưng.*`;

        await savePetData(userId, userPetData);
        return message.reply(petMsg).catch(() => {});
    }

    if (content === '!choan') {
        if (activePet.food >= 100) return message.reply(`❌ **${activePet.name}** đã no rồi!`);
        if (userMoney < PRICE_FOOD) return message.reply(`❌ Bạn không đủ **${PRICE_FOOD.toLocaleString()}** Cowcoin!`);

        await addMoney(guildId, userId, -PRICE_FOOD);
        const foodBonus = premiumStatus.active ? Number(premiumBenefits.petFoodBonus) || 20 : 0;
        activePet.food = Math.min(100, activePet.food + 30 + foodBonus);
        activePet.exp += 15; 
        
        const expNeeded = activePet.level * 100;
        let upLevelText = "";
        if (activePet.exp >= expNeeded) {
            activePet.exp -= expNeeded;
            activePet.level += 1;
            upLevelText = `\n✨ **THĂNG CẤP!** Thú cưng đã lên **Cấp ${activePet.level}**! Tốc độ tạo tiền tăng lên!`;
        }

        await savePetData(userId, userPetData);
        return message.reply(`🍖 Bạn tốn **${PRICE_FOOD.toLocaleString()}** Cowcoin mua thức ăn cho **${activePet.name}**. Độ no: **${activePet.food}/100** (+${premiumStatus.active ? `15 EXP, +${foodBonus} bonus Premium` : '15 EXP'}).${upLevelText}`);
    }

    if (content === '!nangcap') {
        const expNeeded = activePet.level * 100;
        const upgradeCost = activePet.level * 3000;

        if (userMoney < upgradeCost) return message.reply(`❌ Chi phí nâng cấp cần **${upgradeCost.toLocaleString()}** Cowcoin.`);
        if (activePet.food < 40) return message.reply(`❌ Thú cưng đang đói, hãy cho ăn trước khi nâng cấp!`);

        await addMoney(guildId, userId, -upgradeCost);
        activePet.exp += 150; 
        
        let responseText = `⚡ Dùng **${upgradeCost.toLocaleString()}** Cowcoin nâng cấp cho **${activePet.name}** (+150 EXP).\n`;

        if (activePet.exp >= expNeeded) {
            activePet.exp -= expNeeded;
            activePet.level += 1;
            responseText += `🎉 **LÊN CẤP THÀNH CÔNG!** Thú cưng đạt **Cấp ${activePet.level}**!`;
        } else {
            responseText += `✨ Kinh nghiệm: **[${activePet.exp}/${expNeeded}]** EXP.`;
        }

        await savePetData(userId, userPetData);
        return message.reply(responseText).catch(() => {});
    }
}

module.exports = { handlePetSystem };