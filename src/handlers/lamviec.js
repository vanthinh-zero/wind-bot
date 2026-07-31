const fs = require('fs');
const path = require('path');

// Import các linh kiện Nút Bấm từ Discord.js để chống AHK
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

// Đường dẫn tới file money.json của bạn
const moneyPath = path.join(__dirname, '../../money.json'); 

// =========================================================
// 🛡️ HÀM ĐỌC/GHI TIỀN - TỰ ĐỘNG PHÁT HIỆN VÀ FIX LỖI OBJECT
// =========================================================
function getMoneyData() {
    if (!fs.existsSync(moneyPath)) fs.writeFileSync(moneyPath, JSON.stringify({}), 'utf8');
    try {
        let db = JSON.parse(fs.readFileSync(moneyPath, 'utf8'));

        // TRƯỜNG HỢP ĐẶC BIỆT: Tự động giải cứu tài khoản của bạn nếu bị lỗi chuỗi
        const myId = "910001518328033301";
        if (db[myId] && (typeof db[myId] !== 'object' || String(db[myId]).includes('[object'))) {
            console.log(`[Hệ Thống] Phát hiện tài khoản ${myId} bị lỗi cấu trúc chuỗi. Đang tự động sửa...`);
            db[myId] = {
                balance: 150126, // Cứu lại số tiền gốc của bạn
                money: 150126,
                job: "daotach",  // Cấp lại nghề Đạo Tặc
                lastDaily: null
            };
            fs.writeFileSync(moneyPath, JSON.stringify(db, null, 4), 'utf8');
        }

        return db;
    } catch (e) {
        console.error("[Cảnh báo] File money.json bị lỗi cấu trúc nghiêm trọng. Đang tự khôi phục file sạch.");
        fs.writeFileSync(moneyPath, JSON.stringify({}), 'utf8');
        return {};
    }
}

function saveMoneyData(data) {
    fs.writeFileSync(moneyPath, JSON.stringify(data, null, 4));
}

// Hàm lấy tiền và kiểm tra an toàn từng biến bên trong Object
function getSafeBalance(moneyData, userId) {
    if (!moneyData[userId] || typeof moneyData[userId] !== 'object') {
        moneyData[userId] = { balance: 0, money: 0, job: null };
    }
    
    if (moneyData[userId].money !== undefined && moneyData[userId].balance === undefined) {
        moneyData[userId].balance = parseInt(moneyData[userId].money) || 0;
    }

    if (typeof moneyData[userId].balance !== 'number' || isNaN(moneyData[userId].balance)) {
        moneyData[userId].balance = 0;
    }
    
    moneyData[userId].money = moneyData[userId].balance; 
    return moneyData[userId].balance;
}

// Hệ thống lưu Cooldown chống spam lệnh (60 giây)
const cooldowns = new Map();
const COOLDOWN_TIME = 60 * 1000; 

// =========================================================
// DANH SÁCH TẤT CẢ CÔNG VIỆC
// =========================================================
const jobsConfig = {
    "tiemthuoc": {
        name: "Tiệm Thuốc ✨",
        salaryMin: 100, salaryMax: 300,
        actions: [
            "Bạn bốc thuốc bổ cho một vị đại hiệp, được hậu tạ",
            "Bạn bán thành công 10 thang thuốc trị cảm cúm, thu về",
            "Bạn vừa bào chế thành công Thập Toàn Đại Bổ Phẩm, bán được"
        ]
    },
    "tiemmay": {
        name: "Tiệm May 🧵",
        salaryMin: 120, salaryMax: 320,
        actions: [
            "Bạn may xong một bộ y phục dạ hội cho tiểu thư, nhận được",
            "Bạn vá lại áo giáp rách cho một binh lính, kiếm được",
            "Thiết kế thành công mẫu váy giới hạn, khách hàng thưởng nóng"
        ]
    },
    "cuahang": {
        name: "Cửa Hàng Bán Lẻ 🛒",
        salaryMin: 80, salaryMax: 250,
        actions: [
            "Bạn treo bảng khuyến mãi, khách vào mua đồ tấp nập, thu lời",
            "Bạn thanh lý được lô hàng tồn kho lâu năm, kiếm về",
            "Một vị đại gia vào mua bao thuốc lá và không lấy tiền thừa"
        ]
    },
    "daotach": {
        name: "Đạo Tặc (Ngầm) 🥷",
        salaryMin: 200, salaryMax: 600, 
        actions: [
            "Bạn lẻn vào phủ gia giàu có trộm được một túi tiền giá trị",
            "Bạn móc túi một tên lính say rượu bên đường, vớ được",
            "Bạn đột nhập vào mật thất và lấy đi hòm báu nhỏ chứa"
        ]
    },
    "quancafe": {
        name: "Quán Cà Phê Chill ☕",
        salaryMin: 90, salaryMax: 200,
        actions: [
            "Bạn pha một ly Latte Art cực đẹp, khách hàng thích thú thưởng thêm",
            "Hôm nay quán đông khách, bạn chạy bàn mỏi tay và nhận tiền công",
            "Bạn phục vụ chu đáo cho một nhóm bạn, họ để lại tiền tips"
        ]
    },
    "baove": {
        name: "Bảo Vệ Đêm 👮",
        salaryMin: 110, salaryMax: 280,
        actions: [
            "Bạn đi tuần tra và tóm gọn một tên trộm vặt, chủ tiệm thưởng",
            "Một đêm trực bình yên, bạn nhận được tiền lương ca đêm",
            "Bạn giúp khách hàng dắt xe và xếp hàng ngay ngắn, được thưởng"
        ]
    }
};

