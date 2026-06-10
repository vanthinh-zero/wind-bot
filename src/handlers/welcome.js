// src/handlers/welcome.js
async function handleWelcomeMember(member) {
    try {
        // 1. Tự động cấp role Tân Thủ cho thành viên mới (nếu bạn có dùng tính năng này)
        if (process.env.ROLE_TAN_THU) {
            const role = member.guild.roles.cache.get(process.env.ROLE_TAN_THU);
            if (role) {
                await member.roles.add(role).catch(() => {});
            }
        }

        // 2. Kiểm tra kênh chào mừng
        if (!process.env.KENH_CHAO_MUNG) return;
        const wlChannel = member.guild.channels.cache.get(process.env.KENH_CHAO_MUNG);
        if (!wlChannel) return;

        // 3. Chuẩn bị nội dung chào hỏi như người thường
        let welcomeMessage = `Chào mừng ${member} đã tham gia vào server chúng ta! Chúc bạn có những giây phút vui vẻ nha. 🎉`;

        // Nếu có cấu hình Role cần thông báo, bot sẽ tag thêm role đó ở cuối câu
        if (process.env.ROLE_CAN_THONG_BAO) {
            welcomeMessage += ` \n📢 <@&${process.env.ROLE_CAN_THONG_BAO}> ơi, có đạo hữu mới nhập môn kìa, ra chào đón nào!`;
        }
            
        // Gửi tin nhắn text thường vào kênh chat
        await wlChannel.send(welcomeMessage).catch(() => {});

    } catch (error) {
        console.error('❌ Lỗi xử lý sự kiện chào mừng:', error);
    }
}

module.exports = { handleWelcomeMember };