const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const moneyPath = path.join(__dirname, '../../money.json'); 
const tarotSessions = new Map();

// Bộ bài dự phòng tích hợp sẵn
const backupDeck = [
    {
        name: "The Fool (Chàng Khờ)",
        upright: "Một khởi đầu mới đầy rộng mở, niềm tin ngây thơ vào hành trình phía trước. Hãy can đảm bước đi.",
        reversed: "Sự liều lĩnh, vô lo vô nghĩ dẫn đến quyết định bốc đồng. Bạn cần nhìn lại trước khi nhảy.",
        image: "https://i.pinimg.com/564x/6a/02/76/6a0276a7d057161b9a897ff7bfa76843.jpg"
    },
    {
        name: "The Magician (Pháp Sư)",
        upright: "Bạn đang sở hữu đầy đủ nguồn lực, tài năng và sự tập trung để biến mong muốn thành hiện thực.",
        reversed: "Tài năng bị lãng phí, có sự thao túng hoặc ảo tưởng sức mạnh. Đừng lừa dối chính mình.",
        image: "https://i.pinimg.com/564x/44/22/e4/4422e47209cb115e5fa775cf4f4b1625.jpg"
    },
    {
        name: "The High Priestess (Nữ Tư Tế)",
        upright: "Trực giác mạnh mẽ, sự bí ẩn và tri thức nội tại. Hãy lắng nghe tiếng nói bên trong bạn.",
        reversed: "Bạn đang phớt lờ trực giác, chỉ nhìn vào bề nổi hoặc có những bí mật tiêu cực sắp bị lộ.",
        image: "https://i.pinimg.com/564x/bf/52/bd/bf52bd800f1359c11f71dfb638977bb1.jpg"
    },
    {
        name: "The Lovers (Tình Nhân)",
        upright: "Sự hòa hợp, kết nối tâm giao sâu sắc và những lựa chọn quan trọng dựa trên tiếng gọi con tim.",
        reversed: "Mất cân bằng trong mối quan hệ, bất đồng quan điểm hoặc đang né tránh đưa ra lựa chọn.",
        image: "https://i.pinimg.com/564x/6c/42/fa/6c42fa521f3ef4d100085a850ca4391e.jpg"
    },
    {
        name: "The Sun (Mặt Trời)",
        upright: "Niềm vui, sự thành công rực rỡ, năng lượng tích cực và sự rõ ràng trong mọi khía cạnh cuộc sống.",
        reversed: "Sự u ám tạm thời, thiếu thấu suốt hoặc bạn đang quá kiêu ngạo vì thành công nhỏ.",
        image: "https://i.pinimg.com/564x/48/43/0a/48430a6e35fe85ff3d922a9fbb000a68.jpg"
    }
];

let tarotDeck = backupDeck;
try {
    const dynamicDeck = require('./tarotDeck');
    if (Array.isArray(dynamicDeck) && dynamicDeck.length > 0) {
        tarotDeck = dynamicDeck;
    }
} catch (e) {
    console.log("⚠️ Sử dụng bộ bài tích hợp sẵn.");
}

const TAROT_PRICES = { '1_card': 500, '3_cards': 1200, 'daily': 300, 'love': 1000 };
const DEFAULT_TAROT_IMAGE = 'https://i.pinimg.com/564x/df/7e/3d/df7e3d1be5494d930292bfcb78cc4306.jpg';
const MAIN_HALL_IMAGE = 'https://i.pinimg.com/736x/21/df/b6/21dfb689df96791e878cc60fa1107f9c.jpg';

function getMoneyData() {
    try { if (!fs.existsSync(moneyPath)) return {}; const data = fs.readFileSync(moneyPath, 'utf8'); return data ? JSON.parse(data) : {}; } 
    catch (error) { return {}; }
}
function saveMoneyData(data) {
    try { fs.writeFileSync(moneyPath, JSON.stringify(data, null, 2), 'utf8'); } catch (error) {}
}

function drawRandomCard(type) {
    const card = tarotDeck[Math.floor(Math.random() * tarotDeck.length)];
    const isReversed = Math.random() < 0.5;
    const direction = isReversed ? "🔴 CHIỀU NGƯỢC (Reversed)" : "🟢 CHIỀU XUÔI (Upright)";
    
    let tailoredExplanation = isReversed ? card.reversed : card.upright;
    if (typeof tailoredExplanation === 'object' && tailoredExplanation !== null) {
        if (type === 'love' && tailoredExplanation.love) tailoredExplanation = tailoredExplanation.love;
        else tailoredExplanation = tailoredExplanation.general || tailoredExplanation.work || "Không có luận giải.";
    }

    return {
        name: card.name,
        direction: direction,
        explanation: tailoredExplanation || "Thông điệp đang ẩn giấu...",
        color: isReversed ? '#C0392B' : '#27AE60',
        image: card.image || DEFAULT_TAROT_IMAGE
    };
}

