const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { CANH_GIOI_LIST, LINH_CAN_TYPES, DAN_DUOC_SHOP } = require('../config/tutien_config');
const { getTuSi, saveTuTienData } = require('../utils/database');

const TUTIEN_CHANNEL_ID = process.env.TUTIEN_CHANNEL_ID?.trim() || '';
const processingUsers = new Set();

// Khởi tạo Boss thế giới nếu chưa có
global.bossTheGioi = global.bossTheGioi || { name: "Thượng Cổ Thôn Phệ Ma Vương", maxHp: 5000, hp: 5000, isDead: false };

const VAN_KHI_LIST = [
    { name: '🔴 Đại Hung (Xui tận mạng)', rateMod: -15, expMod: 0.7, desc: 'Hôm nay ra đường nhớ ngó trước sau, bước chân trái ra cửa là xui xẻo.' },
    { name: '🟠 Tiểu Hung (Hơi đen)', rateMod: -5, expMod: 0.9, desc: 'Khí huyết bất ổn, tâm thần không định. Tu luyện cẩn thận.' },
    { name: '🟡 Bình Thường (Gió lặng sóng êm)', rateMod: 0, expMod: 1.0, desc: 'Một ngày không có gì đặc biệt, thích hợp ngồi thiền dưỡng tính.' },
    { name: '🟢 Tiểu Cát (May mắn nhỏ)', rateMod: 5, expMod: 1.2, desc: 'Đầu óc thanh thản, linh khí xung quanh có vẻ dễ hấp thụ hơn.' },
    { name: '⭐ Đại Cát (Khí vận nghịch thiên!)', rateMod: 15, expMod: 1.5, desc: 'Hào quang nhân vật chính hộ thể! Làm gì cũng dễ thành công.' }
];

function getCanhGioiName(tuSi, hienTai) {
    if (!hienTai) return 'Vô Định';
    if (tuSi.phai === 'ma') return hienTai.name_ma;
    return hienTai.name_chinh;
}

// ─── GIAO DIỆN CHÍNH ĐẠI SẢNH ───
async function sendTuTienMainMenu(message) {
    if (message.channel.id !== TUTIEN_CHANNEL_ID) {
        return message.reply(`❌ Hệ thống Tu Tiên chỉ mở tại kênh: <#${TUTIEN_CHANNEL_ID}>`);
    }

    const mainEmbed = new EmbedBuilder()
        .setTitle('☯️ TIÊN PHỦ TU CHÂN ĐẠI SẢNH ☯️')
        .setDescription('**Nghịch thiên cải mệnh, vấn đỉnh trường sinh.**\n\n*“Chính đạo trường tồn, hay Ma đạo vô biên? Con đường là do đạo hữu tự chọn!”*')
        .setColor('#2c3e50')
        .setImage('https://cdn.discordapp.com/attachments/1508103127956455536/1512524891574767796/72897756f8bb07b7f737f3695574b54b.png'); 

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tt_profile').setLabel('📜 Đạo Thiệp / Vận Khí').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tt_tuluyen').setLabel('🧘 Hấp Thu Linh Khí').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tt_lichluyen').setLabel('🧭 Xuất Ngoại Lịch Luyện').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tt_shop').setLabel('🏪 Đan Các').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tt_dotpha').setLabel('⚡ Đột Phá Thiên Kiếp').setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tt_cuoppha').setLabel('⚔️ Cướp Đoạt Linh Thạch').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tt_songtu').setLabel('💞 Song Tu Đại Pháp').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tt_boss').setLabel('👹 Khiêu Chiến Cổ Ma').setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({ embeds: [mainEmbed], components: [row1, row2] });
}

