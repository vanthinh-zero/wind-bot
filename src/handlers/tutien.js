const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { CANH_GIOI_LIST, LINH_CAN_TYPES, DAN_DUOC_SHOP } = require('../config/tutien_config');
const { getTuSi, saveTuTienData } = require('../utils/database');

const TUTIEN_CHANNEL_ID = process.env.TUTIEN_CHANNEL_ID?.trim() || '';
const processingUsers = new Set();

// Danh sách Quẻ Bói Vận Khí ngẫu nhiên mỗi ngày
const VAN_KHI_LIST = [
    { name: '🔴 Đại Hung (Xui tận mạng)', rateMod: -15, expMod: 0.7, desc: 'Hôm nay ra đường nhớ ngó trước sau, bước chân trái ra cửa là xui xẻo.' },
    { name: '🟠 Tiểu Hung (Hơi đen)', rateMod: -5, expMod: 0.9, desc: 'Khí huyết bất ổn, tâm thần không định. Tu luyện cẩn thận.' },
    { name: '🟡 Bình Thường (Gió lặng sóng êm)', rateMod: 0, expMod: 1.0, desc: 'Một ngày không có gì đặc biệt, thích hợp ngồi thiền dưỡng tính.' },
    { name: '🟢 Tiểu Cát (May mắn nhỏ)', rateMod: 5, expMod: 1.2, desc: 'Đầu óc thanh thản, linh khí xung quanh có vẻ dễ hấp thụ hơn.' },
    { name: '⭐ Đại Cát (Khí vận nghịch thiên!)', rateMod: 15, expMod: 1.5, desc: 'Hào quang nhân vật chính hộ thể! Làm gì cũng dễ thành công.' }
];

async function sendTuTienMainMenu(message) {
    if (message.channel.id !== TUTIEN_CHANNEL_ID) {
        return message.reply(`❌ Hệ thống Tu Tiên chỉ mở tại kênh: <#${TUTIEN_CHANNEL_ID}>`);
    }

    // Giữ nguyên link gốc kèm token đầy đủ của đạo hữu để Discord không chặn lỗi 403
    const mainEmbed = new EmbedBuilder()
        .setTitle('☯️ TIÊN PHỦ TU CHÂN ĐẠI SẢNH ☯️')
        .setDescription('**Nghịch thiên cải mệnh, vấn đỉnh trường sinh.**\n\n*“Con người là linh trưởng của vạn vật, Cổ là tinh hoa của trời đất. Đạo hữu đã sẵn sàng luyện Cổ, nghịch chuyển thiên hạ?”*')
        .setColor('#2c3e50')
        .setImage('https://cdn.discordapp.com/attachments/1508103127956455536/1512524891574767796/72897756f8bb07b7f737f3695574b54b.png?ex=6a246813&is=6a231693&hm=3810e06adf4863393cba8e30c40f5607cf0aed0f786d90e0206799db648abea9&'); 

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tt_profile').setLabel('📜 Đạo Thiệp / Vận Khí').setStyle(ButtonStyle.Secondary),
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
    if (processingUsers.has(userId)) {
        return interaction.reply({ content: '⏳ Thần trí bất định, tâm cấp ăn không được đậu hũ nóng! Hãy thao tác chậm lại.', flags: [MessageFlags.Ephemeral] });
    }

    try {
        processingUsers.add(userId);

        const tuSi = getTuSi(userId, interaction.user.username);
        tuSi.bag = tuSi.bag || {}; 

        const hienTai = CANH_GIOI_LIST.find(cg => cg.id === tuSi.canhGioiId) || CANH_GIOI_LIST[0];
        const linhCanCauHinh = LINH_CAN_TYPES.find(lc => lc.name === tuSi.linhCan) || LINH_CAN_TYPES[3];
        const bayGio = Date.now();

        // Khởi tạo hoặc cập nhật Vận Khí mỗi 24h
        if (!tuSi.lastVanKhiTime || bayGio - tuSi.lastVanKhiTime > 24 * 60 * 60 * 1000) {
            tuSi.vanKhiId = Math.floor(Math.random() * VAN_KHI_LIST.length);
            tuSi.lastVanKhiTime = bayGio;
            tuSi.pillCountToday = 0;
        }
        
        const vanKhi = VAN_KHI_LIST[tuSi.vanKhiId || 2];
        const customId = interaction.customId;

        if (customId === 'tt_profile') return await handleProfile(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi);
        if (customId === 'tt_tuluyen') return await handleTuLuyen(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi, bayGio);
        if (customId === 'tt_lichluyen') return await handleLichLuyen(interaction, tuSi, vanKhi, bayGio);
        if (customId === 'tt_shop') return await handleShop(interaction, tuSi);
        if (customId.startsWith('tt_buy_')) return await handleBuyPill(interaction, tuSi, customId);
        if (customId.startsWith('tt_use_')) return await handleUsePill(interaction, tuSi, hienTai, bayGio);
        if (customId === 'tt_dotpha') return await handleDotPha(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi);

    } catch (error) {
        console.error('Lỗi Tu Tiên:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Khí huyết nghịch lưu, hệ thống gặp trục trặc! Đang tự điều息...', flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }
    } finally {
        processingUsers.delete(userId);
    }
}

