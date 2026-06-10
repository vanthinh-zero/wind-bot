// src/handlers/taixiu.js
const fs = require('fs');
const path = require('path');

// Đường dẫn trỏ tới file money.json ở thư mục gốc
const dbPath = path.join(__dirname, '../../money.json');

// Hàm đọc dữ liệu từ file JSON
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

// Hàm ghi (lưu) dữ liệu vào file JSON
function writeDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error("❌ Lỗi ghi file money.json:", error);
    }
}

// Hàm lấy dữ liệu tài khoản (Nếu chưa có tài khoản, khởi tạo bằng 0 linh thạch)
function getUserData(userId) {
    const db = readDatabase();
    if (!db[userId]) {
        db[userId] = {
            balance: 0,      // Mặc định ban đầu có 0 linh thạch
            lastDaily: null  // Thời gian điểm danh gần nhất
        };
        writeDatabase(db);
    }
    // Hỗ trợ nếu dữ liệu cũ chỉ là một con số, chuyển đổi sang Object mới
    if (typeof db[userId] === 'number') {
        db[userId] = { balance: db[userId], lastDaily: null };
        writeDatabase(db);
    }
    return db[userId];
}

// Hàm lấy số tiền hiện tại
function getMoney(userId) {
    return getUserData(userId).balance;
}

// Hàm cộng hoặc trừ tiền của một người (Không reset về 2000 khi âm/hết tiền)
function addMoney(userId, amount) {
    const db = readDatabase();
    getUserData(userId); // Đảm bảo tài khoản đã được khởi tạo trong db
    db[userId].balance += amount;
    writeDatabase(db);
}

// Hàm mô phỏng đổ 3 viên xúc xắc
function rollDice() {
    return [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
    ];
}