// ─── ĐIỀU HƯỚNG TƯƠNG TÁC GIA CỐ TUYỆT ĐỐI ───
async function handleTuTienInteraction(interaction) {
    if (!interaction.customId.startsWith('tt_')) return;

    const userId = interaction.user.id;
    
    // KHÓA CHIẾN THUẬT: Chặn đứng tình trạng spam click gây lỗi trùng lặp trạng thái
    if (processingUsers.has(userId)) {
        return interaction.reply({ content: '⏳ Đạo tâm bất định! Thao tác quá nhanh, hãy tịnh tâm một chút.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }
    processingUsers.add(userId);

    const customId = interaction.customId;

    try {
        // LUỒNG 1: Xử lý nút bấm quyết định biến cố lịch luyện / cơ duyên
        if (customId.startsWith('tt_ll_') || customId.startsWith('tt_coyeu_')) {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate().catch(() => {});
            }
            const tuSi = getTuSi(userId, interaction.user.username);
            if (customId.startsWith('tt_ll_')) {
                return await handleLichLuyenDecision(interaction, tuSi);
            } else {
                return await handleCoDuyenDecision(interaction, tuSi);
            }
        }

        // LUỒNG 2: Xử lý nút bấm Song Tu Đại Pháp (Sử dụng kênh phản hồi công khai riêng)
        if (customId === 'tt_songtu') {
            const tuSi = getTuSi(userId, interaction.user.username);
            return await handleSongTu(interaction, tuSi, Date.now());
        }

        // LUỒNG 3: Các chức năng chính từ Đại Sảnh (Cần bảo vệ deferReply triệt để)
        if (!interaction.deferred && !interaction.replied) {
            try {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            } catch (deferError) {
                if (!interaction.replied) {
                    await interaction.reply({ content: '⚡ Linh khí hỗn loạn, hãy ấn lại nút một lần nữa!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
                }
                return;
            }
        }

        const tuSi = getTuSi(userId, interaction.user.username);
        tuSi.bag = tuSi.bag || {}; 
        tuSi.phai = tuSi.phai || 'chinh'; 

        const hienTai = CANH_GIOI_LIST.find(cg => cg.id === tuSi.canhGioiId) || CANH_GIOI_LIST[0];
        const linhCanCauHinh = LINH_CAN_TYPES.find(lc => lc.name === tuSi.linhCan) || LINH_CAN_TYPES[3];
        const bayGio = Date.now();

        if (!tuSi.lastVanKhiTime || bayGio - tuSi.lastVanKhiTime > 24 * 60 * 60 * 1000) {
            tuSi.vanKhiId = Math.floor(Math.random() * VAN_KHI_LIST.length);
            tuSi.lastVanKhiTime = bayGio;
            tuSi.pillCountToday = 0;
        }
        
        const vanKhi = VAN_KHI_LIST[tuSi.vanKhiId || 2];

        if (customId === 'tt_profile') {
            return await handleProfile(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi);
        } else if (customId === 'tt_tuluyen') {
            return await handleTuLuyen(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi, bayGio);
        } else if (customId === 'tt_lichluyen') {
            return await handleLichLuyen(interaction, tuSi, vanKhi, bayGio);
        } else if (customId === 'tt_shop') {
            return await handleShop(interaction, tuSi);
        } else if (customId === 'tt_dotpha') {
            return await handleDotPha(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi);
        } else if (customId === 'tt_cuoppha') {
            return await handleCuopPha(interaction, tuSi, bayGio);
        } else if (customId === 'tt_boss') {
            return await handleBossTheGioi(interaction, tuSi, hienTai, bayGio);
        } else if (customId.startsWith('tt_buy_')) {
            return await handleBuyPill(interaction, tuSi, customId);
        } else if (customId.startsWith('tt_use_')) {
            return await handleUsePill(interaction, tuSi, hienTai, bayGio);
        }

    } catch (error) {
        console.error('Lỗi hệ thống Tu Tiên:', error);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: '❌ Linh khí nghịch chuyển! Trận pháp đang tự động hồi phục, vui lòng thử lại.' }).catch(() => {});
        }
    } finally {
        processingUsers.delete(userId);
    }
}

// ─── 1. XỬ LÝ ĐẠO THIỆP / PROFILE ───
async function handleProfile(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi) {
    const embed = new EmbedBuilder()
        .setTitle(`📜 ĐẠO THIỆP: ${interaction.user.username}`)
        .setColor(tuSi.phai === 'ma' ? '#c0392b' : '#3498db')
        .addFields(
            { name: '☯️ Trận Doanh', value: tuSi.phai === 'ma' ? '🔴 Ma Đạo Vô Biên' : '🟢 Chính Đạo Trường Tồn', inline: true },
            { name: '✨ Linh Căn', value: `${linhCanCauHinh.name} (Hấp thu: x${linhCanCauHinh.expMultiplier})`, inline: true },
            { name: '🛡️ Cảnh Giới', value: `**${getCanhGioiName(tuSi, hienTai)}**`, inline: true },
            { name: '📊 Tu Vi (Exp)', value: `${tuSi.exp} / ${hienTai.maxExp === -1 ? 'Vô Tận' : hienTai.maxExp}`, inline: true },
            { name: '💎 Linh Thạch', value: `${tuSi.linhThach} viên`, inline: true },
            { name: '🍀 Vận Khí Hôm Nay', value: `**${vanKhi.name}**\n*${vanKhi.desc}*` }
        );

    let tuiDo = '';
    for (const [key, val] of Object.entries(tuSi.bag)) {
        if (val > 0) {
            const item = DAN_DUOC_SHOP.find(p => p.id === key);
            if (item) tuiDo += `• 💊 **${item.name}**: ${val} viên\n`;
        }
    }
    embed.addFields({ name: '🎒 Túi Càn Khôn', value: tuiDo || '*Trống rỗng*' });

    return await interaction.editReply({ embeds: [embed] }).catch(() => {});
}

// ─── 2. XỬ LÝ TU LUYỆN ───
async function handleTuLuyen(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi, bayGio) {
    if (hienTai.maxExp !== -1 && tuSi.exp >= hienTai.maxExp) {
        return await interaction.editReply({ content: `⚡ Tu vi đã đạt đỉnh kích **${getCanhGioiName(tuSi, hienTai)}**! Hãy tích lũy Linh Thạch và ấn **Đột Phá Thiên Kiếp**.` }).catch(() => {});
    }

    const cooldown = 60 * 1000; 
    if (tuSi.lastTuLuyenTime && bayGio - tuSi.lastTuLuyenTime < cooldown) {
        const conLai = Math.ceil((cooldown - (bayGio - tuSi.lastTuLuyenTime)) / 1000);
        return await interaction.editReply({ content: `🧘 Đạo hữu đang trong trạng thái bế quan điều khí. Hãy đợi sau ${conLai} giây nữa.` }).catch(() => {});
    }

    const baseExp = Math.floor(Math.random() * 11) + 15; 
    const finalExp = Math.floor(baseExp * linhCanCauHinh.expMultiplier * vanKhi.expMod);
    
    tuSi.exp += finalExp;
    tuSi.lastTuLuyenTime = bayGio;
    saveTuTienData();

    return await interaction.editReply({ content: `🧘 Đạo hữu nhập định tu luyện, hấp thu linh khí trời đất, tăng thêm **${finalExp}** tu vi! (Vận khí modifier: x${vanKhi.expMod})` }).catch(() => {});
}

// ─── 3. XỬ LÝ LỊCH LUYỆN ───
async function handleLichLuyen(interaction, tuSi, vanKhi, bayGio) {
    const cooldown = 5 * 60 * 1000; 
    if (tuSi.lastLichLuyenTime && bayGio - tuSi.lastLichLuyenTime < cooldown) {
        const conLai = Math.ceil((cooldown - (bayGio - tuSi.lastLichLuyenTime)) / 1000);
        return await interaction.editReply({ content: `🧭 Đạo hữu vừa mới viễn du trở về, nguyên thần còn mệt mỏi. Cần nghỉ ngơi thêm ${conLai} giây.` }).catch(() => {});
    }

    tuSi.lastLichLuyenTime = bayGio;
    const xucXac = Math.random() * 100;

    // 25% Gặp Tâm Ma Biến Cố
    if (xucXac < 25) {
        saveTuTienData();
        const embed = new EmbedBuilder()
            .setTitle('⚠️ TÂM MA BIẾN CỐ XUẤT HIỆN!')
            .setDescription('Trên đường viễn du, tâm ma trỗi dậy hóa thành ảo ảnh mê hoặc đạo hữu gia nhập Ma đạo để đổi lấy sức mạnh nghịch thiên!')
            .setColor('#9b59b6');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tt_ll_phantoichinh').setLabel('😈 Đọa Lạc Ma Đạo (+300 EXP)').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('tt_ll_giuvungchinh').setLabel('🧘 Giữ Vững Bản Tâm (+50 Linh Thạch)').setStyle(ButtonStyle.Success)
        );

        return await interaction.editReply({ embeds: [embed], components: [row] }).catch(() => {});
    }

    // Thắng lợi lịch luyện bình thường
    const linhThachNhan = Math.floor(Math.random() * 31) + 20; 
    tuSi.linhThach += linhThachNhan;
    saveTuTienData();

    return await interaction.editReply({ content: `🧭 Đạo hữu xuất ngoại phiêu bạt, tiến vào di tích thượng cổ nhặt được một túi linh thạch vô chủ, nhận được **${linhThachNhan}** Linh Thạch!` }).catch(() => {});
}

