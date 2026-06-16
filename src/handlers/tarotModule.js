const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const tarotDeck = require('./tarotDeck');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const moneyPath = path.join(__dirname, '../../money.json'); 

// Bộ nhớ đệm lưu câu hỏi tạm thời của người chơi
const tarotSessions = new Map();

const TAROT_PRICES = {
    '1_card': 500,
    '3_cards': 1200,
    'daily': 300,
    'love': 1000
};

function getMoneyData() {
    try { if (!fs.existsSync(moneyPath)) return {}; const data = fs.readFileSync(moneyPath, 'utf8'); return data ? JSON.parse(data) : {}; } 
    catch (error) { console.error("Lỗi đọc file money.json:", error); return {}; }
}
function saveMoneyData(data) {
    try { fs.writeFileSync(moneyPath, JSON.stringify(data, null, 2), 'utf8'); } 
    catch (error) { console.error("Lỗi ghi file money.json:", error); }
}

// =========================================================
// HÀM RÚT BÀI THÔNG MINH: ĐỌC HIỂU CÂU HỎI ĐỂ TRẢ LỜI TƯƠNG XỨNG
// =========================================================
function drawRandomCard(type, userQuestion = "") {
    const card = tarotDeck[Math.floor(Math.random() * tarotDeck.length)];
    const isReversed = Math.random() < 0.5;
    
    const direction = isReversed ? "🔴 CHIỀU NGƯỢC (Reversed)" : "🟢 CHIỀU XUÔI (Upright)";
    const rawExplanation = isReversed ? card.reversed : card.upright;
    
    let tailoredExplanation = "";
    
    if (typeof rawExplanation === 'object') {
        const questionLower = userQuestion.toLowerCase();

        // 1. Nhóm từ khóa định vị chủ đề TÌNH CẢM / MỐI QUAN HỆ
        const loveKeywords = ['yêu', 'tình cảm', 'thích', 'crush', 'người yêu', 'chia tay', 'quay lại', 'cưới', 'hẹn hò', 'nhắn tin', 'phản bội', 'cắm sừng', 'ny', 'ex'];
        const isLoveQuestion = loveKeywords.some(keyword => questionLower.includes(keyword)) || type === 'love';

        // 2. Nhóm từ khóa định vị chủ đề CÔNG VIỆC / TIỀN BẠC / HỌC HÀNH
        const workKeywords = ['việc', 'làm', 'công ty', 'sự nghiệp', 'tiền', 'xu', 'lương', 'học', 'thi', 'đỗ', 'trượt', 'phỏng vấn', 'kinh doanh', 'sếp', 'đồng nghiệp'];
        const isWorkQuestion = workKeywords.some(keyword => questionLower.includes(keyword));

        if (isLoveQuestion && rawExplanation.love) {
            tailoredExplanation = rawExplanation.love;
        } else if (isWorkQuestion && rawExplanation.work) {
            tailoredExplanation = rawExplanation.work;
        } else {
            if (type === 'love') {
                tailoredExplanation = rawExplanation.love || rawExplanation.general;
            } else {
                tailoredExplanation = rawExplanation.general || rawExplanation.work;
            }
        }
    } else {
        tailoredExplanation = rawExplanation;
    }

    return {
        name: card.name,
        direction: direction,
        explanation: tailoredExplanation,
        color: isReversed ? '#C0392B' : '#27AE60',
        image: card.image
    };
}