async function handleTarotCommand(message) {
    if (message.channel.id !== process.env.TAROT_CHANNEL_ID) {
        return message.reply(`🔮 Tính năng bói bài Tarot chỉ hoạt động tại kênh dành riêng: <#${process.env.TAROT_CHANNEL_ID}>!`);
    }

    const mainEmbed = new EmbedBuilder()
        .setColor('#1A0B2E')
        .setTitle('🔮 ĐẠI SẢNH TAROT - KẾT NỐI TÂM THỨC 🔮')
        .setDescription(
            '**Hãy thả lỏng cơ thể, nhắm mắt và hít thở sâu 3 nhịp...**\n\n' +
            '*Lắng nghe trực giác và chọn loại quẻ bạn muốn thỉnh từ Vũ Trụ.*\n\n' +
            `🪙 **Năng lượng tiêu hao:**\n` +
            `• 🃏 Rút 1 Lá (Tổng quan): \`${TAROT_PRICES['1_card']} xu\`\n` +
            `• ⏳ Trải Bài 3 Lá (Dòng thời gian): \`${TAROT_PRICES['3_cards']} xu\`\n` +
            `• ☀️ Năng Lượng Ngày Mới: \`${TAROT_PRICES['daily']} xu\`\n` +
            `• ❤️ Trải Bài Tình Cảm: \`${TAROT_PRICES['love']} xu\``
        )
        .setImage(MAIN_HALL_IMAGE)
        .setFooter({ text: 'Hãy bấm loại quẻ bên dưới để bắt đầu...' });

    // Đồng bộ tất cả ID bắt đầu bằng tarot_new_
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tarot_new_init_1_card').setLabel(`🃏 Thỉnh 1 Lá (${TAROT_PRICES['1_card']} xu)`).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tarot_new_init_3_cards').setLabel(`⏳ Trải 3 Lá (${TAROT_PRICES['3_cards']} xu)`).setStyle(ButtonStyle.Success)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tarot_new_init_daily').setLabel(`☀️ Ngày Mới (${TAROT_PRICES['daily']} xu)`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tarot_new_init_love').setLabel(`❤️ Tình Cảm (${TAROT_PRICES['love']} xu)`).setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({ embeds: [mainEmbed], components: [row1, row2] });
}