// Quyết định biến cố Lịch Luyện
async function handleLichLuyenDecision(interaction, tuSi) {
    const customId = interaction.customId;
    let thongBao = '';

    if (customId === 'tt_ll_phantoichinh') {
        tuSi.phai = 'ma';
        tuSi.exp += 300;
        thongBao = '😈 **Đạo hữu đã sa chân vào Ma Đạo!** Sức mạnh hắc ám tràn đầy cơ thể, nhận **300 Tu Vi**, danh thiếp đổi thành màu máu!';
    } else if (customId === 'tt_ll_giuvungchinh') {
        tuSi.linhThach += 50;
        thongBao = '🧘 **Đạo tâm kiên định!** Trấn áp tâm ma thành công, thiên địa ban tặng **50 Linh Thạch** khích lệ.';
    }

    saveTuTienData();
    return await interaction.editReply({ content: thongBao, embeds: [], components: [] }).catch(() => {});
}

// ─── 4. XỬ LÝ ĐAN CÁC / SHOP ───
async function handleShop(interaction, tuSi) {
    const embed = new EmbedBuilder()
        .setTitle('🏪 TIÊN PHỦ ĐAN CÁC')
        .setDescription(`Nơi bán các loại thần đan trợ lực tu luyện. Linh thạch của bạn: **${tuSi.linhThach}** viên.\n*Mỗi ngày chỉ được cắn tối đa 3 viên đan.*`)
        .setColor('#f1c40f');

    const row = new ActionRowBuilder();
    DAN_DUOC_SHOP.forEach(p => {
        embed.addFields({ name: `💊 ${p.name}`, value: `Giá: ${p.price} Linh Thạch | Hiệu quả: ${p.desc}` });
        row.addComponents(
            new ButtonBuilder().setCustomId(`tt_buy_${p.id}`).setLabel(`Mua ${p.name}`).setStyle(ButtonStyle.Primary)
        );
    });

    const rowUse = new ActionRowBuilder();
    let hasPill = false;
    DAN_DUOC_SHOP.forEach(p => {
        if (tuSi.bag[p.id] > 0) {
            hasPill = true;
            rowUse.addComponents(
                new ButtonBuilder().setCustomId(`tt_use_${p.id}`).setLabel(`Cắn ${p.name} (${tuSi.bag[p.id]})`).setStyle(ButtonStyle.Success)
            );
        }
    });

    const components = hasPill ? [row, rowUse] : [row];
    return await interaction.editReply({ embeds: [embed], components }).catch(() => {});
}

