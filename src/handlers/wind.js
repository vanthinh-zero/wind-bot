const { PermissionsBitField, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, author, footer, serverBrand, statField } = require('../utils/embedTheme');
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

// --- 📜 HÀM XỬ LÝ LỆNH BẢNG ĐIỀU KHIỂN TRUNG TÂM (!wind) ---
async function handleWindCommand(message) {
    const content = message.content.trim();
    const args = content.split(/\s+/);
    const command = args[0].toLowerCase();

    if (command === '!wind') {
        const sub = args[1]?.toLowerCase();

        // 1. Phân mục chuyên sâu: !wind trade
        if (sub === 'trade' || sub === 'san') {
            const tradeEmbed = new EmbedBuilder()
                .setColor(COLORS.gold || '#f0b90b')
                .setAuthor(author('WIND EXCHANGE • TRADING COMMANDS', serverBrand(message.guild)))
                .setTitle('📈 SÀN GIAO DỊCH PHÁI SINH & TRỢ LÝ A.I')
                .setDescription(
                    'Sàn giao dịch phái sinh Futures chuẩn đời thực với nến Nhật, đòn bẩy x1 đến x125 và trợ lý A.I soi kèo.\n\n' +
                    '💡 *Dùng tiền Cowcoin chung với Pet, Shop và Làm việc.*'
                )
                .addFields(
                    {
                        name: '⚡ Lệnh Đặt & Quản Lý Vị Thế',
                        value: 
                            '• `!trade [btc/eth/sol/bnb]` : Mở sàn giao dịch nến trực quan & nút bấm.\n' +
                            '• `!long <tiền> [đòn_bẩy] [tp] [sl]` : Mở vị thế **LONG** (Mua / Đánh lên).\n' +
                            '• `!short <tiền> [đòn_bẩy] [tp] [sl]` : Mở vị thế **SHORT** (Bán / Đánh xuống).\n' +
                            '• `!close` : Đóng vị thế theo giá thị trường, nhận PnL về ví.\n' +
                            '• `!pos` hoặc `!pnl` : Xem chi tiết thẻ vị thế đang mở và lãi/lỗ.\n' +
                            '• `!tp <giá>` : Đặt / Cập nhật điểm Chốt Lời tự động.\n' +
                            '• `!sl <giá>` : Đặt / Cập nhật điểm Cắt Lỗ tự động.\n' +
                            '• `!lev <1-125>` : Cài đặt đòn bẩy mặc định.\n' +
                            '• `!history` : Xem thống kê tổng lệnh, tỷ lệ thắng (Win Rate) và kỷ lục lãi.'
                    },
                    {
                        name: '🤖 Trợ Lý A.I & Học Viện Trader',
                        value:
                            '• `!ptkt [coin]` / `!signal` : A.I soi kèo, quét RSI, sóng SMC và gợi ý Entry, TP, SL với tỷ lệ R:R tối ưu.\n' +
                            '• `!helptrade` : Cẩm nang toàn tập cho trader từ cơ bản đến nâng cao.\n' +
                            '• **Tag `@Wind`**: Đặt câu hỏi trực tiếp (RSI là gì, Order Block là gì, cách quản lý vốn...)'
                    },
                    {
                        name: '💰 Quản Lý Dòng Tiền Cowcoin',
                        value:
                            '• `!vi` hoặc `!money` : Xem chi tiết Số dư khả dụng + Tiền ký quỹ + Tổng tài sản ròng.\n' +
                            '• `!diemdanh` : Nhận vốn giao dịch miễn phí hàng ngày (+5,000, VIP nhận +10,000).\n' +
                            '• `!trade vip` : Xem quyền lợi 0% phí sàn, đòn bẩy x125 và bảo hiểm cháy 10%.'
                    }
                )
                .setFooter(footer('⚠️ Mọi quyết định giao dịch đều do bạn tự chịu trách nhiệm. A.I chỉ là trợ lý tham khảo.'))
                .setTimestamp();

            return await message.channel.send({ embeds: [tradeEmbed] });
        }

        // 2. Bảng điều khiển tổng quan đầy đủ nhất: !wind
        const windEmbed = new EmbedBuilder()
            .setColor(COLORS.sky || '#38bdf8')
            .setAuthor(author('WIND COMMAND CENTER', serverBrand(message.guild)))
            .setTitle('✦ WIND • BẢNG ĐIỀU KHIỂN TẤT CẢ CÁC LỆNH')
            .setDescription(
                'Trung tâm điều khiển và hướng dẫn toàn diện hệ sinh thái Wind Bot.\n\n' +
                '🚀 **Bắt đầu nhanh:** `!trade` (Sàn phái sinh)  •  `!helptrade` (Cẩm nang)  •  `/setup-server` (Cài đặt Admin)'
            )
            .addFields(
                {
                    name: '📈 Sàn Giao Dịch Phái Sinh & Ví Cowcoin',
                    value: 
                        '`!trade`  `!long`  `!short`  `!close`  `!pos`\n' +
                        '`!tp`  `!sl`  `!lev`  `!vi`  `!diemdanh`  `!history`\n' +
                        '*(Dùng `!wind trade` để xem chi tiết cách chơi sàn)*',
                    inline: false
                },
                {
                    name: '🤖 Trợ Lý A.I & Cố Vấn Trading',
                    value: 
                        '• `!helptrade` : Cẩm nang kiến thức trader toàn tập A - Z.\n' +
                        '• `!ptkt [coin]` / `!signal` : A.I soi kèo, quét RSI và SMC.\n' +
                        '• **Tag `@Wind`**: Đặt câu hỏi về trade hoặc trò chuyện cùng bot.',
                    inline: false
                },
                {
                    name: '🐾 Thú Cưng & Nông Trại (Pets)',
                    value: 
                        '`!pet`  `!muapet`  `!choan`  `!nangcap`\n' +
                        '`!khopet`  `!laypet`  `!lockpet`  `!tromcho`  `!banpet`',
                    inline: true
                },
                {
                    name: '🛍️ Shop & Hồ Sơ Thành Viên',
                    value: 
                        '`/shop`  `/inventory`  `/profile`\n' +
                        '`/totinh`  `/kethon`  `/lyhon`  `!lamviec`',
                    inline: true
                },
                {
                    name: '👑 Gói Hội Viên Wind VIP',
                    value: 
                        '`/vip mua`  `/vip trangthai`  `/vip dacquyen`\n' +
                        '`!trade vip` *(0% phí, x125, bảo hiểm 10%)*  `!petvip`',
                    inline: false
                },
                {
                    name: '🎮 Giải Trí & Khám Phá',
                    value: 
                        '`!tutien`  `!noitu`  `!tarot`  `!poem`\n' +
                        '`!chualanh`  `!dethi`  `!vocabulary`  `!khihau`',
                    inline: true
                },
                {
                    name: '🧭 Quản Trị Server (Admin / Staff)',
                    value: 
                        '`/setup-server`  `/setchannel`  `!ticket`\n' +
                        '`!autorole wind`  `!setrule`  `!topchat`  `!nuke`',
                    inline: true
                }
            )
            .setThumbnail(serverBrand(message.guild))
            .setFooter(footer('Gõ !wind trade để xem chuyên sâu về sàn giao dịch • Dùng các lệnh / hoặc ! tương ứng.'))
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