// =========================================================
// BƯỚC 1: ĐẠI SẢNH TAROT (!tarot)
// =========================================================
async function handleTarotCommand(message) {
    if (message.channel.id !== process.env.TAROT_CHANNEL_ID) {
        return message.reply(`🔮 Tính năng bói bài Tarot chỉ hoạt động tại kênh dành riêng: <#${process.env.TAROT_CHANNEL_ID}>!`);
    }

    const mainEmbed = new EmbedBuilder()
        .setColor('#1A0B2E')
        .setTitle('🔮 ĐẠI SẢNH TAROT - KẾT NỐI TÂM THỨC 🔮')
        .setDescription(
            '**Hãy thả lỏng cơ thể, nhắm mắt và hít thở sâu 3 nhịp...**\n\n' +
            '*Để thỉnh giải thông điệp từ vũ trụ, bạn cần tập trung năng lượng vào vấn đề đang thắc mắc. Quy trình bói bài sẽ diễn ra chuẩn đời thực qua các bước: Đặt câu hỏi ➔ Xáo bài ➔ Kinh bài ➔ Chọn tụ bài.*\n\n' +
            `🪙 **Năng lượng tiêu hao (Trừ vào tài khoản):**\n` +
            `• 🃏 Rút 1 Lá (Giải đáp thắc mắc): \`${TAROT_PRICES['1_card']} xu\`\n` +
            `• ⏳ Trải Bài 3 Lá (Dòng thời gian): \`${TAROT_PRICES['3_cards']} xu\`\n` +
            `• ☀️ Năng Lượng Ngày Mới: \`${TAROT_PRICES['daily']} xu\`\n` +
            `• ❤️ Trải Bài Tình Cảm: \`${TAROT_PRICES['love']} xu\``
        )
        .setImage('https://media.discordapp.net/attachments/1508103127956455536/1516067374401585313/c1faffab9bea11f14b9dc6ca25484640.png?ex=6a314b45&is=6a2ff9c5&hm=b76888c91f122e137d762794bc7833382df1fcbc572503fd4980c3cce10f4b58&=&format=webp&quality=lossless')
        .setFooter({ text: 'Hãy bấm loại quẻ bạn muốn thỉnh để bắt đầu quy trình...' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tarot_init_1_card').setLabel(`🃏 Thỉnh 1 Lá (${TAROT_PRICES['1_card']} xu)`).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tarot_init_3_cards').setLabel(`⏳ Trải 3 Lá (${TAROT_PRICES['3_cards']} xu)`).setStyle(ButtonStyle.Success)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tarot_init_daily').setLabel(`☀️ Ngày Mới (${TAROT_PRICES['daily']} xu)`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tarot_init_love').setLabel(`❤️ Tình Cảm (${TAROT_PRICES['love']} xu)`).setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({ embeds: [mainEmbed], components: [row1, row2] });
}

