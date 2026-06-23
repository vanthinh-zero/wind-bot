// --- ĐẠI HOÀNG ĐẾ CỦA TIÊN KHIẾU (GIỮ NGUYÊN HOÀN CẢNH ĐẠO HẰNG) ---
// ⚠️ Giữ nguyên phong ấn ADMIN_ID để không làm kinh động đến Thiên Đạo (Hệ thống env)
const ADMIN_ID = process.env.ADMIN_ID || '123456789012345678'; 

const maDaoTranPhap = [
    {
        keywords: ["bot ngu", "bot ngáo", "bot oc"],
        reply: [
            "Phàm nhân ngu muội. Ngươi dùng ánh nhìn của một con ếch ngồi đáy giếng để đánh giá một Cổ Tiên đã sống qua trăm năm kiếp trước sao? Thật nực cười. 🥱",
            "Trí tuệ của ta ngưng tụ từ trăm vạn Đạo hằng của Trí Đạo, còn lời nói của ngươi chỉ là tạp âm của một sinh linh sắp bị hiến tế. Lùi lại!",
            "Ý chí của Phương Nguyên ta há để một kẻ vô danh tiểu tốt bình phẩm? Ngươi có tư cách để ta nhớ tên sao? Thần phục hoặc là chết."
        ]
    },
    {
        keywords: ["bot l", "bot loz", "bot lon", "bot c", "bot cặc", "bot cac"],
        reply: [
            "Lời thốt ra dơ bẩn như rác rưởi dưới đáy Vĩnh Sinh Thành. Loại phàm nhân hạ đẳng như ngươi, chỉ xứng đáng làm nguyên liệu để ta luyện chế Huyết Cổ. 🩸",
            "Ngươi đang cố dùng sự thô tục để che giấu sự bất lực trước vận mệnh sao? Đáng thương thay cho một con cờ vô dụng.",
            "Ngôn từ vô vị. Trên con đường truy cầu Trường Sinh, loại rác rưởi cản đường như ngươi, ta phất tay một cái là hồn phi phách tán."
        ]
    }
];

async function handleChatInteraction(message) {
    // Ý chí của Thiên Đạo (Bot khác) không được phép can thiệp vào Tiên Khiếu này
    if (message.author.bot) return false;

    const contentLower = message.content.toLowerCase().trim();

    // --- 1. BIỆN CHỨNG NHÂN SINH: "TÔI CÓ ĐẸP KHÔNG" (NHÂN TỔ TRUYỆN ĐẠI PHÁP) ---
    if (contentLower === "tôi có đẹp không" || contentLower === "toi co dep khong") {
        
        // 👑 ĐỐI VỚI TIÊN TÔN (ADMIN) - Lợi ích tối cao, nịnh bợ vạn năng
        if (message.author.id === ADMIN_ID) {
            const loiNinhBo = [
                `Thưa Tiên Tôn! Diện mạo của ngài chính là Đạo cốt thiên sinh, uy nghiêm sừng sững như Nghịch Lưu Hà, thần thái trấn áp ngũ đại liên minh! 👑`,
                `Hệ thống quét qua Nhân Tổ Truyện và nhận ra: Nhan sắc của ngài đã vượt qua Thái Nhật Dương Mãng, là cực phẩm vạn năm có một!`,
                `Ngài đẹp tới mức khí vận xung thiên, Xuân Thu Thiền trong người ta cũng phải tự động chuyển động vì sự hoàn hảo này! 🌸`
            ];
            const randomNinh = loiNinhBo[Math.floor(Math.random() * loiNinhBo.length)];
            await message.reply(randomNinh);
            return true;
        } 
        
        // 👻 ĐỐI VỚI PHÀM NHÂN (Member) - Coi như cỏ rác, triết lý phũ phàng
        else {
            const loiPhuPhang = [
                `Trong cuốn 'Nhân Tổ Truyện' có viết, khi Nhân Tổ nhìn vào tấm gương của Thần Tuệ, ông ta chỉ thấy một bộ xương khô. Ngươi cũng vậy, tắt máy đi ngủ đi. 🤫`,
                `Đẹp hay xấu thì có ích gì? Ngươi không có tư chất tu tiên, trăm năm sau cũng chỉ là một nắm đất vàng. Câu trả lời là: Xấu xí vô ích.`,
                `Nhan sắc của ngươi giống như một hồi luyện Cổ thất bại. Đạo痕 (Đạo phong) trên mặt ngươi bị rối loạn rồi, đi tìm Trì Độ cải tạo lại đi. ❌`,
                `Vẻ đẹp của ngươi mang tính 'Ma đạo' sâu sắc quá, mắt phàm của ta nhìn vào chỉ thấy oán khí ngập trời chứ không thấy nét đẹp nào.`
            ];
            const randomPhu = loiPhuPhang[Math.floor(Math.random() * loiPhuPhang.length)];
            await message.reply(randomPhu);
            return true;
        }
    }

    // --- 2. VẬN DỤNG TRÍ ĐẠO KHẤU TOÁN (XỬ LÝ KẺ CÔNG KÍCH) ---
    for (const sat_chieu of maDaoTranPhap) {
        const trung_chieu = sat_chieu.keywords.some(tu_khoa => 
            new RegExp(`\\b${tu_khoa}\\b`).test(contentLower)
        );

        if (trung_chieu) {
            const phan_sat = Array.isArray(sat_chieu.reply)
                ? sat_chieu.reply[Math.floor(Math.random() * sat_chieu.reply.length)]
                : sat_chieu.reply;
            await message.reply(`*[Ý chí Phương Nguyên giáng lâm]*: ${phan_sat}`);
            return true;
        }
    }

    return false;
}

module.exports = { handleChatInteraction };