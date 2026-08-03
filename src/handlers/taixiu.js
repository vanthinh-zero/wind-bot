const fs = require('fs');
const path = require('path');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const dbPath = path.join(__dirname, '../../money.json');
const INFINITY_SYMBOL = '∞'; // Ký hiệu vô cực

function readDatabase() {
    try {
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify({}), 'utf8');
        }
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("❌ Lỗi đọc file money.json:", error);
        return {};
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error("❌ Lỗi ghi file money.json:", error);
    }
}

function getUserData(userId) {
    const ADMIN_ID = process.env.ADMIN_ID;
    const db = readDatabase();
    
    // Nếu là ADMIN_ID, trả về vô cực
    if (ADMIN_ID && userId === ADMIN_ID) {
        return {
            balance: INFINITY_SYMBOL,
            lastDaily: db[userId]?.lastDaily || null
        };
    }

    if (!db[userId]) {
        db[userId] = {
            balance: 0,
            lastDaily: null
        };
        writeDatabase(db);
    }
    if (typeof db[userId] === 'number') {
        db[userId] = { balance: db[userId], lastDaily: null };
        writeDatabase(db);
    }
    return db[userId];
}

function getMoney(userId) {
    const ADMIN_ID = process.env.ADMIN_ID;
    // Nếu là ADMIN_ID, luôn trả về ∞
    if (ADMIN_ID && userId === ADMIN_ID) {
        return INFINITY_SYMBOL;
    }
    return getUserData(userId).balance;
}

// Hàm format hiển thị gọn gàng
function formatMoney(amount) {
    if (amount === INFINITY_SYMBOL || typeof amount === 'string') {
        return amount;
    }
    return Number(amount).toLocaleString();
}

function addMoney(userId, amount) {
    const ADMIN_ID = process.env.ADMIN_ID;
    // Nếu là ADMIN_ID, giữ nguyên không bao giờ trừ hay cộng
    if (ADMIN_ID && userId === ADMIN_ID) {
        return;
    }

    const db = readDatabase();
    getUserData(userId);
    db[userId].balance += amount;
    writeDatabase(db);
}

function rollDice() {
    return [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
    ];
}

