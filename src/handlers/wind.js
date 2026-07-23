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
            .setColor('#8CC0EB')
            .setTitle('📋 BẢNG HƯỚNG DẪN MẬT LỆNH & PHÂN QUYỀN')
            .setDescription('Danh mục lệnh hệ thống được phân cấp minh bạch theo từng thẩm quyền:\n\n───────────────')
            .addFields(
                // --- NHÓM THÀNH VIÊN ---
                { 
                    name: '🟢 [1] DÀNH CHO TOÀN THỂ THÀNH VIÊN', 
                    value: '• **Trang trí cá nhân:** `/profile`, `/bio`, `/status`, `/settitle`, `/setcolor`, `/setbadge`, `/setdivided`, `/setfooter`, `/setmedia`, `/setgif`, `/setbanner`, `/setavatar`\n' +
                           '• **Tương tác xã hội:** `/totinh`, `/kethon`, `/banthan`, `/om`, `/hon`, `/xoadau`, `/veo`\n' +
                           '• **Trò chơi & Giải trí:** `!noitu`, `!pet`, `!poem`, `!tarot`, `!chualanh`, `!rule`\n' +
                           '• **Học tập & Ôn thi:** `!dethi <môn> <đề_số>` (Lấy đề thi), `!vocabulary` (Tự động gửi từ vựng)\n' +
                           '• **Tài chính & Cá cược:** `!taixiu` (Đặt cược tài xỉu)\n' +
                           '• **Hệ thống Tu Chân:** `!tutien` (Bảng điều khiển tu luyện & săn thú)\n' +
                           '• **Trò chuyện AI:** Tag `@Wind` hoặc gõ `Wind ơi...`'
                },
                { 
                    name: '⠀', 
                    value: '───────────────' 
                },

                // --- NHÓM VIP ---
                { 
                    name: '⭐ [2] QUYỀN HẠN VIP & NITRO BOOSTER', 
                    value: '• **Đặc quyền VIP:** `!svip` (Khởi tạo khu vực VIP)\n' +
                           '• **Quản lý Voice:** `!menuvip` (Bảng quản lý phòng Voice: Khóa/Mở, Đổi tên, Đặt slot, Kick thành viên)'
                },
                { 
                    name: '⠀', 
                    value: '───────────────' 
                },

                // --- NHÓM STAFF & LỄ TÂN ---
                { 
                    name: '🛡️ [3] ĐẶC QUYỀN BỒ QUẢN TRỊ & LỄ TÂN (STAFF)', 
                    value: '📌 **Thẩm quyền Vận hành & Giám sát Máy chủ:**\n\n' +
                           '• `!tukhoa add <từ_khóa> <câu_trả_lời>` — Thêm phản hồi tự động\n' +
                           '• `!tukhoa del <từ_khóa>` — Xóa từ khóa phản hồi tự động\n' +
                           '• `!tukhoa list` — Tra cứu danh sách từ khóa hệ thống\n' +
                           '• `!trathongtin @User` — Trích xuất hồ sơ cá nhân kín (Gửi trực tiếp vào DM)\n' +
                           '• `!topchatimage` / `!thongketag` — Kiểm tra thống kê tương tác thành viên\n' +
                           '• `!taocontent <chủ_đề>` — Yêu cầu AI sáng tạo kịch bản tại kênh Content'
                },
                { 
                    name: '⠀', 
                    value: '───────────────' 
                },

                // --- NHÓM ADMIN ---
                { 
                    name: '👑 [4] QUYỀN HẠN TỐI CAO - ADMINISTRATOR', 
                    value: '🔑 **Thẩm quyền Điều hành & Cấu hình Toàn Hệ Thống:**\n\n' +
                           '• **Thao tác Server bằng AI:** Trực tiếp ra lệnh AI (`Tạo/Xóa kênh`, `Cấp/Xóa Role`, `Đổi biệt danh`...)\n' +
                           '• `!autorole wind` — Bảng thiết lập & Spawn Auto Role tự động cho thành viên\n' +
                           '• `!set ticket` — Khởi tạo / Spawn bảng tạo Ticket hỗ trợ\n' +
                           '• `!setrule` — Khởi tạo / Cập nhật bảng Nội quy máy chủ\n' +
                           '• `!autochat on/off` — Chủ động Bật/Tắt chế độ chat tự động của Bot\n' +
                           '• `!mood cold/macdinh` — Tùy chỉnh phong cách phản hồi của AI\n' +
                           '• `!clear [số_tin]` — Dọn dẹp tin nhắn hàng loạt\n' +
                           '• `!thuhoi @User [số_tiền]` — Thao tác điều chỉnh số dư tài chính\n' +
                           '• `!ping` — Kiểm tra độ trễ hệ thống'
                }
            )
            .setFooter({ text: '💡 Lưu ý: Cần có đủ Role tương ứng để kích hoạt được các lệnh phân quyền.' })
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