async function handleBuyPill(interaction, tuSi, customId) {
    const pillId = customId.replace('tt_buy_', '');
    const pill = DAN_DUOC_SHOP.find(p => p.id === pillId);

    if (!pill) return await interaction.editReply({ content: '❌ Thần đan này không tồn tại.' }).catch(() => {});
    if (tuSi.linhThach < pill.price) return await interaction.editReply({ content: '❌ Linh thạch không đủ để giao dịch!' }).catch(() => {});

    tuSi.linhThach -= pill.price;
    tuSi.bag[pillId] = (tuSi.bag[pillId] || 0) + 1;
    saveTuTienData();

    return await interaction.editReply({ content: `✅ Mua thành công 1 viên **${pill.name}**! Đan dược đã chuyển vào túi càn khôn.` }).catch(() => {});
}

async function handleUsePill(interaction, tuSi, hienTai, bayGio) {
    const pillId = interaction.customId.replace('tt_use_', '');
    const pill = DAN_DUOC_SHOP.find(p => p.id === pillId);

    if (!pill || !tuSi.bag[pillId] || tuSi.bag[pillId] <= 0) {
        return await interaction.editReply({ content: '❌ Bạn không có viên đan dược này trong túi!' }).catch(() => {});
    }

    tuSi.pillCountToday = tuSi.pillCountToday || 0;
    if (tuSi.pillCountToday >= 3) {
        return await interaction.editReply({ content: '❌ Đan độc tích tụ! Cơ thể đã đạt giới hạn hấp thu đan dược hôm nay (Tối đa 3 viên/ngày).' }).catch(() => {});
    }

    tuSi.bag[pillId]--;
    tuSi.pillCountToday++;

    let bonusText = '';
    if (pill.id === 'exp_pill') {
        const bonus = Math.floor(Math.random() * 51) + 100; 
        tuSi.exp += bonus;
        bonusText = `gia tăng **${bonus} Tu Vi**!`;
    } else if (pill.id === 'rate_pill') {
        tuSi.hasRateBuff = true; 
        bonusText = 'tăng thêm **15% tỷ lệ thành công** cho lần Đột Phá kế tiếp!';
    }

    saveTuTienData();
    return await interaction.editReply({ content: `💊 Bạn nuốt vào một viên **${pill.name}**, dược lực bùng nổ ${bonusText}` }).catch(() => {});
}

