const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { CANH_GIOI_LIST, LINH_CAN_TYPES, DAN_DUOC_SHOP } = require('../config/tutien_config');
const { getTuSi, saveTuTienData } = require('../utils/database');

const TUTIEN_CHANNEL_ID = process.env.TUTIEN_CHANNEL_ID?.trim() || '';

async function sendTuTienMainMenu(message) {
    if (message.channel.id !== TUTIEN_CHANNEL_ID) {
        return message.reply(`❌ Hệ thống Tu Tiên chỉ mở tại kênh: <#${TUTIEN_CHANNEL_ID}>`);
    }

    const mainEmbed = new EmbedBuilder()
        .setTitle('☯️ TIÊN PHỦ TU CHÂN ĐẠI SẢNH ☯️')
        .setDescription('Nghịch thiên cải mệnh, vấn đỉnh trường sinh. Hãy chọn phương thức tu hành bên dưới:')
        .setColor('#2c3e50');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tt_profile').setLabel('📜 Khảo Sát Tu Vi').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tt_tuluyen').setLabel('🧘 Hấp Thu Linh Khí').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tt_lichluyen').setLabel('🧭 Xuất Ngoại Lịch Luyen').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tt_shop').setLabel('🏪 Đan Các').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tt_dotpha').setLabel('⚡ Đột Phá Thiên Kiếp').setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({ embeds: [mainEmbed], components: [row] });
}

