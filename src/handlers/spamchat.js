// src/handlers/spamchat.js

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleSpamCommand(message) {
  const adminId = process.env.ADMIN_ID;

  if (!adminId) {
    return message.reply("⚠️ Chưa cấu hình `ADMIN_ID` trong file `.env`!");
  }

  // Kiểm tra quyền Admin
  if (String(message.author.id) !== String(adminId).trim()) {
    return message.reply("⚠️ Bạn không có quyền sử dụng lệnh này!");
  }

  // Cắt bỏ tiền tố "!spawntinnhan"
  const argsText = message.content.slice("!spawntinnhan".length).trim();
  const args = argsText.split(/\s+/);

  // Cần ít nhất 2 tham số: [Nội dung...] [Số lượng]
  if (!argsText || args.length < 2) {
    return message.reply(
      "⚠️ Cú pháp không hợp lệ!\n👉 **Cú pháp:** `!spawntinnhan <nội dung> <số_lượng>`\n👉 **Ví dụ:** `!spawntinnhan Alo bot test 5`"
    );
  }

  // Lấy tham số cuối cùng làm số lượng
  const countStr = args.pop();
  const count = parseInt(countStr, 10);

  // Ghép các từ còn lại làm nội dung tin nhắn
  const spamContent = args.join(" ");

  if (isNaN(count) || count <= 0) {
    return message.reply("⚠️ Số lượng tin nhắn phải là một số nguyên dương hợp lệ!");
  }

  if (!spamContent) {
    return message.reply("⚠️ Bạn chưa nhập nội dung tin nhắn!");
  }

  // Giới hạn an toàn
  const MAX_LIMIT = 50;
  if (count > MAX_LIMIT) {
    return message.reply(`⚠️ Số lượng tin nhắn vượt quá giới hạn an toàn! Tối đa là ${MAX_LIMIT} tin.`);
  }

  await message.channel.send(`🚀 Bắt đầu gửi ${count} tin nhắn với nội dung: "${spamContent}"...`);

  for (let i = 1; i <= count; i++) {
    await message.channel.send(`${spamContent} (${i}/${count})`);
    await sleep(1000); // Tạm dừng 1 giây để tránh Rate Limit Discord
  }

  await message.channel.send("✅ Đã hoàn thành gửi spam tin nhắn!");
}

module.exports = { handleSpamCommand };