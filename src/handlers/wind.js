const { PermissionsBitField, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Định nghĩa các biến cấu hình hệ thống dự phòng
let CO_AUTO_CHAT = true;
let BOT_MOOD = 'macdinh'; 
let KENH_CONTENT_ID = process.env.KENH_CONTENT_ID || null;

// --- 📂 LƯU TRỮ VÀ QUẢN LÝ TỪ KHÓA TỰ ĐỘNG ---
const tukhoaFilePath = path.join(__dirname, 'tukhoa.json');

function CodeDocTuKhoa() {
    try {
        if (!fs.existsSync(tukhoaFilePath)) {
            fs.writeFileSync(tukhoaFilePath, JSON.stringify({}, null, 4));
            return {};
        }
        const data = fs.readFileSync(tukhoaFilePath, 'utf8');
        return JSON.parse(data || '{}');
    } catch (e) {
        console.error("❌ Lỗi đọc file tukhoa.json:", e);
        return {};
    }
}

function CodeGhiTuKhoa(data) {
    try {
        fs.writeFileSync(tukhoaFilePath, JSON.stringify(data, null, 4));
    } catch (e) {
        console.error("❌ Lỗi ghi file tukhoa.json:", e);
    }
}

function CodeDocStats() {
    if (global.CodeDocStats && typeof global.CodeDocStats === 'function') return global.CodeDocStats();
    if (!global.statsMemory) global.statsMemory = {};
    return global.statsMemory;
}

function CodeGhiStats(newStats) {
    if (global.CodeGhiStats && typeof global.CodeGhiStats === 'function') return global.CodeGhiStats(newStats);
    global.statsMemory = newStats;
}

async function executeServerAction(message, botReply) {
    if (global.executeServerAction && typeof global.executeServerAction === 'function') {
        return await global.executeServerAction(message, botReply);
    }
    return botReply;
}

async function sfetch(url, options) {
    if (global.sfetch && typeof global.sfetch === 'function') return await global.sfetch(url, options);
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const res = await fetch(url, options);
    return await res.json();
}

function initAutoSpam(client) {
    try {
        console.log('💬 [System Check]: Module Auto Spam rộn ràng đã khởi chạy thành công!');
    } catch (error) {
        console.error('❌ Lỗi trong hàm initAutoSpam:', error);
    }
}

// --- 📜 HÀM XỬ LÝ LỆNH EMBED (!wind) ---
async function handleWindCommand(message) {
    const content = message.content.trim();
    const args = content.split(/\s+/);
    const command = args[0].toLowerCase();

    if (command === '!wind') {
        const windEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('📋 BẢNG HƯỚNG DẪN LỆNH & PHÂN QUYỀN HỆ THỐNG')
            .setDescription('Danh mục tra cứu toàn bộ lệnh và phân cấp thẩm quyền trên máy chủ:')
            .addFields(
                { 
                    name: '🟢 THÀNH VIÊN (Tất cả mọi người)', 
                    value: '• **Hồ sơ & Trang trí:** `/profile`, `/bio`, `/status`, `/setcolor`, `/setbadge`, `/setmedia`, `/setgif`\n' +
                           '• **Tương tác xã hội & Tình cảm:** `/totinh`, `/kethon`, `/banthan`, `/om`, `/hon`, `/xoadau`, `/veo`\n' +
                           '• **Giải trí & Games:** `!noitu`, `!pet`, `!poem`, `!tarot`, `!chualanh`, `!rule`\n' +
                           '• **Học tập & Từ vựng:** `!vocabulary` (Tự động gửi/học từ vựng)\n' +
                           '• **Tài chính & Cá cược:** `!taixiu` (Chơi tài xỉu)\n' +
                           '• **Tu Chân RPG:** `!tutien` (Bảng điều khiển tu luyện, săn thú)\n' +
                           '• **Tương tác AI:** Tag `@Wind` hoặc nhắn `Wind ơi...`'
                },
                { 
                    name: '⭐ VIP & NITRO BOOSTER', 
                    value: '• `!svip`: Kích hoạt đặc quyền khu vực VIP / Booster\n' +
                           '• `!menuvip`: Quản lý phòng Voice riêng (Khóa/Mở, Đổi tên, Đặt slot, Kick người)'
                },
                { 
                    name: '🛡️ BỒ QUẢN TRỊ & LỄ TÂN (STAFF)', 
                    value: '📌 **Thẩm quyền Vận hành & Giám sát Máy chủ:**\n' +
                           '• **Quản lý Phản hồi tự động:** `!tukhoa add/del/list` (Thiết lập câu trả lời tự động)\n' +
                           '• **Hỗ trợ & Ticket:** `!ticket` (Quản lý và giải quyết ticket hỗ trợ thành viên)\n' +
                           '• **Tra cứu bảo mật:** `!trathongtin @User` *(Gửi hồ sơ riêng tư vào DM)*\n' +
                           '• **Thống kê tương tác:** `!topchatimage` / `!thongketag` *(Xem TOP thành viên tag Bot)*\n' +
                           '• **Sáng tạo nội dung:** `!taocontent <chủ_đề>` *(Yêu cầu AI lập kịch bản tại kênh Content)*'
                },
                { 
                    name: '👑 ADMIN TỐI CAO', 
                    value: '🔑 **Thẩm quyền Điều hành & Cấu hình Hệ thống:**\n' +
                           '• **Điều hành Server bằng AI:** Ra lệnh trực tiếp cho AI (`Tạo/Xóa kênh`, `Gán/Xóa Role`, `Đổi biệt danh`...)\n' +
                           '• **Bảng điều khiển Bot:** `!autochat on/off` *(Bật/Tắt chat tự động)* | `!mood cold/macdinh` *(Thay đổi tính cách)*\n' +
                           '• **Quản trị:** `!clear [số_tin]`, `!thuhoi @User [số_tiền]`, `!ping`'
                }
            )
            .setFooter({ text: '💡 Lưu ý: Cần có đủ Role tương ứng để thực thi các lệnh thuộc nhóm phân quyền.' })
            .setTimestamp();

        try {
            await message.channel.send({ embeds: [windEmbed] });
            return true;
        } catch (error) {
            console.error("❌ Lỗi khi gửi Embed !wind:", error);
            return true;
        }
    }

    return false;
}

module.exports = {
    CodeDocTuKhoa,
    CodeGhiTuKhoa,
    CodeDocStats,
    CodeGhiStats,
    executeServerAction,
    sfetch,
    initAutoSpam,
    handleWindCommand
};