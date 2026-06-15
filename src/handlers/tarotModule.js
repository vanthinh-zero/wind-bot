const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const tarotDeck = require('./tarotDeck');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Đường dẫn tới file money.json của bạn
const moneyPath = path.join(__dirname, '../../money.json'); 

// BẢNG GIÁ DỊCH VỤ TAROT (Trừ vào balance)
const TAROT_PRICES = {
    'tarot_1_card': 500,     // Rút 1 lá: 500 xu
    'tarot_3_cards': 1200,   // Trải bài 3 lá: 1200 xu
    'tarot_daily': 300,      // Năng lượng ngày mới: 300 xu
    'tarot_love': 1000       // Trải bài tình cảm: 1000 xu
};

// Hàm đọc dữ liệu từ money.json
function getMoneyData() {
    try {
        if (!fs.existsSync(moneyPath)) return {};
        const data = fs.readFileSync(moneyPath, 'utf8');
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error("Lỗi đọc file money.json:", error);
        return {};
    }
}

// Hàm ghi dữ liệu vào money.json
function saveMoneyData(data) {
    try {
        fs.writeFileSync(moneyPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error("Lỗi ghi file money.json:", error);
    }
}

// Hàm bốc bài ngẫu nhiên
function drawRandomCard() {
    const card = tarotDeck[Math.floor(Math.random() * tarotDeck.length)];
    const isReversed = Math.random() < 0.5;
    return {
        name: card.name,
        direction: isReversed ? "🔴 CHIỀU NGƯỢC (Reversed)" : "🟢 CHIỀU XUÔI (Upright)",
        explanation: isReversed ? card.reversed : card.upright,
        color: isReversed ? '#C0392B' : '#27AE60',
        image: card.image
    };
}

// =========================================================
// 1. HÀM KHỞI ĐỘNG SẢNH TAROT (!tarot)
// =========================================================
async function handleTarotCommand(message) {
    if (message.channel.id !== process.env.TAROT_CHANNEL_ID) {
        return message.reply(`🔮 Tính năng bói bài Tarot chỉ hoạt động tại kênh dành riêng: <#${process.env.TAROT_CHANNEL_ID}>!`);
    }

    const mainEmbed = new EmbedBuilder()
        .setColor('#5D3FD3')
        .setTitle('🔮 ĐẠI SẢNH TAROT - THẤU THỊ TƯƠNG LAI 🔮')
        .setDescription(
            '**Kết nối tâm thức, giải mã định mệnh.**\n\n' +
            `*Chào mừng đạo hữu. Để thỉnh giải các thông điệp từ vũ trụ, các lá bài yêu cầu tiêu hao một lượng năng lượng nhằm đảm bảo quy luật cân bằng trao đổi.*\n\n` +
            `🪙 **Phí bói bài (Trừ vào số dư Hệ Thống):**\n` +
            `• 🃏 Rút 1 Lá: \`${TAROT_PRICES.tarot_1_card} xu\`\n` +
            `• ⏳ Trải Bài 3 Lá: \`${TAROT_PRICES.tarot_3_cards} xu\`\n` +
            `• ☀️ Năng Lượng Ngày: \`${TAROT_PRICES.tarot_daily} xu\`\n` +
            `• ❤️ Trải Tình Cảm: \`${TAROT_PRICES.tarot_love} xu\`\n` +
            `• 📖 Hướng Dẫn: \`Miễn phí\``
        )
        .setImage('https://media.discordapp.net/attachments/1508103127956455536/1516067374401585313/c1faffab9bea11f14b9dc6ca25484640.png?ex=6a314b45&is=6a2ff9c5&hm=b76888c91f122e137d762794bc7833382df1fcbc572503fd4980c3cce10f4b58&=&format=webp&quality=lossless') 
        .setFooter({ text: 'Tập trung tâm trí và chuẩn bị đủ số xu trong ví trước khi bốc bài...' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tarot_1_card').setLabel(`🃏 Rút 1 Lá (${TAROT_PRICES.tarot_1_card} xu)`).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tarot_3_cards').setLabel(`⏳ Trải Bài 3 Lá (${TAROT_PRICES.tarot_3_cards} xu)`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tarot_daily').setLabel(`☀️ Ngày Mới (${TAROT_PRICES.tarot_daily} xu)`).setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tarot_love').setLabel(`❤️ Tình Cảm (${TAROT_PRICES.tarot_love} xu)`).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('tarot_guide').setLabel('📖 Hướng Dẫn (Free)').setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [mainEmbed], components: [row1, row2] });
}

