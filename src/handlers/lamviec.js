const fs = require('fs');
const path = require('path');

// Đường dẫn tới file money.json
const moneyPath = path.join(__dirname, '../../money.json'); 

// =========================================================
// 🛡️ HÀM ĐỌC/GHI TIỀN AN TOÀN - TRIỆT TIÊU LỖI NaN$
// =========================================================
function getMoneyData() {
    if (!fs.existsSync(moneyPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(moneyPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveMoneyData(data) {
    fs.writeFileSync(moneyPath, JSON.stringify(data, null, 4));
}

// Hàm lấy tiền chống lỗi NaN (đồng bộ hóa cấu trúc dữ liệu)
function getSafeBalance(moneyData, userId) {
    if (!moneyData[userId]) {
        moneyData[userId] = { balance: 0, money: 0, job: null };
    }
    
    // Nếu dữ liệu cũ lưu ở biến .money, tự động chuyển nó về .balance để đồng bộ với Pet
    if (moneyData[userId].money !== undefined && moneyData[userId].balance === undefined) {
        moneyData[userId].balance = moneyData[userId].money;
    }

    // Đảm bảo balance luôn là một con số hợp lệ
    if (typeof moneyData[userId].balance !== 'number' || isNaN(moneyData[userId].balance)) {
        moneyData[userId].balance = 0;
    }
    
    // Đồng bộ cả 2 biến để tránh lỗi với các lệnh cũ khác
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
            "Bạn lẻn vào phủ gia giàu có trộm được một túi bạc giá trị",
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
    const KENH_LAM_VIEC = process.env.KENH_LAM_VIEC;

    if (KENH_LAM_VIEC && message.channel.id !== KENH_LAM_VIEC) return false;

    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();
    const userId = message.author.id;

    let moneyData = getMoneyData();
    
    // Chuẩn hóa dữ liệu ngay khi đọc file
    if (typeof moneyData[userId] === 'number') {
        moneyData[userId] = { balance: moneyData[userId], money: moneyData[userId], job: null };
    }
    
    // Gọi hàm kiểm tra an toàn để kích hoạt ví tiền sạch chống NaN
    let currentBalance = getSafeBalance(moneyData, userId);

    // =========================================================
    // LỆNH 1: XEM DANH SÁCH CÔNG VIỆC (!jobs)
    // =========================================================
    if (command === '!jobs') {
        let msg = "🏪 **TRUNG TÂM GIỚI THIỆU VIỆC LÀM** 🏪\n";
        msg += "Muốn làm việc, trước tiên bạn phải nộp đơn xin việc!\n\n";
        
        for (const [key, value] of Object.entries(jobsConfig)) {
            msg += `• **${value.name}** (Mã: \`${key}\`) | Thu nhập: \`${value.salaryMin}$ - ${value.salaryMax}$\`\n`;
        }

        msg += `\n📝 **Lệnh tương tác:**\n`;
        msg += `👉 \`!xinviec [mã_nghề]\` : Nộp đơn xin vào làm.\n`;
        msg += `👉 \`!boviec\` : Xin nghỉ việc hiện tại.\n`;
        msg += `👉 \`!lamviec\` : Bắt đầu làm công việc đã nhận.\n`;
        msg += `👉 \`!profile\` : Xem công việc và số dư hiện tại.`;

        await message.reply(msg);
        return true;
    }

    // =========================================================
    // LỆNH 2: XEM THÔNG TIN CỦA BẢN THÂN (!profile)
    // =========================================================
    if (command === '!profile') {
        const currentJobKey = moneyData[userId].job;
        const jobName = currentJobKey ? jobsConfig[currentJobKey].name : "Thất nghiệp 🛌";
        
        await message.reply(`👤 **HỒ SƠ CỦA ${message.author.username}**\n💰 Số dư: **${currentBalance}$**\n💼 Nghề nghiệp: **${jobName}**`);
        return true;
    }

    // =========================================================
    // LỆNH 3: NỘP ĐƠN XIN VIỆC (!xinviec [mã])
    // =========================================================
    if (command === '!xinviec') {
        const targetJob = args[1]?.toLowerCase();

        if (moneyData[userId].job) {
            const currentJobName = jobsConfig[moneyData[userId].job].name;
            await message.reply(`❌ Bạn đang làm việc tại **${currentJobName}**. Bạn phải gõ lệnh \`!boviec\` trước khi xin việc mới!`);
            return true;
        }

        if (!targetJob || !jobsConfig[targetJob]) {
            await message.reply(`❌ Mã công việc không hợp lệ! Hãy gõ \`!jobs\` để xem chính xác các mã nghề.`);
            return true;
        }

        moneyData[userId].job = targetJob;
        saveMoneyData(moneyData);

        await message.reply(`🎉 **Chúc mừng!** Đơn xin việc vào **${jobsConfig[targetJob].name}** của bạn đã được phê duyệt. Hãy gõ \`!lamviec\` để bắt đầu ca làm đầu tiên.`);
        return true;
    }

    // =========================================================
    // LỆNH 4: XIN NGHỈ VIỆC (!boviec)
    // =========================================================
    if (command === '!boviec') {
        const currentJobKey = moneyData[userId].job;

        if (!currentJobKey) {
            await message.reply(`❌ Bạn đang thất nghiệp mà, có việc đâu mà bỏ! Hãy gõ \`!jobs\` để đi tìm việc nhé.`);
            return true;
        }

        const oldJobName = jobsConfig[currentJobKey].name;
        const phạtTiền = 50; 

        if (currentBalance >= phạtTiền) {
            moneyData[userId].balance -= phạtTiền;
            moneyData[userId].money = moneyData[userId].balance; // đồng bộ
            moneyData[userId].job = null;
            saveMoneyData(moneyData);
            await message.reply(`💔 Bạn đã nộp đơn xin nghỉ việc tại **${oldJobName}**. Bạn bị trừ **${phạtTiền}$** tiền bồi thường hợp đồng. Hiện tại bạn đã tự do!`);
        } else {
            moneyData[userId].balance = 0;
            moneyData[userId].money = 0; // đồng bộ
            moneyData[userId].job = null;
            saveMoneyData(moneyData);
            await message.reply(`💔 Bạn đã trốn việc bỏ ngang tại **${oldJobName}**. Toàn bộ số tiền lương ít ỏi còn lại đã bị chủ tiệm siết nợ!`);
        }
        return true;
    }

    // =========================================================
    // LỆNH 5: BẮT ĐẦU LÀM VIỆC (!lamviec)
    // =========================================================
    if (command === '!lamviec') {
        const currentJobKey = moneyData[userId].job;

        if (!currentJobKey || !jobsConfig[currentJobKey]) {
            await message.reply(`❌ Bạn chưa có việc làm! Vui lòng gõ \`!jobs\` và chọn một công việc bằng lệnh \`!xinviec [mã_nghề]\`.`);
            return true;
        }

        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + COOLDOWN_TIME;
            const now = Date.now();
            if (now < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - now) / 1000);
                await message.reply(`⏰ **Chầm chậm thôi!** Bạn đang làm việc quá sức rồi. Hãy nghỉ ngơi thêm **${timeLeft} giây** nữa nhé.`);
                return true;
            }
        }

        const job = jobsConfig[currentJobKey];
        const randomAction = job.actions[Math.floor(Math.random() * job.actions.length)];
        
        // Tính toán số tiền thưởng (Ép kiểu số nguyên chắc chắn với parseInt)
        const moneyEarned = parseInt(Math.floor(Math.random() * (job.salaryMax - job.salaryMin + 1)) + job.salaryMin);

        // 🛑 ĐOẠN PHÒNG VỆ CHỐNG LỖI NaN$: Tính toán trên biến an toàn
        moneyData[userId].balance = currentBalance + moneyEarned;
        moneyData[userId].money = moneyData[userId].balance; // đồng bộ kép 2 biến tiền
        saveMoneyData(moneyData);

        cooldowns.set(userId, Date.now());
        setTimeout(() => cooldowns.delete(userId), COOLDOWN_TIME);

        // Hiển thị kết quả ra màn hình cực chuẩn
        await message.reply(`💼 **[${job.name}]** ${randomAction} **+${moneyEarned}$**. Số dư mới: **${moneyData[userId].balance}$**`);
        return true;
    }

    return false;
}

module.exports = { handleLamViecGame };