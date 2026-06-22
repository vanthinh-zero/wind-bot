const path = require('path');
const fs = require('fs');
const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

// --- TỰ ĐỘNG ĐỊNH VỊ FILE CẤU HÌNH ĐỀ THI (HOÀN HẢO CHO LOCAL & RENDER) ---
// Cách 1: Thư mục config nằm ngang hàng với src (Thường thấy trên cấu trúc Deploy Render)
let configPath1 = path.resolve(__dirname, '../../config/configDeThi.json'); 

// Cách 2: Thư mục config nằm bên trong src/config (Thường thấy khi viết code Local)
let configPath2 = path.resolve(__dirname, '../config/configDeThi.json'); 

// Cách 3: Đi từ thư mục gốc chạy dự án
let configPath3 = path.resolve(process.cwd(), 'config/configDeThi.json');
let configPath4 = path.resolve(process.cwd(), 'src/config/configDeThi.json');

// Lựa chọn đường dẫn chính xác dựa trên file thực tế tồn tại
let finalPath = "";
if (fs.existsSync(configPath1)) {
    finalPath = configPath1;
} else if (fs.existsSync(configPath2)) {
    finalPath = configPath2;
} else if (fs.existsSync(configPath3)) {
    finalPath = configPath3;
} else {
    finalPath = configPath4;
}

console.log('🌐 [Hệ Thống] Đang đọc file cấu hình đề thi tại:', finalPath);

let MON_HOC;
try {
    MON_HOC = require(finalPath);
} catch (error) {
    console.error("❌ [Lỗi Hệ Thống] Không thể load file configDeThi.json! Kiểm tra lại vị trí file hoặc cú pháp JSON.");
    MON_HOC = {}; 
}

// --- HÀM XỬ LÝ LỆNH ĐỀ THI VÀ GỬI FILE ---
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

    // Định vị file PDF (Hỗ trợ tìm kiếm từ thư mục gốc chạy dự án)
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

