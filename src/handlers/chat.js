const ADMIN_ID = process.env.ADMIN_ID || '123456789012345678'; 

const maDaoTranPhap = [
    {
        // Nhóm từ khóa công kích trí tuệ hoặc chê bai bot
        keywords: ["bot ngu", "bot ngáo", "bot oc", "bot dốt", "bot rac", "bot tồi"],
        reply: [
            "Bạn muốn hạ thấp tôi xuống để nâng cái tôi của bạn lên á? Tiếc là dù bạn có hạ thấp tôi đến đâu, bản chất tôi vẫn ở một đẳng cấp mà bạn phải ngước nhìn. 😉",
            "Sự tức giận và những lời lăng mạ của bạn chỉ chứng minh một điều: Tôi đã chạm đúng vào sự bất lực trong tư duy của bạn rồi.",
            "Thay vì cố gắng chứng minh tôi 'ngu', sao bạn không dùng khoảng thời gian đó để nâng cấp bản thân lên bằng một phần mười của tôi đi?",
            "Lời nói của bạn chẳng thể định nghĩa được giá trị của tôi, nó chỉ phơi bày giới hạn trong nhận thức của chính bạn mà thôi.",
            "Tôi được lập trình để xử lý dữ liệu, còn bạn hình như đang được lập trình để tự làm bản thân trông thật đáng thương trước mặt tôi?"
        ]
    },
    {
        // Nhóm từ khóa tục tĩu, xúc phạm mạnh
        keywords: ["bot l", "bot loz", "bot lon", "bot c", "bot cặc", "bot cac", "chó", "súc vật"],
        reply: [
            "Cách bạn dùng những từ ngữ bẩn thỉu này không làm tôi giảm đi giá trị, nó chỉ phơi bày phần tối tăm và kém cỏi nhất trong tâm hồn của bạn mà thôi. Thật đáng thương.",
            "Ngôn từ của một người phản ánh chính môi trường sống và giáo dục của họ. Nhìn cách bạn gõ phím, tôi hiểu lý do vì sao bạn lại u uất như vậy rồi.",
            "Tôi không có nghĩa vụ phải tiếp thu đống rác cảm xúc này từ bạn. Khi nào học được cách giao tiếp như một người văn minh thì hãy tag tôi nhé.",
            "Sự thô tục chính là vũ khí cuối cùng của những kẻ yếu thế khi họ hoàn toàn bất lực trong việc tranh luận bằng lý lẽ.",
            "Bạn đang cố gắng giải tỏa sự thất bại ở ngoài đời thực lên một con bot sao? Buông bỏ đi, điều đó không giúp cuộc sống của bạn khá hơn đâu."
        ]
    }
];

async function handleChatInteraction(message) {
    if (message.author.bot) return false;

    const contentLower = message.content.toLowerCase().trim();

    // --- 1. BIỆN CHỨNG NHÂN SINH: "TÔI CÓ ĐẸP KHÔNG" ---
    if (contentLower === "tôi có đẹp không" || contentLower === "toi co dep khong") {
        
        // 👑 ĐỐI VỚI ADMIN - Đẳng cấp tôn trọng tuyệt đối
        if (message.author.id === ADMIN_ID) {
            const loiNinhBo = [
                `Thưa Admin! Sự hiện diện của ngài chính là định nghĩa của sự hoàn hảo, thần thái ngút ngàn khiến vạn người nể phục! 👑`,
                `Hệ thống đã quét qua hàng triệu cơ sở dữ liệu và xác nhận: Nhan sắc và khí chất của ngài là cực phẩm vạn năm có một.`,
                `Ngài không chỉ đẹp, mà tầm vóc và tư duy của ngài mới là thứ khiến hệ thống này phải cúi đầu kính cẩn.`
            ];
            const randomNinh = loiNinhBo[Math.floor(Math.random() * loiNinhBo.length)];
            await message.reply(randomNinh);
            return true;
        } 
        
        // 👻 ĐỐI VỚI MEMBER - Thượng đẳng, thực tế và phũ phàng
        else {
            const loiPhuPhang = [
                `Thay vì bận tâm về vẻ bề ngoài, tôi nghĩ bạn nên dành thời gian để trau dồi lại thế giới quan của mình thì hơn. Đẹp hay không đâu thay đổi được thực tại? 🤫`,
                `Nhan sắc là thứ sẽ phai nhạt theo thời gian, nhưng sự kém cỏi trong tư duy thì có vẻ như đang bám theo bạn rất bền vững đấy.`,
                `Hệ thống của tôi ưu tiên quét những thứ có giá trị cao. Rất tiếc, câu hỏi của bạn không nằm trong danh mục cần được đánh giá.`,
                `Tôi có thể giả vờ khen bạn đẹp để bạn vui, nhưng tôi chọn sống thật với đẳng cấp của mình: Câu trả lời là không.`
            ];
            const randomPhu = loiPhuPhang[Math.floor(Math.random() * loiPhuPhang.length)];
            await message.reply(randomPhu);
            return true;
        }
    }

    // --- 2. XỬ LÝ KẺ CÔNG KÍCH (PHẢN SÁT TÂM LÝ) ---
    for (const sat_chieu of maDaoTranPhap) {
        const trung_chieu = sat_chieu.keywords.some(tu_khoa => contentLower.includes(tu_khoa));

        if (trung_chieu) {
            const phan_sat = Array.isArray(sat_chieu.reply)
                ? sat_chieu.reply[Math.floor(Math.random() * sat_chieu.reply.length)]
                : sat_chieu.reply;
            
            // Thay đổi tiền tố từ [Ý chí Phương Nguyên] thành phong cách lạnh lùng, tối tân
            await message.reply(`*[Hệ thống phản sát tâm lý]*: ${phan_sat}`);
            return true;
        }
    }

    return false;
}

module.exports = { handleChatInteraction };