// ─── 5. XỬ LÝ ĐỘT PHÁ ───
async function handleDotPha(interaction, tuSi, hienTai, linhCanCauHinh, vanKhi) {
    if (hienTai.maxExp === -1) return await interaction.editReply({ content: '⚡ Đạo hữu đã đứng tại đỉnh phong của thế giới này, không thể đột phá thêm!' }).catch(() => {});
    if (tuSi.exp < hienTai.maxExp) return await interaction.editReply({ content: `❌ Chưa tích lũy đủ tu vi để dẫn động thiên kiếp (Cần đạt ${tuSi.exp}/${hienTai.maxExp}).` }).catch(() => {});
    if (tuSi.linhThach < hienTai.cost) return await interaction.editReply({ content: `❌ Không đủ Linh Thạch xây dựng hộ thể trận pháp (Cần ${hienTai.cost} Linh Thạch).` }).catch(() => {});

    tuSi.linhThach -= hienTai.cost;
    
    let tileThanhCong = hienTai.baseRate + vanKhi.rateMod;
    if (tuSi.hasRateBuff) {
        tileThanhCong += 15;
        tuSi.hasRateBuff = false; 
    }

    const xucXac = Math.random() * 100;
    if (xucXac <= tileThanhCong) {
        const indexCg = CANH_GIOI_LIST.findIndex(cg => cg.id === tuSi.canhGioiId);
        const tiepTheo = CANH_GIOI_LIST[indexCg + 1];

        tuSi.canhGioiId = tiepTheo.id;
        tuSi.exp = 0; 
        saveTuTienData();

        return await interaction.editReply({ content: `🎉 **THIÊN KIẾP ĐẠI THÀNH!** Đạo hữu nghênh chiến lôi kiếp vạn trượng thành công, tiến cấp vào cảnh giới: **${getCanhGioiName(tuSi, tiepTheo)}**! Tỷ lệ thành công: ${tileThanhCong.toFixed(1)}%` }).catch(() => {});
    } else {
        const phatExp = Math.floor(tuSi.exp * 0.3);
        tuSi.exp = Math.max(0, tuSi.exp - phatExp);
        saveTuTienData();

        return await interaction.editReply({ content: `⚡ **ĐỘT PHÁ THẤT BẠI!** Thiên lôi đánh tan hộ thể trận pháp, tu vi nghịch chuyển tổn hao mất **${phatExp} EXP**. May mắn giữ được tính mạng! Tỷ lệ thành công: ${tileThanhCong.toFixed(1)}%` }).catch(() => {});
    }
}

