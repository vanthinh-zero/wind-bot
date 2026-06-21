// --- IMPORT MODULES CẦN THIẾT ---
const path = require('path');
const fs = require('fs');
const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

// --- ĐỌC FILE CẤU HÌNH ĐỀ THI VỚI FALLBACK ---
let configPath1 = path.resolve(process.cwd(), 'config/configDeThi.json');
let configPath2 = path.resolve(process.cwd(), 'src/config/configDeThi.json');
let finalPath = fs.existsSync(configPath1) ? configPath1 : configPath2;

console.log('Đang đọc file cấu hình đề thi tại:', finalPath);
const MON_HOC = require(finalPath);

// --- HÀM XỬ LÝ LỆNH ĐỀ THI ---
async function handleDeThiCommand(message) {
    const allowedChannelId = process.env.THITHU_CHANNEL_ID;
    if (message.channelId !== allowedChannelId) {
        return message.reply({ content: `❌ Lệnh này chỉ được sử dụng tại channel <#${allowedChannelId}>!` });
    }

    const args = message.content.trim().split(/ +/);
    const monChon = args[1]?.toLowerCase();
    const soDe = parseInt(args[2]) || 1;

    if (!monChon || !MON_HOC[monChon]) {
        return message.reply({ content: '❌ Vui lòng nhập đúng cú pháp. Ví dụ: `!dethi toan 2`.' });
    }

    const danhSachDe = MON_HOC[monChon];
    const configMon = Array.isArray(danhSachDe) ? danhSachDe[soDe - 1] : danhSachDe;

    if (!configMon) {
        return message.reply({ content: `❌ Không tìm thấy đề số ${soDe} cho **${monChon.toUpperCase()}**!` });
    }

    const filePath = path.resolve(process.cwd(), configMon.file);
    if (!fs.existsSync(filePath)) {
        return message.reply({ content: `❌ File PDF của **${configMon.name}** chưa được cập nhật!\nĐường dẫn kiểm tra: \`${filePath}\`` });
    }

    const embed = new EmbedBuilder()
        .setTitle(`📝 ${configMon.name}`)
        .setDescription(`File PDF đính kèm bên dưới.\n\nSau khi làm xong, bấm nút **Nộp Bài Toàn Diện**.`)
        .setColor('#bf55ec');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`submit_full_${monChon}_${soDe}`)
            .setLabel('📝 Nộp Bài Toàn Diện')
            .setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({
        embeds: [embed],
        files: [filePath],
        components: [row]
    });
}

// --- HÀM XỬ LÝ TƯƠNG TÁC (NÚT & MODAL) ---
async function handleDeThiInteraction(interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    if (interaction.isButton() && interaction.customId.startsWith('submit_full_')) {
        const [_, monChon, soDe] = interaction.customId.split('_');
        const configMon = Array.isArray(MON_HOC[monChon]) ? MON_HOC[monChon][parseInt(soDe) - 1] : MON_HOC[monChon];

        const modal = new ModalBuilder()
            .setCustomId(`modal_full_${monChon}_${soDe}`)
            .setTitle(`Bảng Điền Đáp Án: ${configMon.name}`);

        const p1Input = new TextInputBuilder()
            .setCustomId('ans_p1')
            .setLabel('PHẦN I: Trắc nghiệm')
            .setPlaceholder('Nhập 12 ký tự A/B/C/D')
            .setStyle(TextInputStyle.Short)
            .setMinLength(12)
            .setMaxLength(12)
            .setRequired(true);

        const p2Input = new TextInputBuilder()
            .setCustomId('ans_p2')
            .setLabel('PHẦN II: Đúng/Sai')
            .setPlaceholder('16 ký tự T/F')
            .setStyle(TextInputStyle.Short)
            .setMinLength(16)
            .setMaxLength(16)
            .setRequired(true);

        const p3Input = new TextInputBuilder()
            .setCustomId('ans_p3')
            .setLabel('PHẦN III: Điền số')
            .setPlaceholder('Ví dụ: 7.35,1152,...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(p1Input),
            new ActionRowBuilder().addComponents(p2Input),
            new ActionRowBuilder().addComponents(p3Input)
        );

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_full_')) {
        const [_, monChon, soDe] = interaction.customId.split('_');
        const configMon = Array.isArray(MON_HOC[monChon]) ? MON_HOC[monChon][parseInt(soDe) - 1] : MON_HOC[monChon];
        const keyP1 = configMon.dapAn.P1;
        const keyP2 = configMon.dapAn.P2;
        const keyP3 = configMon.dapAn.P3;

        const userP1 = interaction.fields.getTextInputValue('ans_p1').toUpperCase().trim();
        const userP2 = interaction.fields.getTextInputValue('ans_p2').toUpperCase().trim();
        const userP3 = interaction.fields.getTextInputValue('ans_p3').trim().split(/[,;]/).map(x => x.trim());

        let diemP1 = 0, diemP2 = 0, diemP3 = 0;

        for (let i = 0; i < keyP1.length; i++) if (userP1[i] === keyP1[i]) diemP1 += 0.25;

        const bieuDiemP2 = { 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0 };
        for (let cau = 0; cau < 4; cau++) {
            let soY_Dung = 0;
            for (let y = 0; y < 4; y++) {
                let index = cau * 4 + y;
                if (userP2[index] === keyP2[index]) soY_Dung++;
            }
            if (soY_Dung > 0) diemP2 += bieuDiemP2[soY_Dung] || 0;
        }

        for (let i = 0; i < keyP3.length; i++) if (userP3[i] === keyP3[i]) diemP3 += 0.5;

        const tongDiem = (diemP1 + diemP2 + diemP3).toFixed(2);

        const resultEmbed = new EmbedBuilder()
            .setTitle(`📊 KẾT QUẢ - ${configMon.name}`)
            .setColor('#26a65b')
            .setDescription(`Thí sinh ${interaction.user} đã hoàn thành bài thi!`)
            .addFields(
                { name: '☘️ Tổng điểm', value: `💯 **${tongDiem} / 10.00**`, inline: false },
                { name: 'Phần I', value: `${diemP1.toFixed(2)} đ`, inline: true },
                { name: 'Phần II', value: `${diemP2.toFixed(2)} đ`, inline: true },
                { name: 'Phần III', value: `${diemP3.toFixed(2)} đ`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Rèn luyện mỗi ngày để bứt phá bước vào cổng trường Đại học!' });

        await interaction.reply({ embeds: [resultEmbed], ephemeral: true });
    }
}

module.exports = { handleDeThiCommand, handleDeThiInteraction };