// =========================================================
// 2. HÀM XỬ LÝ SỰ KIỆN NÚT BẤM (ĐỒNG BỘ BALANCE)
// =========================================================
async function handleTarotInteraction(interaction) {
    if (!interaction.isButton()) return;
    
    if (interaction.channel.id !== process.env.TAROT_CHANNEL_ID) {
        return interaction.reply({ content: `🔮 Hệ thống Tarot chỉ hoạt động tại kênh quy định!`, flags: [MessageFlags.Ephemeral] });
    }

    const customId = interaction.customId;
    const userId = interaction.user.id;

    // Hướng dẫn miễn phí
    if (customId === 'tarot_guide') {
        const guideEmbed = new EmbedBuilder()
            .setColor('#95A5A6')
            .setTitle('📖 SỔ TAY HƯỚNG DẪN ĐỌC BÀI TAROT')
            .setDescription(`Chào đạo hữu, Tarot gồm **78 lá bài** được chia làm 2 bộ chính:\n\n**1. Bộ Ẩn Chính (Major Arcana - 22 Lá):** Đại diện bước ngoặt lớn.\n**2. Bộ Ẩn Phụ (Minor Arcana - 56 Lá):** Gồm Gậy (Đam mê), Cúp (Tình cảm), Kiếm (Lý trí), Tiền (Vật chất).`);
        return await interaction.reply({ embeds: [guideEmbed], flags: [MessageFlags.Ephemeral] });
    }

    const price = TAROT_PRICES[customId];
    if (price === undefined) return; 

    // Đọc file và kiểm tra ví dựa trên thuộc tính "balance" giống Taixiu/Nuoi pet
    const moneyData = getMoneyData();
    
    // Nếu chưa có tài khoản, tự động tạo mới với balance = 0
    if (!moneyData[userId]) {
        moneyData[userId] = {
            balance: 0,
            lastDaily: null
        };
    }

    const currentBalance = moneyData[userId].balance;

    if (currentBalance < price) {
        return await interaction.reply({
            content: `❌ **Không đủ tiền xu!** Số dư hiện tại của bạn là **${currentBalance} xu**, thỉnh quẻ này cần tới **${price} xu**. Hãy đi làm việc hoặc chơi Tai xiu để kiếm thêm nhé!`,
            flags: [MessageFlags.Ephemeral]
        });
    }

    // Trừ xu vào thuộc tính balance chung của hệ thống
    moneyData[userId].balance = currentBalance - price;
    saveMoneyData(moneyData);

    const remainingMoneyMsg = `*(Hệ thống đã khấu trừ ${price} xu, số dư còn lại của bạn: ${moneyData[userId].balance} xu)*`;

    // --- XỬ LÝ PHẢN HỒI QUẺ ---
    if (customId === 'tarot_1_card') {
        const card = drawRandomCard();
        const resultEmbed = new EmbedBuilder()
            .setColor(card.color)
            .setTitle(`🔮 Bài Tarot Bạn Rút: ${card.name}`)
            .setDescription(`**Trạng thái:** ${card.direction}\n\n**📜 Luận giải chi tiết từ Vũ Trụ:**\n${card.explanation}\n\n${remainingMoneyMsg}`)
            .setImage(card.image)
            .setTimestamp()
            .setFooter({ text: `Được thỉnh bởi ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [resultEmbed] });
    }

    else if (customId === 'tarot_3_cards') {
        const card1 = drawRandomCard();
        let card2 = drawRandomCard(); while (card2.name === card1.name) card2 = drawRandomCard();
        let card3 = drawRandomCard(); while (card3.name === card1.name || card3.name === card2.name) card3 = drawRandomCard();

        const resultEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(`⏳ Trải Bài 3 Lá (Dòng Thời Gian Tâm Thức)`)
            .setDescription(`Chào **${interaction.user.username}**, đây là vận trình chặng đường của bạn:\n${remainingMoneyMsg}`)
            .addFields(
                { name: `⏮️ Quá Khứ: ${card1.name}`, value: `${card1.explanation}\n---` },
                { name: `🔄 Hiện Tại: ${card2.name}`, value: `${card2.explanation}\n---` },
                { name: `⏭️ Tương Lai: ${card3.name}`, value: `${card3.explanation}` }
            )
            .setThumbnail(card3.image)
            .setTimestamp()
            .setFooter({ text: `Trải bài dòng thời gian của ${interaction.user.username}` });

        await interaction.reply({ embeds: [resultEmbed] });
    }

    else if (customId === 'tarot_daily') {
        const card = drawRandomCard();
        const resultEmbed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle(`☀️ Dự Báo Luận Giải Ngày Mới`)
            .setDescription(`Năng lượng hôm nay của **${interaction.user.username}**:\n\n**Lá bài:** ${card.name} (${card.direction})\n\n**📜 Chi tiết vận trình:**\n${card.explanation}\n\n${remainingMoneyMsg}`)
            .setImage(card.image)
            .setTimestamp()
            .setFooter({ text: `Chúc ngày mới hanh thông!` });

        await interaction.reply({ embeds: [resultEmbed] });
    }

    else if (customId === 'tarot_love') {
        const yourCard = drawRandomCard();
        let theirCard = drawRandomCard(); while (theirCard.name === yourCard.name) theirCard = drawRandomCard();

        const resultEmbed = new EmbedBuilder()
            .setColor('#E91E63')
            .setTitle(`❤️ Luận Giải Trải Bài Tình Cảm & Mối Quan Hệ`)
            .setDescription(`Tần số kết nối cảm xúc của **${interaction.user.username}**:\n${remainingMoneyMsg}`)
            .addFields(
                { name: `👤 Bản thân bạn: ${yourCard.name}`, value: `${yourCard.explanation}\n---` },
                { name: `💞 Đối phương / Chặng đường chung: ${theirCard.name}`, value: `${theirCard.explanation}` }
            )
            .setThumbnail(yourCard.image)
            .setTimestamp()
            .setFooter({ text: `Lắng nghe trực giác con tim` });

        await interaction.reply({ embeds: [resultEmbed] });
    }
}

// ĐỂ ĐẢM BẢO KHÔNG BỊ LỖI "is not a function", XUẤT CẢ HAI HÀM CHÍNH XÁC Ở ĐÂY:
module.exports = { handleTarotCommand, handleTarotInteraction };