async function handleLamViecGame(message) {
    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    const userId = message.author.id;

    // Bộ lọc lệnh làm việc
    const validCommands = ['!jobs', '!profile', '!xinviec', '!boviec', '!lamviec'];
    if (!validCommands.includes(command)) return false;

    let moneyData = getMoneyData();
    let currentBalance = getSafeBalance(moneyData, userId);

    // =========================================================
    // LỆNH 1: XEM DANH SÁCH CÔNG VIỆC (!jobs)
    // =========================================================
    if (command === '!jobs') {
        let msg = "🏪 **TRUNG TÂM GIỚI THIỆU VIỆC LÀM** 🏪\n";
        msg += "Muốn làm việc, trước tiên bạn phải nộp đơn xin việc!\n\n";
        
        for (const [key, value] of Object.entries(jobsConfig)) {
            msg += `• **${value.name}** (Mã: \`${key}\`) | Thu nhập: \`${value.salaryMin} Cowcoin - ${value.salaryMax} Cowcoin\`\n`;
        }

        msg += `\n📝 **Lệnh tương tác:**\n`;
        msg += `👉 \`!xinviec [mã_nghề]\` : Nộp đơn xin vào làm.\n`;
        msg += `👉 \`!boviec\` : Xin nghỉ việc hiện tại.\n`;
        msg += `👉 \`!lamviec\` : Bắt đầu làm công việc đã nhận.\n`;
        msg += `👉 \`!profile\` : Xem công việc và số dư hiện tại.`;

        await message.reply(msg).catch(() => null);
        return true;
    }

    // =========================================================
    // LỆNH 2: XEM THÔNG TIN CỦA BẢN THÂN (!profile)
    // =========================================================
    if (command === '!profile') {
        const currentJobKey = moneyData[userId].job;
        const jobName = currentJobKey ? jobsConfig[currentJobKey].name : "Thất nghiệp 🛌";
        
        await message.reply(`👤 **HỒ SƠ CỦA ${message.author.username}**\n💰 Số dư: **${currentBalance.toLocaleString()} Cowcoin**\n💼 Nghề nghiệp: **${jobName}**`).catch(() => null);
        return true;
    }

    // =========================================================
    // LỆNH 3: NỘP ĐƠN XIN VIỆC (!xinviec [mã])
    // =========================================================
    if (command === '!xinviec') {
        const targetJob = args[1]?.toLowerCase();

        if (moneyData[userId].job) {
            const currentJobName = jobsConfig[moneyData[userId].job].name;
            await message.reply(`❌ Bạn đang làm việc tại **${currentJobName}**. Bạn phải gõ lệnh \`!boviec\` trước khi xin việc mới!`).catch(() => null);
            return true;
        }

        if (!targetJob || !jobsConfig[targetJob]) {
            await message.reply(`❌ Mã công việc không hợp lệ! Hãy gõ \`!jobs\` để xem chính xác các mã nghề.`).catch(() => null);
            return true;
        }

        moneyData[userId].job = targetJob;
        saveMoneyData(moneyData);

        await message.reply(`🎉 **Chúc mừng!** Đơn xin việc vào **${jobsConfig[targetJob].name}** của bạn đã được phê duyệt. Hãy gõ \`!lamviec\` để bắt đầu ca làm đầu tiên.`).catch(() => null);
        return true;
    }

    // =========================================================
    // LỆNH 4: XIN NGHỈ VIỆC (!boviec)
    // =========================================================
    if (command === '!boviec') {
        const currentJobKey = moneyData[userId].job;

        if (!currentJobKey) {
            await message.reply(`❌ Bạn đang thất nghiệp mà, có việc đâu mà bỏ! Hãy gõ \`!jobs\` để đi tìm việc nhé.`).catch(() => null);
            return true;
        }

        const oldJobName = jobsConfig[currentJobKey].name;
        const phạtTiền = 50; 

        if (currentBalance >= phạtTiền) {
            moneyData[userId].balance -= phạtTiền;
            moneyData[userId].money = moneyData[userId].balance; 
            moneyData[userId].job = null;
            saveMoneyData(moneyData);
            await message.reply(`💔 Bạn đã nộp đơn xin nghỉ việc tại **${oldJobName}**. Bạn bị trừ **${phạtTiền} Cowcoin** tiền bồi thường hợp đồng. Hiện tại bạn đã tự do!`).catch(() => null);
        } else {
            moneyData[userId].balance = 0;
            moneyData[userId].money = 0; 
            moneyData[userId].job = null;
            saveMoneyData(moneyData);
            await message.reply(`💔 Bạn đã trốn việc bỏ ngang tại **${oldJobName}**. Toàn bộ số tiền lương ít ỏi còn lại đã bị chủ tiệm siết nợ!`).catch(() => null);
        }
        return true;
    }

    // =========================================================
    // LỆNH 5: BẮT ĐẦU LÀM VIỆC (!lamviec)
    // =========================================================
    if (command === '!lamviec') {
        const currentJobKey = moneyData[userId].job;

        if (!currentJobKey || !jobsConfig[currentJobKey]) {
            await message.reply(`❌ Bạn chưa có việc làm! Vui lòng gõ \`!jobs\` và chọn một công việc bằng lệnh \`!xinviec [mã_nghề]\`.`).catch(() => null);
            return true;
        }

        // Kiểm tra Cooldown
        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + COOLDOWN_TIME;
            const now = Date.now();
            if (now < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - now) / 1000);
                await message.reply(`⏰ **Chầm chậm thôi!** Bạn đang làm việc quá sức rồi. Hãy nghỉ ngơi thêm **${timeLeft} giây** nữa nhé.`).catch(() => null);
                return true;
            }
        }

        // Tỷ lệ 20% yêu cầu Verify Captcha Nút bấm (Chống AHK)
        const needsVerification = Math.random() < 0.20;
        if (needsVerification) {
            return await triggerAntiBotCheck(message, userId, currentJobKey);
        }

        // Xử lý công việc (Cộng tiền hoặc Phạt vi phạm)
        await executeWorkProcess(message, userId, currentJobKey);
        return true;
    }

    return false;
}