// ─── 6. XỬ LÝ CƯỚP ĐOẠT LINH THẠCH ───
async function handleCuopPha(interaction, tuSi, bayGio) {
    const cooldown = 10 * 60 * 1000; 
    if (tuSi.lastCuopTime && bayGio - tuSi.lastCuopTime < cooldown) {
        const conLai = Math.ceil((cooldown - (bayGio - tuSi.lastCuopTime)) / 1000);
        return await interaction.editReply({ content: `⚔️ Sát khí quá nặng dễ tẩu hỏa nhập ma! Nghỉ ngơi thanh tẩy tâm trí trong ${conLai} giây.` }).catch(() => {});
    }

    tuSi.lastCuopTime = bayGio;
    const xucXac = Math.random() * 100;

    if (xucXac < 45) { 
        const thuHoach = Math.floor(Math.random() * 61) + 40; 
        tuSi.linhThach += thuHoach;
        saveTuTienData();
        return await interaction.editReply({ content: `⚔️ Đạo hữu hóa thân thành hắc y nhân, đột kích mỏ linh thạch của tông môn nhỏ lẻ, cướp thành công **${thuHoach}** Linh Thạch!` }).catch(() => {});
    } else { 
        const phat = Math.min(tuSi.linhThach, Math.floor(Math.random() * 31) + 20); 
        tuSi.linhThach -= phat;
        saveTuTienData();
        return await interaction.editReply({ content: `💀 **XUI XẺO!** Đụng độ ngay Trưởng lão Hộ pháp ẩn cư tuần tra, đạo hữu bị đánh bầm dập và phải bồi thường **${phat}** Linh Thạch để thoát thân!` }).catch(() => {});
    }
}

// ─── 7. XỬ LÝ KHÁNG CHIẾN BOSS CỔ MA ───
async function handleBossTheGioi(interaction, tuSi, hienTai, bayGio) {
    if (global.bossTheGioi.isDead) {
        return await interaction.editReply({ content: `👹 Cổ ma **${global.bossTheGioi.name}** hiện đã bị tiêu diệt! Hãy chờ các vị đại năng hồi sinh ma đầu.` }).catch(() => {});
    }

    const cooldown = 2 * 60 * 1000; 
    if (tuSi.lastBossTime && bayGio - tuSi.lastBossTime < cooldown) {
        const conLai = Math.ceil((cooldown - (bayGio - tuSi.lastBossTime)) / 1000);
        return await interaction.editReply({ content: `👹 Pháp lực cạn kiệt sau khi đấu ma! Đợi ${conLai} giây để hồi khí.` }).catch(() => {});
    }

    tuSi.lastBossTime = bayGio;
    const damage = Math.floor(Math.random() * 51) + 50; 
    global.bossTheGioi.hp -= damage;

    let phanThuong = Math.floor(damage * 0.8); 
    tuSi.linhThach += phanThuong;

    let textRes = `👹 Đạo hữu thi triển pháp bảo chém lên **${global.bossTheGioi.name}** gây **${damage}** sát thương, nhận được **${phanThuong}** Linh Thạch!\n🩸 Máu Boss còn lại: **${Math.max(0, global.bossTheGioi.hp)} / ${global.bossTheGioi.maxHp}**`;

    if (global.bossTheGioi.hp <= 0) {
        global.bossTheGioi.isDead = true;
        tuSi.linhThach += 300; 
        textRes += `\n\n🎉 **KẾT LIỄU!** Đạo hữu xuất sắc giáng đòn chí mạng tiễn Ma Vương về cõi hư vô! Thiên hạ thái bình, nhận thêm **300 Linh Thạch** thần bí công đức!`;
        
        setTimeout(() => {
            global.bossTheGioi.hp = global.bossTheGioi.maxHp;
            global.bossTheGioi.isDead = false;
        }, 60 * 60 * 1000);
    }

    saveTuTienData();
    return await interaction.editReply({ content: textRes }).catch(() => {});
}