// --- HÀM XỬ LÝ TƯƠNG TÁC (BẤM NÚT & NỘP BÀI QUA MODAL) ---
async function handleDeThiInteraction(interaction) {
    try {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        // --- 1. Khi người dùng bấm nút "Nộp Bài Toàn Diện" ---
        if (interaction.isButton() && interaction.customId.startsWith('submit_full_')) {
            const [_, __, monChon, soDe] = interaction.customId.split('_');
            const configMon = Array.isArray(MON_HOC[monChon]) ? MON_HOC[monChon][parseInt(soDe) - 1] : MON_HOC[monChon];

            if (!configMon) {
                await interaction.reply({ content: `⚠️ Không tìm thấy cấu hình cho môn ${monChon.toUpperCase()} đề số ${soDe}.`, ephemeral: true });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId(`modal_full_${monChon}_${soDe}`)
                .setTitle(`Bảng Điền Đáp Án: ${configMon.name}`);

            const p1Input = new TextInputBuilder()
                .setCustomId('ans_p1')
                .setLabel('PHẦN I: Trắc nghiệm')
                .setPlaceholder('Nhập 12 ký tự viết liền. Ví dụ: ABCDABCDABCD')
                .setStyle(TextInputStyle.Short)
                .setMinLength(12)
                .setMaxLength(12)
                .setRequired(true);

            const p2Input = new TextInputBuilder()
                .setCustomId('ans_p2')
                .setLabel('PHẦN II: Đúng/Sai')
                .setPlaceholder('16 ký tự T (Đúng) hoặc F (Sai). Ví dụ: TTFFTTFF...')
                .setStyle(TextInputStyle.Short)
                .setMinLength(16)
                .setMaxLength(16)
                .setRequired(true);

            const p3Input = new TextInputBuilder()
                .setCustomId('ans_p3')
                .setLabel('PHẦN III: Điền số')
                .setPlaceholder('Mỗi câu cách nhau bằng dấu phẩy. Ví dụ: 7.35,1152,-5')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(p1Input),
                new ActionRowBuilder().addComponents(p2Input),
                new ActionRowBuilder().addComponents(p3Input)
            );

            await interaction.showModal(modal);
        }

        // --- 2. Khi người dùng bấm gửi Form Modal (Nộp bài) ---
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_full_')) {
            // Hoãn phản hồi (Defer) để tránh lỗi quá hạn 3 giây nếu mạng trên Render bị nghẽn
            await interaction.deferReply({ ephemeral: true });

            const [_, __, monChon, soDe] = interaction.customId.split('_');
            const configMon = Array.isArray(MON_HOC[monChon]) ? MON_HOC[monChon][parseInt(soDe) - 1] : MON_HOC[monChon];

            if (!configMon) {
                await interaction.editReply({ content: `⚠️ Không tìm thấy cấu hình đáp án cho môn ${monChon.toUpperCase()} đề số ${soDe}.` });
                return;
            }

            const keyP1 = configMon.dapAn?.P1 || "";
            const keyP2 = configMon.dapAn?.P2 || "";
            const keyP3 = configMon.dapAn?.P3 || [];

            const userP1 = interaction.fields.getTextInputValue('ans_p1').toUpperCase().trim();
            const userP2 = interaction.fields.getTextInputValue('ans_p2').toUpperCase().trim();
            const userP3 = interaction.fields.getTextInputValue('ans_p3').trim().split(/[,;]/).map(x => x.trim());

            let diemP1 = 0, diemP2 = 0, diemP3 = 0;

            // Chấm Phần I (Trắc nghiệm: 0.25đ / câu)
            for (let i = 0; i < keyP1.length; i++) {
                if (userP1[i] === keyP1[i]) diemP1 += 0.25;
            }

            // Chấm Phần II (Đúng / Sai: Thang điểm lũy tiến bộ GD)
            const bieuDiemP2 = { 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0 };
            for (let cau = 0; cau < 4; cau++) {
                let soY_Dung = 0;
                for (let y = 0; y < 4; y++) {
                    let index = cau * 4 + y;
                    if (userP2[index] && userP2[index] === keyP2[index]) soY_Dung++;
                }
                if (soY_Dung > 0) diemP2 += bieuDiemP2[soY_Dung] || 0;
            }

            // Chấm Phần III (Điền số ngắn: 0.5đ / câu - Bảo vệ chống Undefined sập bot)
            for (let i = 0; i < keyP3.length; i++) {
                if (userP3[i] && userP3[i] === String(keyP3[i])) diemP3 += 0.5;
            }

            const tongDiem = (diemP1 + diemP2 + diemP3).toFixed(2);

            // Gửi Embed kết quả bảo mật riêng tư (Ephemeral) cho thí sinh
            const resultEmbed = new EmbedBuilder()
                .setTitle(`📊 KẾT QUẢ KIỂM TRA - ${configMon.name}`)
                .setColor('#26a65b')
                .setDescription(`Chúc mừng thí sinh ${interaction.user} đã hoàn thành bài thi tự động thành công!`)
                .addFields(
                    { name: '☘️ Tổng điểm đạt được', value: `💯 **${tongDiem} / 10.00** điểm`, inline: false },
                    { name: 'Phần I (Trắc nghiệm)', value: `\`${diemP1.toFixed(2)}đ\``, inline: true },
                    { name: 'Phần II (Đúng/Sai)', value: `\`${diemP2.toFixed(2)}đ\``, inline: true },
                    { name: 'Phần III (Điền số)', value: `\`${diemP3.toFixed(2)}đ\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'ĐÀN BÒ BIẾT BAY - Rèn luyện mỗi ngày để bứt phá bước vào cổng trường Đại học!' });

            await interaction.editReply({ embeds: [resultEmbed] });
        }
    } catch (err) {
        console.error('❌ Lỗi nghiêm trọng khi xử lý tương tác đề thi:', err);
        if (interaction.isRepliable()) {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: '⚠️ Đã xảy ra lỗi hệ thống bất ngờ khi xử lý bài thi của bạn.' });
            } else {
                await interaction.reply({ content: '⚠️ Đã xảy ra lỗi hệ thống bất ngờ khi xử lý bài thi của bạn.', ephemeral: true });
            }
        }
    }
}

// --- XUẤT MODULE ĐỂ FILE CHÍNH (INDEX.JS) ĐỒNG BỘ SỬ DỤNG ---
module.exports = {
    handleDeThiCommand,
    handleDeThiInteraction
};