async function handleTaiXiuGame(message) {
    const content = message.content.trim();

    // Lọc danh sách các lệnh được phép sử dụng trong hệ thống kinh tế này
    const isGameCmd = content.startsWith('!taixiu');
    const isWalletCmd = content === '!vi' || content === '!money';
    const isDailyCmd = content === '!diemdanh' || content === '!daily';
    const isTransferCmd = content.startsWith('!chuyentien');

    if (!isGameCmd && !isWalletCmd && !isDailyCmd && !isTransferCmd) return;

    // =========================================================
    // 🔒 BƯỚC KIỂM TRA: CHỈ CHO PHÉP HOẠT ĐỘNG TẠI KÊNH CẤU HÌNH TRONG .ENV
    // =========================================================
    const configuredGameChannel = process.env.KENH_TAI_XIU;
    if (configuredGameChannel && message.channel.id !== configuredGameChannel) {
        return message.reply(`❌ Đạo hữu ơi, các tính năng thử vận may và tiền tệ chỉ mở tại kênh <#${configuredGameChannel}> thôi nhé!`).catch(() => {});
    }

    // =========================================================
    // 💰 1. LỆNH KIỂM TRA VÍ TIỀN: !vi hoặc !money
    // =========================================================
    if (isWalletCmd) {
        const currentMoney = getMoney(message.author.id);
        return message.reply(`💰 Kính chào đạo hữu, hiện tại trong túi của người đang có **${currentMoney}** linh thạch.`).catch(() => {});
    }

    // =========================================================
    // 🎁 2. LỆNH ĐIỂM DANH MỖI NGÀY NHẬN 100 LINH THẠCH: !diemdanh hoặc !daily
    // =========================================================
    if (isDailyCmd) {
        const db = readDatabase();
        const userData = getUserData(message.author.id);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 24 giờ tính theo mili-giây

        if (userData.lastDaily && (now - userData.lastDaily < oneDay)) {
            const timeLeft = oneDay - (now - userData.lastDaily);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return message.reply(`⏳ Đạo hữu đã nhận bổng lộc hôm nay rồi. Vui lòng quay lại sau **${hours} giờ ${minutes} phút** nữa!`).catch(() => {});
        }

        // Tiến hành cộng tiền điểm danh
        db[message.author.id].balance += 100;
        db[message.author.id].lastDaily = now;
        writeDatabase(db);

        return message.reply(`🎉 Điểm danh thành công! Đạo hữu nhận được **+100** linh thạch từ thiên địa. Số dư hiện tại: **${db[message.author.id].balance}** linh thạch.`).catch(() => {});
    }

    // =========================================================
    // 💸 3. LỆNH CHUYỂN TIỀN CHO NGƯỜI KHÁC: !chuyentien @user [số tiền]
    // =========================================================
    if (isTransferCmd) {
        const args = content.split(/\s+/);
        const targetUser = message.mentions.users.first();
        const transferAmount = parseInt(args[args.length - 1]);

        if (args.length < 3 || !targetUser) {
            return message.reply('📝 **Cách chuyển linh thạch:**\n`!chuyentien @tên_người_nhận [số tiền]`\n*Ví dụ:* `!chuyentien @ĐạoHữuA 500`').catch(() => {});
        }

        if (targetUser.id === message.author.id) {
            return message.reply('❌ Đạo hữu không thể tự chuyển khoản linh thạch cho chính mình!').catch(() => {});
        }

        if (targetUser.bot) {
            return message.reply('❌ Không thể chuyển linh thạch cho búp bê tâm linh (Bot)!').catch(() => {});
        }

        if (isNaN(transferAmount) || transferAmount <= 0) {
            return message.reply('❌ Số tiền muốn chuyển phải là một số nguyên dương hợp lệ!').catch(() => {});
        }

        const senderMoney = getMoney(message.author.id);
        if (senderMoney < transferAmount) {
            return message.reply(`❌ Trong túi đạo hữu chỉ còn **${senderMoney}** linh thạch, không đủ để chuyển đi **${transferAmount}** linh thạch!`).catch(() => {});
        }

        // Thực hiện chuyển khoản
        addMoney(message.author.id, -transferAmount);
        addMoney(targetUser.id, transferAmount);

        return message.reply(`💸 Giao dịch thành công! Đạo hữu **${message.author.username}** đã chuyển **${transferAmount}** linh thạch sang túi của **${targetUser.username}**!`).catch(() => {});
    }

    // =========================================================
    // 🎲 4. LOGIC CHƠI GAME TÀI XỈU: !taixiu [tai/xiu] [số tiền]
    // =========================================================
    if (isGameCmd) {
        const args = content.split(/\s+/);
        if (args.length < 3) {
            return message.reply('📝 **Cách chơi Tài Xỉu:**\n`!taixiu [tai/xiu] [số tiền]`\n*Ví dụ:* `!taixiu tai 500` hoặc `!taixiu xiu all`').catch(() => {});
        }

        const luaChon = args[1].toLowerCase();
        const tienCuocStr = args[2];
        const userMoney = getMoney(message.author.id);

        if (luaChon !== 'tai' && luaChon !== 'xiu') {
            return message.reply('❌ Đạo hữu chỉ có thể đặt cược vào `tai` hoặc `xiu`!').catch(() => {});
        }

        let tienCuoc = 0;
        if (tienCuocStr.toLowerCase() === 'all' || tienCuocStr.toLowerCase() === 'allin') {
            tienCuoc = userMoney;
        } else {
            tienCuoc = parseInt(tienCuocStr);
        }

        if (isNaN(tienCuoc) || tienCuoc <= 0) {
            return message.reply('❌ Số tiền đặt cược phải là một số nguyên dương hợp lệ!').catch(() => {});
        }

        if (userMoney < tienCuoc) {
            return message.reply(`❌ Trong túi đạo hữu chỉ còn **${userMoney}** linh thạch, không đủ tiền cược **${tienCuoc}**! Hãy gõ ` + '`!diemdanh` ' + `để xin trợ cấp từ thiên địa.`).catch(() => {});
        }

        message.channel.send(`🎲 **${message.author.username}** đặt cược **${tienCuoc}** linh thạch... Thiên địa xoay vần!`).then(async (msg) => {
            
            setTimeout(async () => {
                const dices = rollDice();
                const tongDiem = dices[0] + dices[1] + dices[2];
                const ketQua = (tongDiem >= 11) ? 'tai' : 'xiu';
                const ketQuaText = (ketQua === 'tai') ? '🔴 TÀI' : '🔵 XỈU';

                let responseText = `🎲 **KẾT QUẢ XÚC XẮC:**\n`;
                responseText += `| ${dices[0]} | ${dices[1]} | ${dices[2]} | ➔ **Tổng điểm:** ${tongDiem} (${ketQuaText})\n\n`;

                if (luaChon === ketQua) {
                    addMoney(message.author.id, tienCuoc);
                    const moneySauKhiThang = getMoney(message.author.id);
                    responseText += `🎉 **Chúc mừng!** Đạo hữu đã đoán chính xác, nhận thêm **+${tienCuoc}** linh thạch!\n💰 Số dư hiện tại: **${moneySauKhiThang}** linh thạch.`;
                } else {
                    addMoney(message.author.id, -tienCuoc);
                    const moneySauKhiThua = getMoney(message.author.id);
                    responseText += `💸 **Rất tiếc!** Đạo hữu đã đoán sai, tổn hao **-${tienCuoc}** linh thạch!\n💰 Số dư hiện tại: **${moneySauKhiThua}** linh thạch.`;
                }

                await msg.edit(responseText).catch(() => {});
            }, 2000);

        }).catch(() => {});
    }
}

module.exports = { handleTaiXiuGame };