// =========================================================
// BƯỚC 2: XỬ LÝ QUY TRÌNH NÚT BẤM (XÁO BÀI -> BỐC TỤ)
// =========================================================
async function handleTarotInteraction(interaction) {
    if (!interaction.isButton()) return;
    const customId = interaction.customId;
    const userId = interaction.user.id;

    // --- BƯỚC 2A: KHỞI ĐỘNG - MỞ BẢNG ĐẶT CÂU HỎI (MODAL) ---
    if (customId.startsWith('tarot_init_')) {
        const type = customId.replace('tarot_init_', '');
        const price = TAROT_PRICES[type];

        const moneyData = getMoneyData();
        const currentBalance = moneyData[userId]?.money || 0; 
        
        if (currentBalance < price) {
            return await interaction.reply({
                content: `❌ **Không đủ xu!** Bạn cần **${price} xu** để thỉnh quẻ này (Hiện tại bạn có: **${currentBalance} xu**).`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        const modal = new ModalBuilder().setCustomId(`tarot_modal_${type}`).setTitle('🔮 TẬP TRUNG TÂM THỨC');
        const questionInput = new TextInputBuilder()
            .setCustomId('tarot_question')
            .setLabel('CÂU HỎI TẬP TRUNG (NGẮN GỌN, 1 VẤN ĐỀ DUY NHẤT):')
            .setPlaceholder('Ví dụ: Sắp tới em có được tăng lương hay không? (Tránh viết quá dài hoặc hỏi nhiều ý)...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(150); // Thu hẹp độ dài tối đa lại để ép người dùng cô đọng ý chính

        modal.addComponents(new ActionRowBuilder().addComponents(questionInput));
        await interaction.showModal(modal);
        return;
    }

    // --- BƯỚC 2C: TIẾN HÀNH KINH BÀI & THIẾT LẬP CÁC TỤ BÀI ---
    if (customId.startsWith('tarot_shuffle_')) {
        const type = customId.replace('tarot_shuffle_', '');
        
        const session = tarotSessions.get(userId);
        if (!session || session.type !== type) {
            return await interaction.reply({ content: '❌ Phiên bói bài đã hết hạn, vui lòng gõ lệnh `!tarot` để thực hiện lại!', flags: [MessageFlags.Ephemeral] });
        }

        const cutEmbed = new EmbedBuilder()
            .setColor('#6C5CE7')
            .setTitle('🃏 BƯỚC CUỐI: KINH BÀI & CHỌN TỤ BÀI')
            .setDescription(
                `🔮 **Câu hỏi của bạn:** *"${session.question}"*\n\n` +
                `*Bộ bài đã được xáo trộn đều năng lượng. Hãy lắng nghe trực giác và chọn lấy 1 trong 3 tụ bài đang úp bên dưới để nhận thông điệp từ Vũ Trụ:*`
            )
            .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z0ZndpbnY0M2p0cXg0bWszY29wZzVwcmh3OHg2bW9icWZ4YndzdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o72EX5QZ9N9d51dqo/giphy.gif')
            .setFooter({ text: 'Trực giác đầu tiên luôn là trực giác chính xác nhất...' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`tarot_draw_${type}_1`).setLabel('🔮 Tụ Số 1').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`tarot_draw_${type}_2`).setLabel('🔮 Tụ Số 2').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`tarot_draw_${type}_3`).setLabel('🔮 Tụ Số 3').setStyle(ButtonStyle.Primary)
        );

        await interaction.update({ embeds: [cutEmbed], components: [row] });
        return;
    }

    // --- BƯỚC 2D: TRỪ TIỀN VÀ TRẢ KẾT QUẢ CUỐI CÙNG ---
    if (customId.startsWith('tarot_draw_')) {
        const parts = customId.split('_'); 
        let type = parts[2];
        let tuNumber = parts[3];

        if (parts[3] === 'card' || parts[3] === 'cards') {
            type = `${parts[2]}_${parts[3]}`;
            tuNumber = parts[4];
        }

        const price = TAROT_PRICES[type];
        const session = tarotSessions.get(userId);

        if (!session) {
            return await interaction.reply({ content: `❌ Không tìm thấy thông tin quẻ bài của bạn. Vui lòng thử lại bằng lệnh \`!tarot\`.`, flags: [MessageFlags.Ephemeral] });
        }

        const moneyData = getMoneyData();
        if (!moneyData[userId] || moneyData[userId].money < price) {
            return await interaction.reply({ content: `❌ Giao dịch thất bại do số dư tài khoản của bạn không đủ!`, flags: [MessageFlags.Ephemeral] });
        }
        
        moneyData[userId].money -= price;
        saveMoneyData(moneyData);

        const remainingMsg = `*(Đã khấu trừ ${price} xu, số dư còn lại của bạn: ${moneyData[userId].money} xu)*`;
        const question = session.question;

        tarotSessions.delete(userId);

        if (type === '1_card' || type === 'daily') {
            const card = drawRandomCard(type, question); 
            const resultEmbed = new EmbedBuilder()
                .setColor(card.color)
                .setTitle(`🔮 QUẺ BÀI TAROT KHẢI HUYỀN (TỤ SỐ ${tuNumber})`)
                .setDescription(
                    `❓ **Câu hỏi tâm thức:** *"${question}"*\n` +
                    `🃏 **Lá bài định mệnh xuất hiện:** **${card.name}** (${card.direction})\n\n` +
                    `**📜 THÔNG ĐIỆP CHUYÊN BIỆT CHO BẠN:**\n${card.explanation}\n\n${remainingMsg}`
                )
                .setImage(card.image)
                .setFooter({ text: `Được thỉnh bởi ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.update({ embeds: [resultEmbed], components: [] });
        }
        else if (type === '3_cards') {
            const c1 = drawRandomCard(type, question);
            let c2 = drawRandomCard(type, question); while (c2.name === c1.name) c2 = drawRandomCard(type, question);
            let c3 = drawRandomCard(type, question); while (c3.name === c1.name || c3.name === c2.name) c3 = drawRandomCard(type, question);

            const resultEmbed = new EmbedBuilder()
                .setColor('#2980B9')
                .setTitle(`⏳ TRẢI BÀI DÒNG THỜI GIAN KHÔNG GIAN (TỤ SỐ ${tuNumber})`)
                .setDescription(`❓ **Vấn đề băn khoăn:** *"${question}"*\n${remainingMsg}`)
                .addFields(
                    { name: `⏮️ Tổng quan Quá khứ: ${c1.name}`, value: c1.explanation },
                    { name: `🔄 Thực tại Hiện tại: ${c2.name}`, value: c2.explanation },
                    { name: `⏭️ Dự báo Tương lai gần: ${c3.name}`, value: c3.explanation }
                )
                .setThumbnail(c3.image)
                .setFooter({ text: `Vận trình trải bài của linh hồn ${interaction.user.username}` });

            await interaction.update({ embeds: [resultEmbed], components: [] });
        }
        else if (type === 'love') {
            const c1 = drawRandomCard(type, question); 
            let c2 = drawRandomCard(type, question); while (c2.name === c1.name) c2 = drawRandomCard(type, question);

            const resultEmbed = new EmbedBuilder()
                .setColor('#E91E63')
                .setTitle(`❤️ LUẬN GIẢI TÌNH DUYÊN HOÀNG ĐẠO (TỤ SỐ ${tuNumber})`)
                .setDescription(`❓ **Câu hỏi tình cảm:** *"${question}"*\n${remainingMsg}`)
                .addFields(
                    { name: `👤 Phía năng lượng của bạn: ${c1.name}`, value: c1.explanation },
                    { name: `💞 Năng lượng đối phương & Chặng đường chung: ${c2.name}`, value: c2.explanation }
                )
                .setThumbnail(c1.image)
                .setFooter({ text: `Hãy thấu hiểu bản thân trước khi thấu hiểu tình yêu...` });

            await interaction.update({ embeds: [resultEmbed], components: [] });
        }
    }
}

// =========================================================
// BƯỚC 2B: THU THẬP CÂU HỎI VÀ KIỂM DUYỆT CHẤT LƯỢNG ĐẦU VÀO
// =========================================================
async function handleTarotModalSubmit(interaction) {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith('tarot_modal_')) return;

    const type = interaction.customId.replace('tarot_modal_', '');
    let question = interaction.fields.getTextInputValue('tarot_question').trim();
    const userId = interaction.user.id;

    // --- BỘ KIỂM TRA CHẤT LƯỢNG CÂU HỎI CỦA THÀNH VIÊN ---
    const wordCount = question.split(/\s+/).length; // Đếm số từ
    const questionMarkCount = (question.match(/\?/g) || []).length; // Đếm số lượng câu hỏi thông qua dấu "?"
    
    // 1. Chặn câu hỏi quá ngắn hoặc spam ký tự vô nghĩa
    if (question.length < 10 || wordCount < 3) {
        return await interaction.reply({
            content: `⚠️ **Câu hỏi quá ngắn hoặc chưa rõ ý!** Để kết nối năng lượng ma thuật tốt nhất, bạn nên viết câu hỏi đầy đủ chủ vị ít nhất từ 3 đến 4 từ trở lên nhé.`,
            flags: [MessageFlags.Ephemeral]
            });
    }

    // 2. Chặn câu hỏi kể lể, quá dài dòng (Nên khuyên họ gói gọn dưới 20 từ)
    if (wordCount > 25) {
         return await interaction.reply({
            content: `⚠️ **Câu hỏi quá dài dòng và lan man!** (*Hiện tại là ${wordCount} từ*).\n\n*Để thông điệp vũ trụ trả về được tập trung và chính xác nhất, bạn hãy lược bỏ phần kể lể câu chuyện, chỉ tập trung gõ đúng **1 câu hỏi cốt lõi** duy nhất (Dưới 25 từ) nhé!*`,
            flags: [MessageFlags.Ephemeral]
         });
    }

    // 3. Chặn việc ôm đồm, hỏi quá nhiều câu hỏi cùng lúc
    // Quét các từ nối hỏi dồn dập hoặc đếm số lượng dấu chấm hỏi
    const multiQuestionKeywords = ['và cả', 'đồng thời', 'với lại', 'tiện thể hỏi'];
    const hasMultiKeywords = multiQuestionKeywords.some(keyword => question.toLowerCase().includes(keyword));

    if (questionMarkCount > 1 || hasMultiKeywords) {
         return await interaction.reply({
            content: `⚠️ **Phát hiện nhiều câu hỏi lồng ghép cùng lúc!**\n\n*Một quẻ Tarot chỉ nên đại diện cho **một vấn đề duy nhất**. Việc hỏi dồn dập nhiều ý sẽ làm nhiễu loạn năng lượng bài. Vui lòng làm lại và chia nhỏ các câu hỏi ra để thỉnh từng quẻ riêng biệt nhé!*`,
            flags: [MessageFlags.Ephemeral]
         });
    }

    // Nếu vượt qua toàn bộ các vòng kiểm duyệt -> Lưu vào Session bộ nhớ đệm
    tarotSessions.set(userId, { type, question, timestamp: Date.now() });

    const shuffleEmbed = new EmbedBuilder()
        .setColor('#E67E22')
        .setTitle('🧼 BƯỚC KẾ TIẾP: XÁO TRỘN NĂNG LƯỢNG BÀI TAROT')
        .setDescription(
            `❓ **Câu hỏi hợp lệ:** *"${question}"*\n\n` +
            `*Bây giờ, hãy nhấn vào nút **Nhấn Để Xáo Bài** bên dưới để bot tiến hành tráo bài, hòa quyện tần số năng lượng của bạn vào các lá bài ma thuật.*`
        )
        .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHI5c3V3ZXF3NmlyemN3YnVvNGM2dnd4YW9wdjAwMmd5ODJkOXp1dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LpwBqCorPvZCw/giphy.gif')
        .setFooter({ text: 'Thả lỏng tâm trí và nhấn nút khi đã sẵn sàng...' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`tarot_shuffle_${type}`).setLabel('🧼 Nhấn Để Xáo Bài').setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [shuffleEmbed], components: [row], flags: [MessageFlags.Ephemeral] });
}

// Tự động giải phóng các phiên bói bài bị treo quá 5 phút
setInterval(() => {
    const now = Date.now();
    for (const [userId, session] of tarotSessions.entries()) {
        if (now - session.timestamp > 5 * 60 * 1000) {
            tarotSessions.delete(userId);
        }
    }
}, 60 * 1000);

module.exports = { handleTarotCommand, handleTarotInteraction, handleTarotModalSubmit };