// ==================== CÁC HÀM XỬ LÝ CHI TIẾT ====================

async function handleProfile(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi) {
    const embed = new EmbedBuilder()
        .setTitle(`📜 ĐẠO THIỆP TU CHÂN: ${interaction.user.username}`)
        .setColor(linhCanCauHinh.color)
        .addFields(
            { name: '🧬 Thiên Phú Linh Căn', value: `**${tuSi.linhCan}** *(Tốc độ x${linhCanCauHinh.expMultiplier})*` },
            { name: '🔮 Khí Vận Hôm Nay', value: `**${vanKhi.name}**\n*“${vanKhi.desc}”*` },
            { name: '✨ Cảnh Giới Hiện Tại', value: `**${hienTai.name}**`, inline: true },
            { name: '🔮 Linh Khí Hải', value: `\`${tuSi.exp} / ${hienTai.maxExp} EXP\``, inline: true },
            { name: '💰 Linh Thạch', value: `\`${tuSi.linhThach || 0} Viên\``, inline: true },
            { name: '🔋 Đan Khí Hộ Thể', value: `🔮 Trúc Cơ Đan: ${tuSi.isTrucCoActive ? '🟢 Đã nạp' : '🔴 Chưa'}\n🛡️ Phá Ma Đan: ${tuSi.isPhaMaActive ? '🟢 Đã nạp' : '🔴 Chưa'}` },
            { name: '🎒 Túi Trữ Vật', value: `💊 Quy Nguyên: \`${tuSi.bag.quy_nguyen || 0}\` | 🧪 Tụ Khí: \`${tuSi.bag.tu_khi || 0}\` \n✨ Trúc Cơ Đan: \`${tuSi.bag.truc_co_dan || 0}\` | 🛡️ Phá Ma Đan: \`${tuSi.bag.pha_ma_dan || 0}\`` }
        );
    return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
}

async function handleTuLuyen(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi, bayGio) {
    const COOLDOWN = 20000;
    if (bayGio - (tuSi.lastTuLuyen || 0) < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (bayGio - tuSi.lastTuLuyen)) / 1000);
        return interaction.reply({ content: `⏳ Thần trí chưa định, cần tịnh tâm thêm \`${remaining}s\` để tránh tẩu hỏa nhập ma!`, flags: [MessageFlags.Ephemeral] });
    }

    if (Math.random() < 0.02) {
        const expMat = Math.floor((tuSi.exp || 0) * 0.05);
        tuSi.exp = Math.max(0, tuSi.exp - expMat);
        tuSi.lastTuLuyen = bayGio;
        await saveTuTienData();
        return interaction.reply({ content: `🔥 **TẨU HỎA NHẬP MA!** Trong lúc vận công bạn lỡ nghĩ về crush, kinh mạch đảo lộn hao tổn \`-${expMat} EXP\`!`, flags: [MessageFlags.Ephemeral] });
    }

    const expGoc = Math.floor(Math.random() * 16) + 15; 
    const expThucTe = Math.floor(expGoc * linhCanCauHinh.expMultiplier * vanKhi.expMod);
    
    tuSi.exp = Math.min(hienTai.maxExp, (tuSi.exp || 0) + expThucTe);
    tuSi.lastTuLuyen = bayGio;

    await saveTuTienData();
    return interaction.reply({ content: `🧘 Vận chuyển đại chu thiên, hấp thu \`+${expThucTe}\` Linh Khí! (${tuSi.exp}/${hienTai.maxExp} EXP)`, flags: [MessageFlags.Ephemeral] });
}