async function handleTaiXiuGame(message) {
    const ADMIN_ID = process.env.ADMIN_ID;
    const content = message.content.trim();
    const args = content.split(/\s+/);
    const command = args[0].toLowerCase();

    const isGameCmd = command === '!taixiu';
    const isWalletCmd = command === '!vi' || command === '!money' || command === '!ccash' || command === '!cash';
    const isDailyCmd = command === '!diemdanh' || command === '!daily';
    const isTransferCmd = command === '!chuyentien';
    const isThuHoiCmd = command === '!thuhoi';

    if (!isGameCmd && !isWalletCmd && !isDailyCmd && !isTransferCmd && !isThuHoiCmd) return;

    const configuredGameChannel = process.env.KENH_TAI_XIU;
    if (isGameCmd && configuredGameChannel && message.channel.id !== configuredGameChannel) {
        return message.reply(`❌ Trò chơi Tài Xỉu chỉ hoạt động tại kênh <#${configuredGameChannel}>!`).catch(() => {});
    }

    // =========================================================
    // 💰 1. LỆNH KIỂM TRA VÍ TIỀN
    // =========================================================
    if (isWalletCmd) {
        const targetUser = message.mentions.users.first() || 
                           (args[1] ? await message.client.users.fetch(args[1]).catch(() => null) : null) || 
                           message.author;

        if (!targetUser) {
            return message.reply('❌ Không tìm thấy thông tin người dùng này!').catch(() => {});
        }

        const currentMoney = formatMoney(getMoney(targetUser.id));
        
        if (targetUser.id === message.author.id) {
            return message.reply(`💰 Bạn đang có **${currentMoney}** Cowcoin trong tài khoản.`).catch(() => {});
        } else {
            return message.reply(`💰 Số dư của **${targetUser.username}** là **${currentMoney}** Cowcoin.`).catch(() => {});
        }
    }

    // =========================================================
    // 🎁 2. LỆNH ĐIỂM DANH HẰNG NGÀY
    // =========================================================
    if (isDailyCmd) {
        const db = readDatabase();
        const userData = getUserData(message.author.id);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (userData.lastDaily && (now - userData.lastDaily < oneDay)) {
            const timeLeft = oneDay - (now - userData.lastDaily);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return message.reply(`⏳ Bạn đã điểm danh hôm nay rồi. Quay lại sau **${hours} giờ ${minutes} phút** nữa nhé!`).catch(() => {});
        }

        addMoney(message.author.id, 100);
        if (!db[message.author.id]) db[message.author.id] = {};
        db[message.author.id].lastDaily = now;
        writeDatabase(db);

        const currentBalance = formatMoney(getMoney(message.author.id));
        return message.reply(`🎉 Điểm danh thành công! Bạn nhận được **+100** Cowcoin. Số dư hiện tại: **${currentBalance}** Cowcoin.`).catch(() => {});
    }

    // =========================================================
    // 💸 3. LỆNH CHUYỂN TIỀN
    // =========================================================
    if (isTransferCmd) {
        const targetUser = message.mentions.users.first();
        const transferAmount = parseInt(args[args.length - 1]);

        if (args.length < 3 || !targetUser) {
            return message.reply('📝 **Cú pháp chuyển tiền:**\n`!chuyentien @tên_người_nhận [số tiền]`\n*Ví dụ:* `!chuyentien @UserA 500`').catch(() => {});
        }

        if (targetUser.id === message.author.id) {
            return message.reply('❌ Bạn không thể tự chuyển tiền cho chính mình!').catch(() => {});
        }

        if (targetUser.bot) {
            return message.reply('❌ Không thể chuyển tiền cho Bot!').catch(() => {});
        }

        if (isNaN(transferAmount) || transferAmount <= 0) {
            return message.reply('❌ Số tiền muốn chuyển phải là một số nguyên dương!').catch(() => {});
        }

        const senderMoney = getMoney(message.author.id);
        
        if (message.author.id !== ADMIN_ID && senderMoney < transferAmount) {
            return message.reply(`❌ Bạn chỉ có **${formatMoney(senderMoney)}** Cowcoin, không đủ để chuyển **${formatMoney(transferAmount)}** Cowcoin!`).catch(() => {});
        }

        addMoney(message.author.id, -transferAmount);
        addMoney(targetUser.id, transferAmount);

        return message.reply(`💸 Chuyển tiền thành công! **${message.author.username}** đã chuyển **${formatMoney(transferAmount)}** Cowcoin cho **${targetUser.username}**!`).catch(() => {});
    }

    // =========================================================
    // 🔨 4. LỆNH THU HỒI COWCOIN (ADMIN)
    // =========================================================
    if (isThuHoiCmd) {
        const isBotAdmin = message.author.id === ADMIN_ID;
        const hasModPerms = message.member.permissions.has(PermissionsBitField.Flags.ManageMessages);

        if (!isBotAdmin && !hasModPerms) {
            return message.reply('❌ Bạn không có quyền thực hiện lệnh thu hồi tiền!').catch(() => {});
        }

        const targetUser = message.mentions.users.first() || 
                           (args[1] ? await message.client.users.fetch(args[1]).catch(() => null) : null);
        
        if (!targetUser) {
            return message.reply('❌ Vui lòng tag hoặc nhập ID người cần thu hồi!\nCú pháp: `!thuhoi @Tên <số_cowcoin>`').catch(() => {});
        }

        const thuHoiAmount = parseInt(args[2]);
        if (isNaN(thuHoiAmount) || thuHoiAmount <= 0) {
            return message.reply('❌ Số lượng tiền cần thu hồi phải là một số nguyên dương!').catch(() => {});
        }

        const targetMoney = getMoney(targetUser.id);
        if (targetUser.id !== ADMIN_ID && targetMoney < thuHoiAmount) {
            return message.reply(`⚠️ Số dư của người này chỉ còn **${formatMoney(targetMoney)}** Cowcoin, không đủ để thu hồi **${formatMoney(thuHoiAmount)}** Cowcoin!`).catch(() => {});
        }

        addMoney(targetUser.id, -thuHoiAmount);
        const remainingMoney = formatMoney(getMoney(targetUser.id));

        const thuHoiEmbed = new EmbedBuilder()
            .setColor('#ff3333')
            .setTitle(' THU HỒI COWCOIN')
            .setDescription(`Một lượng Cowcoin đã được thu hồi bởi Quản trị viên.`)
            .addFields(
                { name: '👤 Người bị thu hồi', value: `${targetUser} (${targetUser.tag})`, inline: true },
                { name: '🔨 Người thực thi', value: `${message.author}`, inline: true },
                { name: '📉 Số tiền thu hồi', value: `-\`${formatMoney(thuHoiAmount)}\` Cowcoin`, inline: false },
                { name: '💰 Số dư còn lại', value: `\`${remainingMoney}\` Cowcoin`, inline: false }
            )
            .setTimestamp();

        return message.channel.send({ embeds: [thuHoiEmbed] }).catch(() => {});
    }

    // =========================================================
    // 🎲 5. GAME TÀI XỈU
    // =========================================================
    if (isGameCmd) {
        if (args.length < 3) {
            return message.reply('📝 **Cú pháp chơi Tài Xỉu:**\n`!taixiu [tai/xiu] [số tiền]`\n*Ví dụ:* `!taixiu tai 500` hoặc `!taixiu xiu all`').catch(() => {});
        }

        const luaChon = args[1].toLowerCase();
        const tienCuocStr = args[2];
        const userMoney = getMoney(message.author.id);

        if (luaChon !== 'tai' && luaChon !== 'xiu') {
            return message.reply('❌ Bạn chỉ có thể đặt cược vào `tai` hoặc `xiu`!').catch(() => {});
        }

        let tienCuoc = 0;
        if (tienCuocStr.toLowerCase() === 'all' || tienCuocStr.toLowerCase() === 'allin') {
            tienCuoc = message.author.id === ADMIN_ID ? 1000000000 : userMoney;
        } else {
            tienCuoc = parseInt(tienCuocStr);
        }

        if (isNaN(tienCuoc) || tienCuoc <= 0) {
            return message.reply('❌ Số tiền cược phải là một số nguyên dương!').catch(() => {});
        }

        if (message.author.id !== ADMIN_ID && userMoney < tienCuoc) {
            return message.reply(`❌ Bạn chỉ còn **${formatMoney(userMoney)}** Cowcoin, không đủ tiền cược **${formatMoney(tienCuoc)}**! Hãy gõ \`!diemdanh\` để nhận thưởng hằng ngày.`).catch(() => {});
        }

        message.channel.send(`🎲 **${message.author.username}** đã đặt cược **${formatMoney(tienCuoc)}** Cowcoin... Đang lắc xúc xắc!`).then(async (msg) => {
            
            setTimeout(async () => {
                const dices = rollDice();
                const tongDiem = dices[0] + dices[1] + dices[2];
                const ketQua = (tongDiem >= 11) ? 'tai' : 'xiu';
                const ketQuaText = (ketQua === 'tai') ? '🔴 TÀI' : '🔵 XỈU';

                let responseText = `🎲 **KẾT QUẢ XÚC XẮC:**\n`;
                responseText += `| ${dices[0]} | ${dices[1]} | ${dices[2]} | ➔ **Tổng điểm:** ${tongDiem} (${ketQuaText})\n\n`;

                if (luaChon === ketQua) {
                    const TAX_RATE = 0.05;
                    const realWinnings = Math.floor(tienCuoc * (1 - TAX_RATE));

                    addMoney(message.author.id, realWinnings);
                    const moneySauKhiThang = formatMoney(getMoney(message.author.id));
                    responseText += `🎉 **Thắng rồi!** Bạn đã đoán đúng và nhận **+${formatMoney(realWinnings)}** Cowcoin *(Đã trừ 5% thuế sàn)*!\n💰 Số dư hiện tại: **${moneySauKhiThang}** Cowcoin.`;
                } else {
                    addMoney(message.author.id, -tienCuoc);
                    const moneySauKhiThua = formatMoney(getMoney(message.author.id));
                    responseText += `💸 **Thua rồi!** Bạn đoán sai và bị trừ **-${formatMoney(tienCuoc)}** Cowcoin!\n💰 Số dư hiện tại: **${moneySauKhiThua}** Cowcoin.`;
                }

                await msg.edit(responseText).catch(() => {});
            }, 2000);

        }).catch(() => {});
    }
}

module.exports = { handleTaiXiuGame };