// ─── 8. XỬ LÝ SONG TU ĐẠI PHÁ (SẠCH SẼ WARNING) ───
async function handleSongTu(interaction, tuSi, bayGio) {
    const cooldown = 15 * 60 * 1000; 
    if (tuSi.lastSongTuTime && bayGio - tuSi.lastSongTuTime < cooldown) {
        const conLai = Math.ceil((cooldown - (bayGio - tuSi.lastSongTuTime)) / 1000);
        return await interaction.reply({ content: `💞 Nguyên dương / Nguyên âm chưa hồi phục đầy đủ! Hãy đợi thêm ${conLai} giây.`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }

    // Tạo nút bấm cho các đạo hữu khác trong server tham gia kết duyên
    const rowSongTu = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`tt_accept_songtu_${interaction.user.id}`) // Định danh ID người mời để lọc luồng
            .setLabel('💞 Đồng Ý Song Tu')
            .setStyle(ButtonStyle.Success)
    );

    // Phát lệnh mời công khai ra ngoài kênh chat (Chuẩn mới: Bỏ fetchReply bên trong options)
    await interaction.reply({ 
        content: `💞 **${interaction.user.username}** đang vận chuyển âm dương nhị khí, phát động lời mời rủ đạo hữu khác cùng tiến hành **Song Tu Đại Pháp** để gia tăng tu vi chớp nhoáng!`,
        components: [rowSongTu]
    }).catch(() => {});

    // Lấy thông tin tin nhắn bằng hàm độc lập theo chuẩn khuyến nghị mới
    const msg = await interaction.fetchReply().catch(() => {});
    if (!msg) return;

    // Thiết lập bộ lọc sự kiện: Chỉ chấp nhận người khác bấm nút (không tự bấm nút của chính mình)
    const filter = i => i.customId === `tt_accept_songtu_${interaction.user.id}` && i.user.id !== interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (i) => {
        const partnerUser = i.user;
        const partnerTuSi = getTuSi(partnerUser.id, partnerUser.username);
        
        // Cập nhật mốc thời gian cooldown
        const bayGioHienTai = Date.now();
        tuSi.lastSongTuTime = bayGioHienTai;
        partnerTuSi.lastSongTuTime = bayGioHienTai;

        const expThuHoach = 150;
        tuSi.exp += expThuHoach;
        partnerTuSi.exp += expThuHoach;
        saveTuTienData();

        // Cập nhật lại tin nhắn ban đầu: Chúc mừng thành công và ẩn nút bấm đi
        await i.update({ 
            content: `✨ **SONG TU THÀNH CÔNG!** **${interaction.user.username}** và **${partnerUser.username}** tâm linh tương thông, âm dương hòa hợp, cả hai cùng bứt phá nhận thêm **${expThuHoach} Tu Vi**!`, 
            components: [] 
        }).catch(() => {});
    });

    collector.on('end', async (collected) => {
        // Hết 30 giây mà cô đơn không ai bấm nút -> Tự động thu hồi nút và báo thất bại
        if (collected.size === 0) {
            await interaction.editReply({ 
                content: `🍃 Lời mời Song Tu của **${interaction.user.username}** đã trôi qua 30 giây mà không có ai thèm đoái hoài phản hồi, kết thúc trong cô quạnh...`, 
                components: [] 
            }).catch(() => {});
        }
    });
}

async function handleCoDuyenDecision(interaction, tuSi) {
    saveTuTienData();
    return await interaction.editReply({ content: `✅ Hệ thống vận mệnh ghi nhận lựa chọn!`, embeds: [], components: [] }).catch(() => {});
}

module.exports = {
    sendTuTienMainMenu,
    handleTuTienInteraction
};