// =========================================================
// 🛡️ HÀM BỔ SUNG: TẠO NÚT BẤM VERIFY CHỐNG AHK / MACRO
// =========================================================
async function triggerAntiBotCheck(message, userId, currentJobKey) {
    const colors = [
        { id: 'red', label: '🔴 Nút Đỏ' },
        { id: 'green', label: '🟢 Nút Xanh' },
        { id: 'yellow', label: '🟡 Nút Vàng' }
    ];

    const targetColor = colors[Math.floor(Math.random() * colors.length)];
    const shuffledColors = [...colors].sort(() => Math.random() - 0.5);

    const row = new ActionRowBuilder().addComponents(
        shuffledColors.map(c =>
            new ButtonBuilder()
                .setCustomId(`verify_${c.id}`)
                .setLabel(c.label)
                .setStyle(ButtonStyle.Secondary)
        )
    );

    const responseMessage = await message.reply({
        content: `🛡️ **XÁC THỰC CHỐNG AUTOMATION (AHK/MACRO)**\nHãy bấm đúng **${targetColor.label}** trong **15 giây** để nhận lương!`,
        components: [row]
    }).catch(() => null);

    if (!responseMessage) return true;

    const collector = responseMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 15000
    });

    collector.on('collect', async (interaction) => {
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '⚠️ Bảng xác minh này không phải của bạn!', ephemeral: true }).catch(() => null);
        }

        // Dừng collector ngay khi tương tác
        collector.stop('handled');

        if (interaction.customId === `verify_${targetColor.id}`) {
            // CÓ BẮT LỖI 10062 TẠI ĐÂY NÊN SẼ KHÔNG BAO GIỜ CRASH BOT
            await interaction.deferUpdate().catch(() => null);
            await executeWorkProcess(message, userId, currentJobKey, responseMessage);
        } else {
            cooldowns.set(userId, Date.now());

            await interaction.update({
                content: `❌ **Xác thực thất bại!** Bạn đã bấm sai nút. Bạn bị phạt tạm dừng làm việc **1 phút**!`,
                components: []
            }).catch(async () => {
                await responseMessage.edit({
                    content: `❌ **Xác thực thất bại!** Bạn đã bấm sai nút. Bạn bị phạt tạm dừng làm việc **1 phút**!`,
                    components: []
                }).catch(() => null);
            });
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            cooldowns.set(userId, Date.now());

            await responseMessage.edit({
                content: `⏰ **Hết thời gian xác thực!** Bạn chưa vượt qua kiểm tra chống Auto.`,
                components: []
            }).catch(() => null);
        }
    });

    return true;
}