async function handleLichLuyen(interaction, tuSi, vanKhi, bayGio) {
    const COOLDOWN = 60000;
    if (bayGio - (tuSi.lastLichLuyen || 0) < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (bayGio - tuSi.lastLichLuyen)) / 1000);
        return interaction.reply({ content: `❌ Thân thể rệu rã, ráng xuất hành là bỏ mạng đấy! Chờ hồi sức \`${remaining}s\`.`, flags: [MessageFlags.Ephemeral] });
    }

    tuSi.lastLichLuyen = bayGio;
    const xucXac = Math.floor(Math.random() * 100) + vanKhi.rateMod;
    let msg = "";

    if (xucXac > 55) { 
        const eventTot = [
            { text: "🧭 Đi dạo bờ suối vô tinh nhặt được nhẫn trữ vật của một vị đại năng rớt lại!", thach: 40, item: "quy_nguyen" },
            { text: "🐗 Gặp một con heo rừng đi lạc, bạn nướng thịt ăn giúp thể chất tăng tiến, nhặt được Linh Thạch rơi bên cạnh!", thach: 25, item: null },
            { text: "💃 Giải cứu một vị 'Tiên cô' khỏi sơn tặc, nàng tặng bạn sính lễ tạ ơn rồi thẹn thùng bỏ chạy!", thach: 50, item: "tu_khi" },
            { text: "🌿 May mắn hái được một gốc thảo dược ngàn năm đem bán cho Đan Các!", thach: 60, item: null }
        ];
        const ev = eventTot[Math.floor(Math.random() * eventTot.length)];
        const thachNhan = ev.thach + Math.floor(Math.random() * 20);
        tuSi.linhThach = (tuSi.linhThach || 0) + thachNhan;
        msg = `🟢 ${ev.text} **(+${thachNhan} Linh Thạch)**.`;
        
        if (ev.item && Math.random() < 0.4) {
            tuSi.bag[ev.item] = (tuSi.bag[ev.item] || 0) + 1;
            msg += ` Kèm theo 1 viên **${DAN_DUOC_SHOP[ev.item].name}**!`;
        }
    } 
    else if (xucXac >= 20) { 
        const eventXui = [
            { text: "⚔️ Gặp Yêu Thú hộ vệ linh thảo, đánh không lại đành vắt chân lên cổ chạy, hao tổn tinh huyết!", expLoss: 0.08 },
            { text: "🍲 Ăn nhầm nấm độc trong rừng, tiêu chảy ba ngày ba đêm vỡ mật, tiêu tán linh lực!", expLoss: 0.12 },
            { text: "🕳️ Lọt hố bẫy thú của thợ săn phàm nhân, vừa nhục nhã vừa tổn hao tu vi để leo lên!", expLoss: 0.05 }
        ];
        const ev = eventXui[Math.floor(Math.random() * eventXui.length)];
        const linhKhiMat = Math.floor((tuSi.exp || 0) * ev.expLoss);
        tuSi.exp = Math.max(0, tuSi.exp - linhKhiMat);
        msg = `🟡 ${ev.text} **(-${linhKhiMat} Linh Khí)**.`;
    } 
    else { 
        const eventMatTien = [
            { text: "🚨 Va chạm với Nhị Thế Tổ của một đại tông môn, phải nộp tiền đền bù tinh thần để giữ mạng!", cashLoss: 0.15 },
            { text: "🦊 Bị một em Hồ Ly Tinh lừa vào quán rượu, thanh toán hóa đơn 'cắt cổ' hết sạch túi tiền!", cashLoss: 0.25 },
            { text: "💰 Rơi vào trận pháp đạo tặc, tốn linh thạch kích hoạt bùa dịch chuyển chạy trốn!", cashLoss: 0.18 }
        ];
        const ev = eventMatTien[Math.floor(Math.random() * eventMatTien.length)];
        const tienMat = Math.floor((tuSi.linhThach || 0) * ev.cashLoss);
        tuSi.linhThach = Math.max(0, tuSi.linhThach - tienMat);
        msg = `🔴 ${ev.text} **(-${tienMat} Linh Thạch)**.`;
    }

    await saveTuTienData();
    return interaction.reply({ content: msg, flags: [MessageFlags.Ephemeral] });
}

