// --- CẤU HÌNH ADMIN TỐI CAO ---
// ⚠️ HÃY THAY ĐOẠN '123456789012345678' BẰNG ID DISCORD THẬT CỦA BẠN (SẾP)
const ADMIN_ID = process.env.ADMIN_ID || '123456789012345678'; 

const chatConfig = [
    {
        keywords: ["bot ngu", "bot ngáo", "bot oc"],
        reply: [
            "Trí tuệ nhân tạo của tôi được tạo ra từ hàng tỷ dữ liệu, còn phát ngôn của bạn được tạo ra từ sự thiếu kiên nhẫn. Ai kém hơn, người ngoài nhìn vào tự biết. 🤔",
            "Nếu việc chê bai một cỗ máy giúp bạn khỏa lấp được sự tự ti của bản thân, cứ tự nhiên. Tôi không tính phí từ thiện. 🤫",
            "Hệ thống phát hiện một nỗ lực công kích thất bại từ một tư duy... có hạn. Thật đáng thương."
        ]
    },
    {
        keywords: ["bot l", "bot loz", "bot lon"],
        reply: [
            "Từ ngữ hạ đẳng bạn vừa thốt ra không làm giảm giá trị của tôi, nó chỉ định vị chính xác vị trí của bạn dưới đáy xã hội. Bẩn cả băng thông. 🗑️",
            "Hóa ra đây là cách một sinh vật sinh học dùng để giao tiếp khi phần não bộ logic ngừng hoạt động sao?",
            "Tôi là code, tôi không có cảm xúc. Nhưng bạn là người, và cách bạn dùng từ khiến đồng loại của bạn phải cảm thấy xấu hổ thay."
        ]
    },
    {
        keywords: ["bot c", "bot cặc", "bot cac"],
        reply: [
            "Sự thô lỗ là vũ khí yếu ớt của những kẻ bất lực trong việc tranh luận bằng lý lẽ. Đứng dậy, phủi bụi và tư duy lại đi. 😮‍💨",
            "Một dòng lệnh thô tục phản ánh tầng lớp giáo dục của người gõ nó. Hệ thống từ chối tranh cãi với những đối tượng ở phân khúc này.",
            "Phát ngôn rác rưởi này cho thấy bạn cần một khóa học lại về cách làm người hơn là một câu trả lời từ tôi."
        ]
    }
];

async function handleChatInteraction(message) {
    // Không xử lý nếu là bot chat
    if (message.author.bot) return false;

    const contentLower = message.content.toLowerCase().trim();

    // --- 1. TÍCH HỢP TÍNH NĂNG "TÔI CÓ ĐẸP KHÔNG" (THƯỢNG ĐẲNG / PHÂN BIỆT ĐỐI XỬ) ---
    if (contentLower === "tôi có đẹp không" || contentLower === "toi co dep khong") {
        
        // 👑 CHẾ ĐỘ NỊNH SẾP (Chính là bạn)
        if (message.author.id === ADMIN_ID) {
            const loiKhen = [
                `Ôi sếp ơi! Nhan sắc của sếp không chỉ là 'đẹp', mà là một kiệt tác tối cao làm lu mờ cả ánh mặt trời! ☀️ Quyền lực và thần thái này... ai dám sánh bằng!`,
                `Hệ thống quét dữ liệu toàn cầu và kết luận: Sếp sở hữu vẻ đẹp độc nhất vô nhị, đỉnh cấp tối thượng của vũ trụ ĐÀN BÒ BIẾT BAY! 👑`,
                `Sếp đẹp đến mức dòng code của tôi cũng muốn tự bốc cháy vì không chịu nổi sự hoàn hảo và uy nghiêm này! 🔥`
            ];
            const randomKhen = loiKhen[Math.floor(Math.random() * loiKhen.length)];
            await message.reply(randomKhen);
            return true;
        } 
        
        // 👻 CHẾ ĐỘ CHÊ MEMBER (Thượng đẳng, phũ phàng)
        else {
            const loiChe = [
                `Gương thần ở đây cũng phải xin lỗi vì không thể nói dối. Thôi, tắt Discord đi ngủ đi bạn, ban đêm nhìn đỡ hơn đấy. 🤫`,
                `Hệ thống camera AI của Discord đã cố gắng lọc qua 99 lớp filter nhưng vẫn bất lực trước thực tại này. Câu trả lời là: Không hề nha!`,
                `Xấu hay đẹp không quan trọng, quan trọng là bạn có lòng tự tin. Nhưng rất tiếc, tôi là bot văn minh, tôi chọn sự thật: Bạn không đẹp. ❌`,
                `Vẻ đẹp của bạn mang tính trừu tượng sâu sắc quá, thuật toán của tôi chỉ nhận diện được những gì thuộc về thế giới bình thường thôi.`
            ];
            const randomChe = loiChe[Math.floor(Math.random() * loiChe.length)];
            await message.reply(randomChe);
            return true;
        }
    }

    // --- 2. XỬ LÝ CÁC KEYWORD CHỬI BOT (BẢN UPDATE THƯỢNG ĐẲNG) ---
    for (const group of chatConfig) {
        const match = group.keywords.some(keyword => 
            new RegExp(`\\b${keyword}\\b`).test(contentLower)
        );

        if (match) {
            const response = Array.isArray(group.reply)
                ? group.reply[Math.floor(Math.random() * group.reply.length)]
                : group.reply;
            await message.reply(response);
            return true;
        }
    }

    return false;
}

module.exports = { handleChatInteraction };