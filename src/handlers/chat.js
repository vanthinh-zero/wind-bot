async function handleChatInteraction(message) {
    if (message.author.bot) return false;

    const content = message.content.trim();
    const contentLower = content.toLowerCase();
    const clientUser = message.client.user;

    // 1. KIỂM TRA QUYỀN TRUY CẬP (Chỉ Admin hoặc Staff mới được đi tiếp)
    const isAdmin = message.author.id === ADMIN_ID || message.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const isStaff = message.member.roles.cache.some(role => role.name.toLowerCase() === 'bò quản trị');

    // Nếu không phải Admin và cũng không phải Staff -> Bỏ qua hoàn toàn, không trả lời
    if (!isAdmin && !isStaff) return false; 

    // 2. CÁC LỆNH CẤU HÌNH HỆ THỐNG (Chỉ DUY NHẤT Admin được chỉnh)
    if (contentLower === "!autochat on" || contentLower === "!autochat off" || contentLower === "!mood cold" || contentLower === "!mood macdinh") {
        if (!isAdmin) {
            await message.reply("❌ Quyền lực của bạn không đủ để cấu hình hệ thống!");
            return true;
        }
        
        if (contentLower === "!autochat on") {
            CO_AUTO_CHAT = true;
            await message.reply(BOT_MOOD === 'cold' ? "AutoChat: ON." : "🚀 **[Hệ thống]**: Đã kích hoạt lại chế độ AutoChat!");
        } else if (contentLower === "!autochat off") {
            CO_AUTO_CHAT = false;
            await message.reply(BOT_MOOD === 'cold' ? "AutoChat: OFF." : "🤫 **[Hệ thống]**: Đã tạm dừng hoạt động AutoChat.");
        } else if (contentLower === "!mood cold") {
            BOT_MOOD = 'cold';
            await message.reply("Đã chuyển đổi cấu hình hệ thống: tôi ở đây.");
        } else if (contentLower === "!mood macdinh") {
            BOT_MOOD = 'macdinh';
            await message.reply("Đã quay về phong cách mặc định, lém lỉnh vâng lệnh sếp!");
        }
        return true;
    }

    // Lệnh thống kê tag (Cả Admin và Staff đều xem được)
    if (contentLower === "!thongketag") {
        const stats = CodeDocStats();
        const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return await message.reply("Chưa ghi nhận dữ liệu tag.");
        
        let bieuDo = BOT_MOOD === 'cold' ? "📊 **Thống kê lượt tag:**\n" : "📊 **BẢNG XẾP HẠNG GHI PHẠM:**\n---------------------------------------\n";
        for (let i = 0; i < Math.min(sorted.length, 10); i++) {
            bieuDo += `${i + 1}. <@${sorted[i][0]}>: ${sorted[i][1]} lần\n`;
        }
        await message.reply(bieuDo);
        return true;
    }

    const isMentioned = message.mentions.has(clientUser) && !message.mentions.everyone;
    const isCalledName = contentLower.startsWith("wind ơi") || contentLower.startsWith("wind ");
    const tuKhoaQuyenLuc = ["anh", "sếp", "wind", "giúp", "tạo", "xóa", "đổi"];
    const adminKichHoatTuKhoa = tuKhoaQuyenLuc.some(tu => contentLower.includes(tu));

    // 3. XỬ LÝ NHẬN DIỆN ĐỂ GỌI AI
    if ((isMentioned || isCalledName || adminKichHoatTuKhoa) && !contentLower.startsWith("!taocontent")) {
        if (!ai) {
            await message.reply("Hệ thống chưa cấu hình GEMINI_KEY.");
            return true;
        }

        // Cập nhật thống kê tag
        let stats = CodeDocStats();
        const mId = message.author.id;
        stats[mId] = (stats[mId] || 0) + 1;
        CodeGhiStats(stats);

        try {
            await message.channel.sendTyping();
            
            let userPrompt = content.replace(new RegExp(`<@!?${clientUser.id}>`, 'g'), '').trim();
            if (userPrompt.toLowerCase().startsWith("wind")) {
                userPrompt = userPrompt.slice(4).trim();
            }

            // Điều chỉnh cách xưng hô của AI dựa theo việc người gọi là Admin hay Staff
            const roleUserText = isAdmin ? "Admin tối cao" : "Staff (Nhân viên cấp dưới)";

            const systemInstruction = BOT_MOOD === 'cold'
                ? `Bạn là "wind" - trợ lý tổng tài, lạnh lùng, ít nói. Bạn đang trò chuyện với ${message.author.username} (Chức vụ: ${roleUserText}).
                   Trả lời cực kỳ ngắn gọn, súc tích, nghiêm túc. Không dùng icon.
                   *Lưu ý quan trọng*: Chỉ khi người chat là "Admin tối cao", bạn mới được phép chèn các mã lệnh hệ thống sau:
                   - Tạo Role: [CMD:CREATE_ROLE:Tên Role:Màu]
                   - Dọn tin nhắn: [CMD:CLEAR_MSG:Số lượng]
                   - Tạo Kênh: [CMD:CREATE_CHANNEL:Tên Kênh:text hoặc voice]
                   - Xóa kênh: [CMD:DELETE_CHANNEL]
                   - Đổi biệt danh: [CMD:SET_NICK:ID_MEMBER:Biệt danh mới].
                   Nếu chức vụ của họ là Staff, TUYỆT ĐỐI KHÔNG chèn các mã lệnh trên, chỉ trò chuyện hỗ trợ thông thường.`
                : `Bạn là "wind" - trợ lý của server "ĐÀN BÒ BIẾT BAY". Bạn đang trò chuyện với ${message.author.username} (Chức vụ: ${roleUserText}).
                   Hãy trả lời bằng phong cách lém lỉnh, trung thành.
                   *Lưu ý quan trọng*: Chỉ khi chức vụ là "Admin tối cao" bạn mới được chèn mã hệ thống thực thi lệnh: [CMD:CREATE_ROLE...], [CMD:CLEAR_MSG...], [CMD:CREATE_CHANNEL...], [CMD:DELETE_CHANNEL], [CMD:SET_NICK...].
                   Nếu họ là Staff, tuyệt đối không chèn mã lệnh phá cấu hình server, chỉ trả lời bằng lời nói lém lỉnh bình thường.`;

            const targetUser = message.mentions.users.first();
            let promptText = `${roleUserText} nói: "${userPrompt}"`;
            if (targetUser) promptText += `\n(ID đối tượng: ${targetUser.id})`;

            let response;
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `${systemInstruction}\n\n${promptText}`,
                });
            } catch (apiErr) {
                console.error("Lỗi kết nối Google:", apiErr.message);
                await message.reply(BOT_MOOD === 'cold' ? "Hệ thống nghẽn." : "📡 Máy chủ quá tải sếp ơi!");
                return true;
            }

            let botReply = response.text || (BOT_MOOD === 'cold' ? "Rõ." : "Em nghe đây ạ!");

            // 4. HẠN CHẾ STAFF Ở TẦNG THỰC THI (Nếu AI lỡ sinh lệnh hệ thống cho Staff, bẻ gãy lệnh luôn)
            const containsCommand = botReply.includes('[CMD:');
            if (containsCommand && !isAdmin) {
                // Xóa toàn bộ tag lệnh hệ thống đi nếu người gọi chỉ là Staff
                botReply = botReply.replace(/\[CMD:.*?\]/g, '').trim(); 
                botReply += BOT_MOOD === 'cold' ? "\n(Yêu cầu thực thi lệnh bị từ chối do thiếu quyền)." : "\n*(Lệnh hệ thống bị hủy vì Staff không có quyền cấu hình server nhé!)*";
                await message.reply(botReply);
                return true;
            }

            // Nếu là Admin, tiến hành chạy lệnh như bình thường
            const processedReply = await executeServerAction(message, botReply);
            if (processedReply) await message.reply(processedReply);
            return true;
        } catch (error) { console.error(error); return true; }
    }

    // Lệnh tạo content (Cả Admin và Staff đều dùng được nhưng kiểm tra đúng kênh)
    if (contentLower.startsWith("!taocontent")) {
        if (KENH_CONTENT_ID && message.channel.id !== KENH_CONTENT_ID) {
            await message.reply(BOT_MOOD === 'cold' ? `Sai kênh.` : `Sếp/Staff ơi, lệnh này chỉ dùng ở kênh <#${KENH_CONTENT_ID}> thôi nhé!`); 
            return true;
        }
        const topic = content.slice(11).trim();
        if (!topic) { await message.reply(BOT_MOOD === 'cold' ? "Thiếu chủ đề." : "Thiếu chủ đề rồi kìa!"); return true; }
        try {
            await message.channel.sendTyping();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Lên kịch bản TikTok chi tiết cho chủ đề: ${topic}`,
            });
            await message.channel.send(response.text || "No data."); return true;
        } catch (e) { 
            await message.reply("API Error.");
            return true; 
        }
    }

    // Auto lấy video TikTok (Cá Admin và Staff đều dùng được công khai)
    if (contentLower.includes("tiktok.com")) {
        const urlRegex = /(https?:\/\/[^\s]+)/g; const tiktokUrl = content.match(urlRegex)?.[0];
        if (tiktokUrl) {
            try {
                const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`;
                const responseData = await sfetch(apiUrl, { method: 'GET' });
                const videoUrl = responseData?.data?.play;
                if (videoUrl) {
                    const videoAttachment = new AttachmentBuilder(videoUrl, { name: 'tiktok-video.mp4' });
                    await message.channel.send({ content: BOT_MOOD === 'cold' ? `Video từ **${message.author.username}**:` : `🎬 Video TikTok từ **${message.author.username}**:`, files: [videoAttachment] });
                    if (message.deletable) await message.delete().catch(() => null);
                }
            } catch (error) { const embedLink = tiktokUrl.replace(/tiktok\.com/g, "tnktok.com"); await message.reply(`Link thay thế:\n${embedLink}`); }
        }
    }

    return false;
}