async function handleTarotInteraction(interaction) {
    if (!interaction.isButton()) return false; 
    const customId = interaction.customId;
    const userId = interaction.user.id;

    // Chỉ nhận tương tác thuộc nhóm tarot_new_
    if (!customId.startsWith('tarot_new_')) return false;

    // LUỒNG 1: CLICK CHỌN QUẺ BAN ĐẦU
    if (customId.startsWith('tarot_new_init_')) {
        const type = customId.replace('tarot_new_init_', '');
        const price = TAROT_PRICES[type];
        const moneyData = getMoneyData();
        const currentBalance = moneyData[userId]?.money || 0; 
        
        if (currentBalance < price) {
            await interaction.reply({ 
                content: `❌ **Không đủ xu!** Bạn cần **${price} xu** để thỉnh quẻ này (Hiện tại bạn có: **${currentBalance} xu**).`,
                flags: [MessageFlags.Ephemeral]
            }).catch(() => {});
            return true;
        }

        // Lưu thông tin phiên đăng ký
        tarotSessions.set(userId, { type, timestamp: Date.now() });

        const shuffleEmbed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('🧼 XÁO TRỘN NĂNG LƯỢNG BÀI TAROT')
            .setDescription(`*Vũ trụ đã tiếp nhận kết nối tâm thức của bạn.*\n\nHãy click vào nút bên dưới để tiến hành xáo trộn các lá bài:`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`tarot_new_shuffle_${type}`).setLabel('🧼 Nhấn Để Xáo Bài').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [shuffleEmbed], components: [row], flags: [MessageFlags.Ephemeral] }).catch(() => {});
        return true; 
    }

    // LUỒNG 2: XỬ LÝ NÚT BẤM XÁO BÀI
    if (customId.startsWith('tarot_new_shuffle_')) {
        const type = customId.replace('tarot_new_shuffle_', '');
        const session = tarotSessions.get(userId);
        
        if (!session || session.type !== type) {
            await interaction.reply({ content: '❌ Phiên bói bài đã hết hạn, vui lòng dùng lại lệnh `!tarot`!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
            return true;
        }

        const cutEmbed = new EmbedBuilder()
            .setColor('#6C5CE7')
            .setTitle('🃏 BƯỚC CUỐI: KINH BÀI & CHỌN TỤ BÀI')
            .setDescription(`*Bộ bài đã được hòa quyện cùng năng lượng của bạn.*\n\nHãy lắng nghe trực giác và chọn 1 tụ bài may mắn bên dưới để nhận lời giải:`)
            .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z0ZndpbnY0M2p0cXg0bWszY29wZzVwcmh3OHg2bW9icWZ4YndzdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o72EX5QZ9N9d51dqo/giphy.gif');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`tarot_new_draw_${type}_1`).setLabel('🔮 Tụ Số 1').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`tarot_new_draw_${type}_2`).setLabel('🔮 Tụ Số 2').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`tarot_new_draw_${type}_3`).setLabel('🔮 Tụ Số 3').setStyle(ButtonStyle.Primary)
        );

        await interaction.update({ embeds: [cutEmbed], components: [row] }).catch(() => {});
        return true;
    }

    // LUỒNG 3: RÚT BÀI VÀ TRẢ KẾT QUẢ QUẺ BÓI
    if (customId.startsWith('tarot_new_draw_')) {
        const parts = customId.replace('tarot_new_draw_', '').split('_');
        // Đối với '1_card' hoặc '3_cards', parts sẽ là ['1', 'card', '1'] hoặc ['3', 'cards', '2']
        // Đối với 'daily' hoặc 'love', parts sẽ là ['daily', '1']
        
        let type = parts[0];
        let tuNumber = parts[1];
        
        if (parts[1] === 'card' || parts[1] === 'cards') {
            type = `${parts[0]}_${parts[1]}`;
            tuNumber = parts[2];
        }

        const price = TAROT_PRICES[type];
        const session = tarotSessions.get(userId);

        if (!session || session.type !== type) {
            await interaction.reply({ content: `❌ Không tìm thấy thông tin phiên bói của bạn. Vui lòng thử lại bằng lệnh \`!tarot\`.`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            return true;
        }

        const moneyData = getMoneyData();
        if (!moneyData[userId] || moneyData[userId].money < price) {
            await interaction.reply({ content: `❌ Tài khoản của bạn không đủ số dư để thực hiện giao dịch!`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            return true;
        }
        
        moneyData[userId].money -= price;
        saveMoneyData(moneyData);

        const remainingMsg = `*(Đã khấu trừ ${price} xu, số dư còn lại: ${moneyData[userId].money} xu)*`;
        tarotSessions.delete(userId);

        let resultEmbed;
        if (type === '1_card' || type === 'daily') {
            const card = drawRandomCard(type); 
            resultEmbed = new EmbedBuilder()
                .setColor(card.color)
                .setTitle(`🔮 QUẺ BÀI TAROT KHẢI HUYỀN (TỤ SỐ ${tuNumber})`)
                .setDescription(`🃏 **Lá bài định mệnh:** **${card.name}** (${card.direction})\n\n**📜 THÔNG ĐIỆP VŨ TRỤ:**\n${card.explanation}\n\n${remainingMsg}`)
                .setImage(card.image)
                .setFooter({ text: `Được thỉnh bởi ${interaction.user.username}` });
        }
        else if (type === '3_cards') {
            const c1 = drawRandomCard(type);
            let c2 = drawRandomCard(type); while (c2.name === c1.name) c2 = drawRandomCard(type);
            let c3 = drawRandomCard(type); while (c3.name === c1.name || c3.name === c2.name) c3 = drawRandomCard(type);

            resultEmbed = new EmbedBuilder()
                .setColor('#2980B9')
                .setTitle(`⏳ TRẢI BÀI DÒNG THỜI GIAN KHÔNG GIAN (TỤ SỐ ${tuNumber})`)
                .setDescription(`${remainingMsg}`)
                .addFields(
                    { name: `⏮️ Quá khứ: ${c1.name}`, value: c1.explanation },
                    { name: `🔄 Hiện tại: ${c2.name}`, value: c2.explanation },
                    { name: `⏭️ Tương lai: ${c3.name}`, value: c3.explanation }
                ).setThumbnail(c3.image);
        }
        else if (type === 'love') {
            const c1 = drawRandomCard(type); 
            let c2 = drawRandomCard(type); while (c2.name === c1.name) c2 = drawRandomCard(type);

            resultEmbed = new EmbedBuilder()
                .setColor('#E91E63')
                .setTitle(`❤️ LUẬN GIẢI TÌNH DUYÊN HOÀNG ĐẠO (TỤ SỐ ${tuNumber})`)
                .setDescription(`${remainingMsg}`)
                .addFields(
                    { name: `👤 Năng lượng từ phía bạn: ${c1.name}`, value: c1.explanation },
                    { name: `💞 Năng lượng đối phương & Liên kết chung: ${c2.name}`, value: c2.explanation }
                ).setThumbnail(c1.image);
        }

        await interaction.update({ embeds: [resultEmbed], components: [] }).catch(() => {});
        return true;
    }
    return false;
}

module.exports = { handleTarotCommand, handleTarotInteraction };