async function handleShop(interaction, tuSi) {
    const embed = new EmbedBuilder()
        .setTitle('🏪 TIÊN PHỦ ĐAN CÁC - THẦN THÔNG ĐAN DƯỢC')
        .setDescription(`Hôm nay đạo hữu đã kháng \`${tuSi.pillCountToday || 0}/2\` viên tăng EXP.\n*“Tiền nào của nấy, mua đan không mặc cả!”*`)
        .setColor('#9b59b6');

    Object.entries(DAN_DUOC_SHOP).forEach(([key, val]) => {
        embed.addFields({ name: `${val.name} (💰 ${val.price} Linh Thạch)`, value: `*${val.desc}*` });
    });

    const rowBuy = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tt_buy_quy_nguyen').setLabel('Buy Quy Nguyên').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tt_buy_tu_khi').setLabel('Buy Tụ Khí').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tt_buy_truc_co_dan').setLabel('Buy Trúc Cơ').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tt_buy_pha_ma_dan').setLabel('Buy Phá Ma').setStyle(ButtonStyle.Primary)
    );

    const rowUse = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tt_use_quy_nguyen').setLabel('Cắn Quy Nguyên').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tt_use_tu_khi').setLabel('Cắn Tụ Khí').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tt_use_truc_co_dan').setLabel('Dùng Trúc Cơ').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tt_use_pha_ma_dan').setLabel('Dùng Phá Ma').setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({ embeds: [embed], components: [rowBuy, rowUse], flags: [MessageFlags.Ephemeral] });
}

async function handleBuyPill(interaction, tuSi, customId) {
    const key = customId.replace('tt_buy_', '');
    const item = DAN_DUOC_SHOP[key];

    if (!item) return interaction.reply({ content: `❌ Món này Đan Các hôm nay hết hàng!`, flags: [MessageFlags.Ephemeral] });
    if ((tuSi.linhThach || 0) < item.price) return interaction.reply({ content: `❌ Nghèo mà đòi mua tiên đan? Thiếu \`${item.price - tuSi.linhThach}\` Linh Thạch nữa!`, flags: [MessageFlags.Ephemeral] });

    tuSi.linhThach -= item.price;
    tuSi.bag[key] = (tuSi.bag[key] || 0) + 1;

    await saveTuTienData();
    return interaction.reply({ content: `✅ Giao dịch thành công! Nhận **${item.name}**, chúc đạo hữu sớm ngày phi thăng.`, flags: [MessageFlags.Ephemeral] });
}

async function handleUsePill(interaction, tuSi, hienTai, bayGio) {
    const key = interaction.customId.replace('tt_use_', '');
    const item = DAN_DUOC_SHOP[key];

    if (!item) return interaction.reply({ content: `❌ Vật phẩm không hợp lệ!`, flags: [MessageFlags.Ephemeral] });
    if (!tuSi.bag[key] || tuSi.bag[key] <= 0) return interaction.reply({ content: `❌ Lục tung Túi Trữ Vật cũng chẳng thấy viên **${item.name}** nào!`, flags: [MessageFlags.Ephemeral] });

    if (key === 'truc_co_dan') {
        if (tuSi.isTrucCoActive) return interaction.reply({ content: `⚠️ Dược lực cũ chưa tan, cắn nữa bạo thể đấy!`, flags: [MessageFlags.Ephemeral] });
        tuSi.bag.truc_co_dan -= 1;
        tuSi.isTrucCoActive = true;
        await saveTuTienData();
        return interaction.reply({ content: `🔮 Đã nuốt **Trúc Cơ Bảo Đan**! Đan điền ấm áp, tăng +20% tỷ lệ đột phá thiên kiếp kế tiếp.`, flags: [MessageFlags.Ephemeral] });
    }

    if (key === 'pha_ma_dan') {
        if (tuSi.isPhaMaActive) return interaction.reply({ content: `⚠️ Chân khí hộ thể của Phá Ma Đan vẫn còn nguyên!`, flags: [MessageFlags.Ephemeral] });
        tuSi.bag.pha_ma_dan -= 1;
        tuSi.isPhaMaActive = true;
        await saveTuTienData();
        return interaction.reply({ content: `🛡️ Đã dùng **Phá Ma Đan**! Tâm ma bất xâm, lỡ đột phá thất bại cũng không bị rớt cảnh giới.`, flags: [MessageFlags.Ephemeral] });
    }

    if (item.reqMaxId && tuSi.canhGioiId > item.reqMaxId) return interaction.reply({ content: `❌ Phẩm cấp tu vi quá cao, cắn viên này như muối bỏ bể, không có tác dụng.`, flags: [MessageFlags.Ephemeral] });
    if (item.reqMinId && tuSi.canhGioiId < item.reqMinId) return interaction.reply({ content: `❌ Thân thể phàm thai chưa chịu nổi dược lực mạnh như vậy, bạo thể chết đấy!`, flags: [MessageFlags.Ephemeral] });

    tuSi.bag[key] -= 1;
    let expNhan = item.value;
    tuSi.pillCountToday = (tuSi.pillCountToday || 0) + 1;
    
    const isOverdosed = tuSi.pillCountToday > 2;
    if (isOverdosed) expNhan = Math.floor(expNhan * 0.5);

    tuSi.exp = Math.min(hienTai.maxExp, (tuSi.exp || 0) + expNhan);
    tuSi.lastPillTime = bayGio;

    await saveTuTienData();
    return interaction.reply({ 
        content: `💊 Luyện hóa thành công **${item.name}**! Cơ thể thoải mái nhận \`+${expNhan} EXP\`. ${isOverdosed ? '\n⚠️ *(Kháng thuốc: Khí hải bão hòa, giảm 50% hiệu quả đan dược)*' : ''}`, 
        flags: [MessageFlags.Ephemeral] 
    });
}

