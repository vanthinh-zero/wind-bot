// src/handlers/wind.js
const { EmbedBuilder } = require('discord.js');

async function handleWindCommand(message) {
    const content = message.content.trim();
    const args = content.split(/\s+/);
    const command = args[0].toLowerCase();

    // Chỉ kích hoạt khi gõ đúng !wind
    if (command !== '!wind') return;

    const windEmbed = new EmbedBuilder()
        .setColor('#e67e22') // Màu cam đất sang trọng, trung lập cho tất cả thành viên
        .setTitle('📜 TIÊN PHỦ THƯỢNG THƯ - TOÀN TẬP MẬT LỆNH SYSTEM')
        .setDescription('Kính chào toàn thể đạo hữu! Dưới đây là bảng tổng hợp tất cả các lệnh đang hiện hữu tại Tiên Giới. Hãy chú ý các lệnh có nhãn giới hạn quyền hạn.')
        .addFields(
            { 
                name: '🎮 1. GIẢI TRÍ & MINI-GAMES', 
                value: '• `!ailatrieuphu`: Khảo hạch Vấn Đáp Tiên Đài (Ai là triệu phú).\n' +
                       '• `!dhbc`: Thử thách tài trí qua Đuổi Hình Bắt Chữ.\n' +
                       '• `!masoi`: Khởi động mật nghị Ma Sói Engine.\n' +
                       '• `!gacha`: Vận dụng khí vận quay thẻ tướng hắc ám.'
            },
            { 
                name: '💰 2. TIỀN TỆ & THỬ VẬN MAY (Kênh Tài Xỉu)', 
                value: '• `!vi` hoặc `!money`: Kiểm tra số linh thạch hiện có trong túi càn khôn.\n' +
                       '• `!vi @Người_Dùng`: Xem trộm tài sản linh thạch của đạo hữu khác.\n' +
                       '• `!diemdanh` hoặc `!daily`: Nhận bổng lộc **100** linh thạch từ thiên địa (Mỗi 24 giờ).\n' +
                       '• `!chuyentien @Người_Nhận [Số_Tiền]`: Giao thương, chuyển khoản linh thạch trực tiếp.\n' +
                       '• `!taixiu [tai/xiu] [Số_Tiền/all]`: Đặt cược linh thạch, thử thách vận số xoay vần.'
            },
            { 
                name: '☯️ 3. TIÊN PHỦ TU CHÂN RPG (Kênh Tu Tiên)', 
                value: '👉 *Không cần gõ lệnh! Hãy bấm các nút tương tác trực tiếp tại Đại Sảnh để:* \n' +
                       '• `🧘 Hấp thu linh khí` (Tăng EXP) | `🧭 Xuất ngoại lịch luyện` (Nhận đá / Gặp tâm ma).\n' +
                       '• `🏪 Ghé thăm Đan Các` để mua/nuốt thần đan | `⚡ Đột phá thiên kiếp` tiến giai cảnh giới.\n' +
                       '• `⚔️ Cướp đoạt mỏ linh thạch` | `👹 Khiêu chiến Cổ Ma` | `💞 Song tu đại pháp`.'
            },
            { 
                name: '📚 4. NẠP KIẾN THỨC CỔ NGỮ', 
                value: '• `!vocab`: Triệu hồi ngay lập tức 3-5 từ vựng kèm cấu trúc câu ứng dụng.\n' +
                       '> *Hệ thống cũng tự động phát kiến thức định kỳ mỗi 3 tiếng tại kênh học tập.*'
            },
            { 
                name: '⚡ 5. ĐIỀU HÀNH THIÊN ĐÌNH (Lệnh Quản Trị)', 
                value: '• `!clear [Số_Tin_Nhắn]`: 🔴 **[Chỉ Ban Quản Trị]** Dọn dẹp quét sạch tin nhắn rác tại channel (Tối đa 100).\n' +
                       '• `!thuhoi @Người_Dùng [Số_Tiền]`: 🔴 **[Chỉ Ban Quản Trị]** Khấu trừ, tịch thu linh thạch của mục tiêu.\n' +
                       '• `!thuhoi [ID_Người_Dùng] [Số_Tiền]`: 🔴 **[Chỉ Ban Quản Trị]** Tịch thu linh thạch từ xa qua ID.\n' +
                       '• `!ping`: 🔴 **[Chỉ Ban Quản Trị]** Đo đạc độ trễ mạng hệ thống.'
            }
        )
        .setFooter({ text: '💡 Vui lòng tuân thủ quy tắc Tiên Giới. Kẻ phạm cấm ngôn sẽ bị bộ lọc tự động trừng phạt!' })
        .setTimestamp();

    try {
        await message.channel.send({ embeds: [windEmbed] }).catch(() => {});
    } catch (error) {
        console.error("❌ Lỗi khi thực thi lệnh !wind:", error);
    }
}

module.exports = { handleWindCommand };