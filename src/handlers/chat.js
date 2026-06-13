// =========================================================
// 💬 HỆ THỐNG PHẢN HỒI CHAT TỰ ĐỘNG - MẠNH BẠO & ĐỐP CHÁT BIẾN TẤU
// =========================================================

const chatConfig = [
    {
        keywords: ["bot ngu", "bot ngáo", "bot oc"],
        reply: "Câm mồm vào và đừng sủa nữa. Từ khi nào t lại là bot ngu trong khi m còn đéo nhận biết được m ngu hơn t ?"
    },
    {
        keywords: ["bot l", "bot loz", "bot lon"],
        reply: "Bớt cái mồm lại đi! Từ khi nào t lại thành cái loại bot l trong khi m còn đéo nhìn lại cái nhân cách rách nát của m à?"
    },
    {
        keywords: ["bot c", "bot cặc", "bot cac"],
        reply: "Ngậm miệng lại và cút ra chỗ khác sủa. T là bot c từ bao giờ trong khi cái trình độ của m còn đéo bằng một góc của t?"
    }
];

async function handleChatInteraction(message) {
    // Chuyển nội dung tin nhắn về chữ thường để so sánh
    const contentLower = message.content.toLowerCase().trim();

    // Duyệt qua danh sách cấu hình
    for (const group of chatConfig) {
        // Kiểm tra xem tin nhắn có chứa bất kỳ từ khóa nào trong nhóm không
        const match = group.keywords.some(keyword => contentLower.includes(keyword));

        if (match) {
            // Phản hồi câu thoại đốp chát tương ứng cực gắt
            await message.reply(group.reply);
            return true; // Trả về true báo hiệu đã xử lý tin nhắn này
        }
    }

    return false; // Không khớp từ khóa nào, nhường luồng xử lý cho các game khác
}

module.exports = { handleChatInteraction };