async function handleDotPha(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi) {
    if ((tuSi.exp || 0) < hienTai.maxExp) return interaction.reply({ content: `❌ Linh khí chưa tràn đầy (\`${tuSi.exp}/${hienTai.maxExp}\`), cố đấm ăn xôi chỉ có nước tan xương nát thịt!`, flags: [MessageFlags.Ephemeral] });
    if (tuSi.canhGioiId >= CANH_GIOI_LIST.length) return interaction.reply({ content: `🌌 Đạo hữu đã đứng đầu cửu thiên, đỉnh phong thiên hạ!`, flags: [MessageFlags.Ephemeral] });

    let tyLe = hienTai.baseRate + linhCanCauHinh.rateBonus + vanKhi.rateMod;
    if (tuSi.isTrucCoActive) tyLe += DAN_DUOC_SHOP.truc_co_dan.value;

    const xucXac = Math.floor(Math.random() * 100);

    if (xucXac < tyLe) { 
        tuSi.canhGioiId += 1;
        tuSi.exp = 0;
        tuSi.isTrucCoActive = false;
        tuSi.isPhaMaActive = false;
        await saveTuTienData();
        
        const moi = CANH_GIOI_LIST.find(cg => cg.id === tuSi.canhGioiId);
        
        await interaction.channel.send(`🎉 **[THIÊN HẠ CHẤN ĐỘNG]** Chúc mừng đạo hữu <@${interaction.user.id}> chịu đựng lôi kiếp rèn thân, đột phá thành công lên tầng thứ mới: **${moi?.name || 'Vô Định'}**! 🚀`);
        
        return interaction.reply({ content: `⚡ **💥 THÀNH CÔNG!** Thần thức mở rộng, vạn thọ vô cương!`, flags: [MessageFlags.Ephemeral] });
    } else { 
        let tinhTrang = "";
        if (tuSi.isPhaMaActive) {
            tuSi.exp = Math.floor(tuSi.exp * 0.5);
            tinhTrang = "🛡️ May mắn thay, nhờ có **Phá Ma Đan** hộ thể, bạn giữ nguyên Cảnh giới cũ, chỉ tiêu hao 50% linh khí để chữa trị nội thương.";
        } else {
            tuSi.exp = 0;
            if (hienTai.loseLevel && tuSi.canhGioiId > 1) {
                tuSi.canhGioiId -= 1;
                const rot = CANH_GIOI_LIST.find(cg => cg.id === tuSi.canhGioiId);
                tinhTrang = `💥 Lôi kiếp bạo ngược đánh vỡ linh hải! Đạo hữu kinh mạch đứt đoạn, rớt thẳng xuống cảnh giới: **${rot?.name || 'Phàm Nhân'}**!`;
            } else {
                tinhTrang = "💥 Thiên kiếp đánh tan linh khí! May mắn giữ được một mạng và giữ nguyên cảnh giới cũ.";
            }
        }
        tuSi.isTrucCoActive = false;
        tuSi.isPhaMaActive = false;
        
        await saveTuTienData();
        return interaction.reply({ content: `❌ **ĐỘT PHÁ THẤT BẠI!** \n\n${tinhTrang}\n*“Tu hành vốn nghịch thiên, thất bại là chuyện thường tình, xin chia buồn cùng đạo hữu.”*`, flags: [MessageFlags.Ephemeral] });
    }
}

module.exports = { sendTuTienMainMenu, handleTuTienInteraction };