async function handleTuTienInteraction(interaction) {
    if (!interaction.customId.startsWith('tt_')) return;

    const userId = interaction.user.id;
    const tuSi = getTuSi(userId, interaction.user.username);
    let hienTai = CANH_GIOI_LIST.find(cg => cg.id === tuSi.canhGioiId) || CANH_GIOI_LIST[0];
    const linhCanCauHinh = LINH_CAN_TYPES.find(lc => lc.name === tuSi.linhCan) || LINH_CAN_TYPES[3];

    const bayGio = Date.now();
    if (bayGio - (tuSi.lastPillTime || 0) > 24 * 60 * 60 * 1000) {
        tuSi.pillCountToday = 0;
    }

    // 📜 Profile
    if (interaction.customId === 'tt_profile') {
        const embed = new EmbedBuilder()
            .setTitle(`📜 ĐẠO THIỆP TU CHÂN: ${interaction.user.username}`)
            .setColor(linhCanCauHinh.color)
            .addFields(
                { name: '🧬 Thiên Phú Linh Căn', value: `**${tuSi.linhCan}** *(Tốc độ x${linhCanCauHinh.expMultiplier})*` },
                { name: '✨ Cảnh Giới Hiện Tại', value: `**${hienTai.name}**`, inline: true },
                { name: '🔮 Linh Khí Hải', value: `\`${tuSi.exp} / ${hienTai.maxExp} EXP\``, inline: true },
                { name: '💰 Linh Thạch', value: `\`${tuSi.linhThach || 0} Viên\``, inline: true },
                { name: '🔋 Trạng thái Lôi Kiếp', value: `🔮 Trúc Cơ Đan khí: ${tuSi.isTrucCoActive ? '🟢 Đã nạp' : '🔴 Chưa'}\n🛡️ Phá Ma Đan khí: ${tuSi.isPhaMaActive ? '🟢 Đã nạp' : '🔴 Chưa'}` },
                { name: '🎒 Túi Trữ Vật', value: `💊 Quy Nguyên: \`${tuSi.bag.quy_nguyen || 0}\` | 🧪 Tụ Khí: \`${tuSi.bag.tu_khi || 0}\` \n✨ Trúc Cơ Đan: \`${tuSi.bag.truc_co_dan || 0}\` | 🛡️ Phá Ma Đan: \`${tuSi.bag.pha_ma_dan || 0}\`` }
            );
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    // 🧘 Tu Luyện
    if (interaction.customId === 'tt_tuluyen') {
        const cd = 20000;
        if (bayGio - tuSi.lastTuLuyen < cd) return interaction.reply({ content: `⏳ Cần tịnh tâm thêm \`${Math.ceil((cd - (bayGio - tuSi.lastTuLuyen)) / 1000)}s\`.`, flags: [MessageFlags.Ephemeral] });

        let expGoc = Math.floor(Math.random() * 16) + 15;
        let expThucTe = Math.floor(expGoc * linhCanCauHinh.expMultiplier);
        tuSi.exp = Math.min(hienTai.maxExp, tuSi.exp + expThucTe);
        tuSi.lastTuLuyen = bayGio;
        await saveTuTienData();
        return interaction.reply({ content: `🧘 Hấp thu \`+${expThucTe}\] Linh Khí! (${tuSi.exp}/${hienTai.maxExp})`, flags: [MessageFlags.Ephemeral] });
    }

    // 🧭 Lịch Luyện
    if (interaction.customId === 'tt_lichluyen') {
        const cd = 60000;
        if (bayGio - tuSi.lastLichLuyen < cd) return interaction.reply({ content: `❌ Chờ hồi sức \`${Math.ceil((cd - (bayGio - tuSi.lastLichLuyen)) / 1000)}s\`.`, flags: [MessageFlags.Ephemeral] });
        
        tuSi.lastLichLuyen = bayGio;
        const xucXac = Math.floor(Math.random() * 100);
        let msg = "";

        if (xucXac < 45) {
            const tien = Math.floor(Math.random() * 41) + 20;
            tuSi.linhThach = (tuSi.linhThach || 0) + tien;
            msg = `🧭 Nhặt được túi trữ vật vô chủ! Nhận \`+${tien} Linh Thạch\`.`;
            if (Math.random() < 0.25) {
                tuSi.bag.quy_nguyen = (tuSi.bag.quy_nguyen || 0) + 1;
                msg += ` Thêm 1 viên **Quy Nguyên Đan**!`;
            }
        } else if (xucXac < 85) {
            const linhKhiMat = Math.floor(tuSi.exp * 0.1);
            tuSi.exp = Math.max(0, tuSi.exp - linhKhiMat);
            msg = `⚔️ Bị Yêu thú đánh trọng thương, hao tổn \`-${linhKhiMat} Linh Khí\`.`;
        } else {
            const tienMat = Math.floor((tuSi.linhThach || 0) * 0.2);
            tuSi.linhThach = Math.max(0, tuSi.linhThach - tienMat);
            msg = `🚨 Gặp ma đầu truy sát, tốn \`-${tienMat} Linh Thạch\` để độn thổ chạy trốn!`;
        }
        await saveTuTienData();
        return interaction.reply({ content: msg, flags: [MessageFlags.Ephemeral] });
    }

    // 🏪 Cửa Hàng Đan Các
    if (interaction.customId === 'tt_shop') {
        const embed = new EmbedBuilder()
            .setTitle('🏪 TIÊN PHỦ ĐAN CÁC')
            .setDescription(`Hôm nay đã cắn: \`${tuSi.pillCountToday || 0}/2\` viên tăng EXP.\n*Lưu ý: Sử dụng Trúc Cơ Đan/Phá Ma Đan TRƯỚC khi đột phá.*`)
            .setColor('#9b59b6');

        Object.entries(DAN_DUOC_SHOP).forEach(([key, val]) => {
            embed.addFields({ name: `${val.name} (💰 ${val.price})`, value: `*${val.desc}*` });
        });

        const rowBuy = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tt_buy_quy_nguyen').setLabel('Mua Quy Nguyên').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tt_buy_tu_khi').setLabel('Mua Tụ Khí').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tt_buy_truc_co_dan').setLabel('Mua Trúc Cơ').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tt_buy_pha_ma_dan').setLabel('Mua Phá Ma').setStyle(ButtonStyle.Primary)
        );

        const rowUse = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tt_use_quy_nguyen').setLabel('Cắn Quy Nguyên').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tt_use_tu_khi').setLabel('Cắn Tụ Khí').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tt_use_truc_co_dan').setLabel('Dùng Trúc Cơ').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tt_use_pha_ma_dan').setLabel('Dùng Phá Ma').setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embed], components: [rowBuy, rowUse], flags: [MessageFlags.Ephemeral] });
    }

    // Mua Đan
    if (interaction.customId.startsWith('tt_buy_')) {
        const key = interaction.customId.replace('tt_buy_', '');
        const item = DAN_DUOC_SHOP[key];
        if ((tuSi.linhThach || 0) < item.price) return interaction.reply({ content: `❌ Không đủ Linh Thạch!`, flags: [MessageFlags.Ephemeral] });

        tuSi.linhThach -= item.price;
        tuSi.bag[key] = (tuSi.bag[key] || 0) + 1;
        await saveTuTienData();
        return interaction.reply({ content: `✅ Mua thành công **${item.name}**!`, flags: [MessageFlags.Ephemeral] });
    }

    // Cắn/Sử dụng Đan
    if (interaction.customId.startsWith('tt_use_')) {
        const key = interaction.customId.replace('tt_use_', '');
        const item = DAN_DUOC_SHOP[key];

        if (!tuSi.bag[key] || tuSi.bag[key] <= 0) return interaction.reply({ content: `❌ Không có đan dược này trong túi!`, flags: [MessageFlags.Ephemeral] });

        if (key === 'truc_co_dan') {
            if (tuSi.isTrucCoActive) return interaction.reply({ content: `⚠️ Đang có sẵn dược lực này trong người!`, flags: [MessageFlags.Ephemeral] });
            tuSi.bag.truc_co_dan -= 1;
            tuSi.isTrucCoActive = true;
            await saveTuTienData();
            return interaction.reply({ content: `🔮 Đã dùng **Trúc Cơ Bảo Đan**! Tăng +20% tỷ lệ thành công khi Đột Phá kế tiếp.`, flags: [MessageFlags.Ephemeral] });
        }

        if (key === 'pha_ma_dan') {
            if (tuSi.isPhaMaActive) return interaction.reply({ content: `⚠️ Chân khí hộ thể đang căng tràn!`, flags: [MessageFlags.Ephemeral] });
            tuSi.bag.pha_ma_dan -= 1;
            tuSi.isPhaMaActive = true;
            await saveTuTienData();
            return interaction.reply({ content: `🛡️ Đã dùng **Phá Ma Đan**! Sẽ không bị rớt cấp nếu đột phá thất bại.`, flags: [MessageFlags.Ephemeral] });
        }

        if (item.reqMaxId && tuSi.canhGioiId > item.reqMaxId) return interaction.reply({ content: `❌ Phẩm cấp quá thấp, không thể hấp thu.`, flags: [MessageFlags.Ephemeral] });
        if (item.reqMinId && tuSi.canhGioiId < item.reqMinId) return interaction.reply({ content: `❌ Dược lực quá mạnh, bạo thể đấy!`, flags: [MessageFlags.Ephemeral] });

        tuSi.bag[key] -= 1;
        let expNhan = item.value;
        tuSi.pillCountToday = (tuSi.pillCountToday || 0) + 1;
        if (tuSi.pillCountToday > 2) expNhan = Math.floor(expNhan * 0.5);

        tuSi.exp = Math.min(hienTai.maxExp, tuSi.exp + expNhan);
        tuSi.lastPillTime = bayGio;
        await saveTuTienData();

        return interaction.reply({ 
            content: `💊 Luyện hóa thành công **${item.name}**! Bạn nhận \`+${expNhan} EXP\`. ${tuSi.pillCountToday > 2 ? '⚠️ *(Kháng thuốc: Giảm 50% dược lực)*' : ''}`, 
            flags: [MessageFlags.Ephemeral] 
        });
    }

    // ⚡ Đột Phá
    if (interaction.customId === 'tt_dotpha') {
        if (tuSi.exp < hienTai.maxExp) return interaction.reply({ content: `❌ Linh khí chưa đầy (\`${tuSi.exp}/${hienTai.maxExp}\`)!`, flags: [MessageFlags.Ephemeral] });
        if (tuSi.canhGioiId >= CANH_GIOI_LIST.length) return interaction.reply({ content: `🌌 Đạo hữu đã đứng đầu thiên hạ!`, flags: [MessageFlags.Ephemeral] });

        let tyLe = hienTai.baseRate + linhCanCauHinh.rateBonus;
        if (tuSi.isTrucCoActive) tyLe += DAN_DUOC_SHOP.truc_co_dan.value;

        const xucXac = Math.floor(Math.random() * 100);

        if (xucXac < tyLe) {
            tuSi.canhGioiId += 1;
            tuSi.exp = 0;
            tuSi.isTrucCoActive = false;
            tuSi.isPhaMaActive = false;
            await saveTuTienData();
            const moi = CANH_GIOI_LIST.find(cg => cg.id === tuSi.canhGioiId);
            return interaction.reply({ content: `⚡ **💥 THÀNH CÔNG!** Đạo hữu bước vào cảnh giới mới: **${moi.name}**!`, flags: [MessageFlags.Ephemeral] });
        } else {
            let tinhTrang = "";
            if (tuSi.isPhaMaActive) {
                tuSi.exp = Math.floor(tuSi.exp * 0.5);
                tinhTrang = "🛡️ Nhờ **Phá Ma Đan**, bạn giữ nguyên Cảnh giới cũ, chỉ tiêu hao 50% linh khí.";
            } else {
                tuSi.exp = 0;
                if (hienTai.loseLevel) {
                    tuSi.canhGioiId -= 1;
                    const rot = CANH_GIOI_LIST.find(cg => cg.id === tuSi.canhGioiId);
                    tinhTrang = `💥 Lôi kiếp đánh vỡ tu vi! Đạo hữu rớt thẳng xuống: **${rot.name}**!`;
                } else {
                    tinhTrang = "💥 Thất bại, linh khí về 0 nhưng may mắn giữ nguyên cảnh giới.";
                }
            }
            tuSi.isTrucCoActive = false;
            tuSi.isPhaMaActive = false;
            await saveTuTienData();
            return interaction.reply({ content: `❌ **ĐỘT PHÁ THẤT BẠI!** \n${tinhTrang}`, flags: [MessageFlags.Ephemeral] });
        }
    }
}

module.exports = { sendTuTienMainMenu, handleTuTienInteraction };