// =========================================================
// ⚖️ HÀM BỔ SUNG: XỬ LÝ LƯƠNG HOẶC PHẠT TRỪ VÀO MONEY.JSON
// =========================================================
async function executeWorkProcess(message, userId, currentJobKey, editMsg = null) {
    let moneyData = getMoneyData();
    let currentBalance = getSafeBalance(moneyData, userId);
    const job = jobsConfig[currentJobKey];

    // Cập nhật Cooldown
    cooldowns.set(userId, Date.now());

    // Tỷ lệ 5% bị vi phạm và phạt trừ tiền
    const isPenalized = Math.random() < 0.05;
    let replyMsg = '';

    if (isPenalized) {
        const fine = Math.floor(Math.random() * 71) + 30; 
        const penaltyReasons = [
            `đi làm muộn 30 phút và bị trừ **-${fine} Cowcoin**`,
            `lỡ tay làm vỡ đồ đạc của cửa hàng, phải đền **-${fine} Cowcoin**`,
            `ngủ gật trong ca làm việc, bị khấu trừ **-${fine} Cowcoin**`,
            `bị khách hàng phản ánh thái độ phục vụ kém, phạt **-${fine} Cowcoin**`
        ];

        const randomReason = penaltyReasons[Math.floor(Math.random() * penaltyReasons.length)];

        // Trừ tiền thực tế vào money.json
        moneyData[userId].balance = Math.max(0, currentBalance - fine);
        moneyData[userId].money = moneyData[userId].balance;
        saveMoneyData(moneyData);

        replyMsg = `💥 **[${job.name}] VI PHẠM QUY ĐỊNH!**\nBạn ${randomReason}. Số dư còn lại: **${moneyData[userId].balance.toLocaleString()} Cowcoin**`;
    } else {
        const randomAction = job.actions[Math.floor(Math.random() * job.actions.length)];
        const moneyEarned = Math.floor(Math.random() * (job.salaryMax - job.salaryMin + 1)) + job.salaryMin;

        // Cộng tiền thực tế vào money.json
        moneyData[userId].balance = currentBalance + moneyEarned;
        moneyData[userId].money = moneyData[userId].balance;
        saveMoneyData(moneyData);

        replyMsg = `💼 **[${job.name}]** ${randomAction} **+${moneyEarned} Cowcoin**. Số dư mới: **${moneyData[userId].balance.toLocaleString()} Cowcoin**`;
    }

    if (editMsg) {
        await editMsg.edit({ content: replyMsg, components: [] }).catch(() => null);
    } else {
        await message.reply(replyMsg).catch(() => null);
    }
}

module.exports = { handleLamViecGame };