const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { getTopChat } = require('./counter.js');

function roundRect(ctx, x, y, width, height, radius) {
    if (typeof radius === 'number') { radius = { tl: radius, tr: radius, br: radius, bl: radius }; }
    else { radius = { tl: radius.tl || 0, tr: radius.tr || 0, br: radius.br || 0, bl: radius.tr || 0 }; }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
}

async function handleTopChatImageCommand(message) {
    try {
        await message.channel.sendTyping();
        const topUsers = getTopChat(4); 

        if (topUsers.length === 0) {
            return message.reply("📊 Hiện tại chưa có dữ liệu thành viên tương tác!");
        }

        const canvas = createCanvas(980, 580);
        const ctx = canvas.getContext('2d');

        // =========================================================
        // 1. LỚP NỀN KHÔNG GIAN SÂU (DEEP SPACE BACKGROUND)
        // =========================================================
        let bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bgGrad.addColorStop(0, '#02040a');
        bgGrad.addColorStop(0.5, '#050a18');
        bgGrad.addColorStop(1, '#020511');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // =========================================================
        // 2. HẠT SÁNG NEON HOÀNG GIA (GLOW PARTICLES) - ĐÃ KÍCH SÁNG
        // =========================================================
        const particlePositions = [
            { x: 100, y: 120, r: 120, color: 'rgba(0, 242, 254, 0.12)' },
            { x: 880, y: 130, r: 140, color: 'rgba(0, 82, 212, 0.15)' },
            { x: 490, y: 350, r: 200, color: 'rgba(0, 110, 255, 0.1)' },
            { x: 250, y: 480, r: 130, color: 'rgba(0, 242, 254, 0.08)' },
            { x: 900, y: 500, r: 110, color: 'rgba(127, 0, 255, 0.1)' }
        ];
        
        particlePositions.forEach(p => {
            let pGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
            pGlow.addColorStop(0, p.color);
            pGlow.addColorStop(0.6, 'rgba(0, 110, 255, 0.02)');
            pGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = pGlow;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        });

        // =========================================================
        // 3. LƯỚI MA TRẬN PHÁT QUANG (NEON CYBER GRID) - HIỆN RÕ HƠN
        // =========================================================
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.08)'; 
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Tạo thêm hiệu ứng sọc quét ngang nhẹ (Scanlines) chuyên nghiệp
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.lineWidth = 1;
        for (let y = 0; y < canvas.height; y += 5) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // =========================================================
        // KHUNG VIỀN NEON LỚN PHÁT SÁNG ĐA SẮC ĐẬM ĐÀ
        // =========================================================
        ctx.save();
        let borderGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        borderGradient.addColorStop(0, '#00f2fe'); 
        borderGradient.addColorStop(0.5, '#4facfe'); 
        borderGradient.addColorStop(1, '#0052d4'); 

        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 5;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 18; 
        roundRect(ctx, 15, 10, 950, 555, 18);
        ctx.stroke();
        ctx.restore();

        // ĐỊNH DẠNG MÀU VIỀN PHỤ CHO CÁC CARD TRONG SUỐT
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)'; // Viền card ánh xanh cyan
        ctx.lineWidth = 1.5;

        // LỚP NỀN TRONG SUỐT CHO CARD (GLASSMORPHISM EFFECT)
        const cardBgColor = 'rgba(10, 14, 26, 0.55)'; // Hạ độ mờ để lộ rõ lưới rực rỡ phía sau

        // HEADER TIÊU ĐỀ
        ctx.fillStyle = 'rgba(12, 17, 34, 0.75)';
        roundRect(ctx, 35, 25, 910, 70, 12); ctx.fill();
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)'; ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.fillText('📊 STATS OVERVIEW & LEADERBOARD (30 DAYS)', 65, 67);

        const totalMessages = topUsers.reduce((sum, u) => sum + u.messages, 0);
        const totalVoice = topUsers.reduce((sum, u) => sum + parseFloat(u.voiceHours), 0).toFixed(1);

        // --- CÁC KHỐI THẺ TIỆN ÍCH GIỮA (Đã được làm trong suốt) ---
        // Thẻ Messages
        ctx.fillStyle = cardBgColor;
        roundRect(ctx, 35, 115, 290, 155, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#00f2fe'; ctx.font = 'bold 13px Arial';
        ctx.fillText('MESSAGES (THÁNG)', 55, 145);
        
        ctx.fillStyle = 'rgba(4, 6, 12, 0.7)';
        roundRect(ctx, 55, 165, 250, 85, 8); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Arial';
        ctx.fillText('30d Total:', 70, 198);
        ctx.fillStyle = '#00f2fe'; ctx.font = 'bold 20px Arial';
        ctx.fillText(`${totalMessages} m`, 155, 200);

        // Thẻ Voice Activity
        ctx.fillStyle = cardBgColor;
        roundRect(ctx, 345, 115, 290, 155, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4facfe'; ctx.font = 'bold 13px Arial';
        ctx.fillText('VOICE ACTIVITY (THÁNG)', 365, 145);

        ctx.fillStyle = 'rgba(4, 6, 12, 0.7)';
        roundRect(ctx, 365, 165, 250, 85, 8); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Arial';
        ctx.fillText('30d Voice:', 385, 198);
        ctx.fillStyle = '#4facfe'; ctx.font = 'bold 20px Arial';
        ctx.fillText(`${totalVoice} hrs`, 470, 200);

        // Thẻ Champion
        ctx.fillStyle = cardBgColor;
        roundRect(ctx, 655, 115, 290, 155, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f5c400'; ctx.font = 'bold 13px Arial';
        ctx.fillText('👑 MONTHLY CHAMPION', 675, 145);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Arial';
        const top1Name = topUsers[0].username.length > 14 ? topUsers[0].username.substring(0, 14) + '...' : topUsers[0].username;
        ctx.fillText(top1Name, 675, 202);

        // --- CHARTS BIỂU ĐỒ SÓNG TRONG SUỐT ---
        ctx.fillStyle = cardBgColor;
        roundRect(ctx, 35, 290, 440, 255, 14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#00f2fe'; ctx.font = 'bold 13px Arial';
        ctx.fillText('CHARTS (XU HƯỚNG TƯƠNG TÁC 30 NGÀY)', 60, 323);

        const chartX = 65, chartY = 345, chartW = 380, chartH = 175;
        ctx.fillStyle = 'rgba(4, 6, 12, 0.7)';
        roundRect(ctx, chartX, chartY, chartW, chartH, 8); ctx.fill();

        const chartPoints = topUsers[0].chartData; 
        const maxVal = Math.max(...chartPoints, 5);

        ctx.save();
        ctx.strokeStyle = '#00f2fe'; ctx.lineWidth = 3.5;
        ctx.shadowColor = '#00f2fe'; ctx.shadowBlur = 12; 
        ctx.beginPath();
        
        let polyPoints = [];
        for (let i = 0; i < chartPoints.length; i++) {
            const stepX = chartX + (i * (chartW / (chartPoints.length - 1)));
            const stepY = (chartY + chartH) - ((chartPoints[i] / maxVal) * (chartH - 45)) - 15;
            polyPoints.push({x: stepX, y: stepY});
            if (i === 0) ctx.moveTo(stepX, stepY);
            else ctx.lineTo(stepX, stepY);
        }
        ctx.stroke();
        ctx.restore();

        if (polyPoints.length > 0) {
            let chartGlowBg = ctx.createLinearGradient(chartX, chartY, chartX, chartY + chartH);
            chartGlowBg.addColorStop(0, 'rgba(0, 242, 254, 0.25)');
            chartGlowBg.addColorStop(1, 'rgba(0, 242, 254, 0)');
            ctx.fillStyle = chartGlowBg;
            ctx.lineTo(polyPoints[polyPoints.length - 1].x, chartY + chartH);
            ctx.lineTo(polyPoints[0].x, chartY + chartH);
            ctx.closePath(); ctx.fill();
        }

        // --- DANH SÁCH LEADERBOARD TRONG SUỐT XUYÊN THẤU ---
        ctx.fillStyle = cardBgColor;
        roundRect(ctx, 495, 290, 450, 255, 14); ctx.fill(); ctx.stroke();

        let rowY = 305;
        for (let i = 0; i < topUsers.length; i++) {
            const user = topUsers[i];
            ctx.fillStyle = 'rgba(4, 6, 12, 0.6)';
            roundRect(ctx, 510, rowY, 420, 50, 8); ctx.fill();
            ctx.strokeStyle = 'rgba(0, 242, 254, 0.12)'; ctx.stroke();

            let rankColor = i === 0 ? '#f5c400' : i === 1 ? '#00f2fe' : i === 2 ? '#4facfe' : '#72767d';
            ctx.fillStyle = rankColor; ctx.font = 'bold 14px Arial';
            ctx.fillText(`#${i + 1}`, 530, rowY + 30);

            // AVATAR
            try {
                const memberObj = await message.guild.members.fetch(user.id).catch(() => null);
                const userAvatarUrl = memberObj ? memberObj.user.displayAvatarURL({ extension: 'png', size: 128 }) : message.client.user.displayAvatarURL({ extension: 'png' });
                const avtImg = await loadImage(userAvatarUrl);

                ctx.save();
                ctx.beginPath(); ctx.arc(575, rowY + 25, 16, 0, Math.PI * 2, true); ctx.closePath(); ctx.clip();
                ctx.drawImage(avtImg, 559, rowY + 9, 32, 32);
                ctx.restore();
            } catch (e) {
                ctx.fillStyle = '#202636';
                ctx.beginPath(); ctx.arc(575, rowY + 25, 16, 0, Math.PI * 2); ctx.fill();
            }

            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px Arial';
            const shortName = user.username.length > 12 ? user.username.substring(0, 12) + '...' : user.username;
            ctx.fillText(shortName, 605, rowY + 30);

            ctx.fillStyle = '#00f2fe'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'right';
            ctx.fillText(`${user.messages} m`, 845, rowY + 30);
            ctx.fillStyle = '#4facfe';
            ctx.fillText(`${user.voiceHours}h v`, 915, rowY + 30);
            ctx.textAlign = 'left';

            rowY += 56;
        }

        ctx.fillStyle = '#535763'; ctx.font = 'italic 11px Arial';
        ctx.fillText('Powered by Wind Bot — ĐÀN BÒ BIẾT BAY', 735, 560);

        const buffer = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buffer, { name: 'topchat-cyber-matrix-glow.png' });

        await message.channel.send({
            content: `📊 **Báo cáo phân tích dữ liệu hoạt động 30 ngày (Cyber Neon Glass Edition):**`,
            files: [attachment]
        });

    } catch (error) {
        console.error('❌ Lỗi xử lý đồ họa ma trận:', error);
        await message.reply('Gặp sự cố đồ họa khi tối ưu hóa nền ma trận rực rỡ!');
    }
}

module.exports = { handleTopChatImageCommand };