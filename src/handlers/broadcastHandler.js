/**
 * Module hỗ trợ Admin/Owner gửi tin nhắn tới bất kỳ channel nào
 * Cú pháp: !say <channel_id> <nội dung tin nhắn>
 */
async function handleBroadcastCommand(message) {
    if (!message.content.toLowerCase().startsWith('!say')) return false;

    // Lấy ADMIN_ID từ .env (hỗ trợ 1 ID hoặc danh sách ID cách nhau bởi dấu phẩy)
    const adminIds = process.env.ADMIN_ID ? process.env.ADMIN_ID.split(',').map(id => id.trim()) : [];

    // Kiểm tra xem người dùng có nằm trong danh sách ADMIN_ID không
    if (!adminIds.includes(message.author.id)) {
        await message.reply('⛔ Bạn không có quyền sử dụng lệnh này.');
        return true;
    }

    // Tách tham số
    const args = message.content.slice(4).trim().split(/ +/);
    const targetChannelId = args.shift();
    const textToSend = args.join(' ');

    if (!targetChannelId || !textToSend) {
        await message.reply('⚠️ Cú pháp chưa đúng!\n👉 **Cách dùng:** `!say <channel_id> <Nội dung tin nhắn>`');
        return true;
    }

    try {
        const targetChannel = await message.client.channels.fetch(targetChannelId);

        if (!targetChannel || !targetChannel.isTextBased()) {
            await message.reply('❌ Không tìm thấy channel dạng chữ (Text Channel) với ID này.');
            return true;
        }

        await targetChannel.send(textToSend);
        await message.reply(`✅ Đã gửi thành công tin nhắn đến kênh <#${targetChannelId}>!`);
    } catch (error) {
        console.error('Lỗi khi gửi broadcast (!say):', error);
        await message.reply(`❌ **Gửi thất bại!** Lỗi: \`${error.message}\` (Hãy kiểm tra ID channel hoặc quyền của Bot tại server đó).`);
    }

    return true;
}

module.exports = { handleBroadcastCommand };