const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Đường dẫn trỏ tới file JSON lưu trữ ở thư mục gốc
const dataPath = path.join(__dirname, '../../autorole_data.json');

/**
 * Hàm đọc dữ liệu an toàn từ file JSON
 */
function loadAutoRoleData() {
    try {
        if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(dataPath, JSON.stringify({}), 'utf8');
            return {};
        }
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data || '{}');
    } catch (error) {
        console.error('❌ Lỗi đọc file JSON autorole:', error);
        return {};
    }
}

/**
 * Hàm ghi dữ liệu an toàn vào file JSON
 */
function saveAutoRoleData(data) {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error('❌ Lỗi ghi file JSON autorole:', error);
    }
}

/**
 * Xử lý lệnh !autorole wind bằng cách tạo nút mồi
 */
async function handleAutoRoleCommand(message) {
    if (!message.content.startsWith('!autorole wind')) return false;

    const allowedChannelId = process.env.AUTOROLE_CHANNEL_ID;
    if (message.channel.id !== allowedChannelId) {
        const warning = await message.reply(`❌ Lệnh này chỉ được phép sử dụng tại kênh <#${allowedChannelId}>!`);
        setTimeout(() => warning.delete().catch(() => {}), 5000);
        return true; 
    }

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await message.reply("❌ Bạn cần có quyền Quản trị viên để dùng lệnh này.");
        return true;
    }

    // Xóa lệnh chat gốc để giữ kênh sạch sẽ
    await message.delete().catch(() => {});

    // Tạo nút bấm khởi tạo hội thoại ẩn
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('start_private_autorole')
            .setLabel('⚙️ Bắt đầu cấu hình Autorole (Ẩn)')
            .setStyle(ButtonStyle.Primary)
    );

    const promptMsg = await message.channel.send({
        content: '🌟 Bấm vào nút dưới đây để bắt đầu cài đặt. Quá trình hỏi đáp sẽ diễn ra hoàn toàn riêng tư (chỉ bạn nhìn thấy).',
        components: [row]
    });

    setTimeout(() => promptMsg.delete().catch(() => {}), 60000);
    return true;
}

/**
 * Xử lý hội thoại ẩn tương tác qua lại (Giữ nguyên cách làm cũ)
 */
async function handleAutoRoleInteraction(interaction) {
    if (!interaction.isButton() || interaction.customId !== 'start_private_autorole') return;

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Chỉ Quản trị viên mới được dùng nút này!', ephemeral: true });
    }

    await interaction.reply({ 
        content: "✍️ **[Bước 1/2]** Hãy nhập **Nội dung hiển thị** cho tin nhắn autorole vào kênh này (Đừng lo, chỉ mình bạn thấy tin nhắn phản hồi của bot):", 
        ephemeral: true 
    });

    const filter = m => m.author.id === interaction.user.id;
    const channel = interaction.channel;

    try {
        const collectedContent = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
        const textMsg = collectedContent.first();
        const description = textMsg.content;
        
        await textMsg.delete().catch(() => {});

        await interaction.followUp({
            content: "📌 **[Bước 2/2]** Nhập danh sách **Emoji và Tag Role**. Mỗi cặp một dòng.\n*Ví dụ:*\n🍏 @LOL\n🍎 @Valorant\n👉 Gõ `done` khi hoàn thành.",
            ephemeral: true
        });

        const mapping = {};
        const roleCollector = channel.createMessageCollector({ filter, time: 180000 });

        roleCollector.on('collect', async (m) => {
            await m.delete().catch(() => {});

            if (m.content.trim().toLowerCase() === 'done') {
                roleCollector.stop('finished');
                return;
            }

            const lines = m.content.split('\n');
            let addedCount = 0;

            for (const line of lines) {
                const roleMatch = line.match(/<@&(\d+)>/);
                if (!roleMatch) continue;

                const roleId = roleMatch[1];
                const lineWithoutRole = line.replace(/<@&(\d+)>/, '').trim();
                const customEmojiMatch = lineWithoutRole.match(/(<a?:[a-zA-Z0-9_]+:\d+>)/);
                
                let emoji = null;
                if (customEmojiMatch) {
                    emoji = customEmojiMatch[1];
                } else {
                    const cleanLine = lineWithoutRole.replace(/[:\s]+/g, '').trim();
                    if (cleanLine.length > 0) {
                        emoji = Array.from(cleanLine)[0];
                    }
                }

                if (emoji && roleId) {
                    mapping[emoji] = roleId;
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                await interaction.followUp({ content: `✅ Đã ghi nhận thêm ${addedCount} cặp role. Nhập tiếp hoặc gõ \`done\`.`, ephemeral: true });
            } else {
                await interaction.followUp({ content: `⚠️ Không tìm thấy cặp hợp lệ! Hãy nhớ phải TAG xanh cái role đó lên nha sếp.`, ephemeral: true });
            }
        });

        roleCollector.on('end', async (collected, reason) => {
            await interaction.message.delete().catch(() => {});

            if (reason === 'time') {
                return interaction.followUp({ content: "⏰ Đã hết thời gian nhập danh sách role.", ephemeral: true });
            }

            if (Object.keys(mapping).length === 0) {
                return interaction.followUp({ content: "❌ Không có dữ liệu hợp lệ. Đã hủy cấu hình.", ephemeral: true });
            }

            let embedDescription = "";
            for (const [emoji, roleId] of Object.entries(mapping)) {
                embedDescription += `${emoji} <@&${roleId}>\n`;
            }

            const embed = new EmbedBuilder()
                .setDescription(description)
                .addFields({ name: 'Danh sách Roles:', value: embedDescription })
                .setColor(0x2ecc71); 

            const mainMessage = await channel.send({ embeds: [embed] });

            // 💾 LƯU DỮ LIỆU VÀO FILE JSON KIÊN CỐ
            const currentData = loadAutoRoleData();
            currentData[mainMessage.id] = mapping;
            saveAutoRoleData(currentData);

            await interaction.followUp({ content: "🎉 Hoàn thành! Bảng lấy role đã hiển thị công khai bên dưới và đã lưu vĩnh viễn.", ephemeral: true });

            for (const emoji of Object.keys(mapping)) {
                try {
                    if (emoji.startsWith('<') && emoji.endsWith('>')) {
                        const emojiId = emoji.split(':').pop().replace('>', '');
                        await mainMessage.react(emojiId);
                    } else {
                        await mainMessage.react(emoji);
                    }
                } catch (err) {
                    console.error(`[Autorole] Lỗi thả emoji:`, err.message);
                }
            }
        });

    } catch (error) {
        console.error(error);
        await interaction.followUp({ content: "⏰ Quá thời gian phản hồi cấu hình. Vui lòng thử lại.", ephemeral: true });
    }
}

async function handleAutoRoleReactionAdd(reaction, user) {
    if (user.bot) return;
    if (reaction.partial) { try { await reaction.fetch(); } catch (error) { return; } }

    // 🔄 ĐỌC DỮ LIỆU TỪ FILE JSON THAY VÌ RAM TẠM
    const currentData = loadAutoRoleData();
    const mapping = currentData[reaction.message.id];
    if (!mapping) return;

    const roleId = findRoleId(mapping, reaction.emoji);
    if (roleId) {
        const guild = reaction.message.guild;
        const member = await guild.members.fetch(user.id).catch(() => null);
        const role = guild.roles.cache.get(roleId);
        if (role && member) await member.roles.add(role).catch(() => {});
    }
}

async function handleAutoRoleReactionRemove(reaction, user) {
    if (user.bot) return;
    if (reaction.partial) { try { await reaction.fetch(); } catch (error) { return; } }

    // 🔄 ĐỌC DỮ LIỆU TỪ FILE JSON THAY VÌ RAM TẠM
    const currentData = loadAutoRoleData();
    const mapping = currentData[reaction.message.id];
    if (!mapping) return;

    const roleId = findRoleId(mapping, reaction.emoji);
    if (roleId) {
        const guild = reaction.message.guild;
        const member = await guild.members.fetch(user.id).catch(() => null);
        const role = guild.roles.cache.get(roleId);
        if (role && member) await member.roles.remove(role).catch(() => {});
    }
}

function findRoleId(mapping, crystalEmoji) {
    for (const [key, roleId] of Object.entries(mapping)) {
        if (crystalEmoji.id && key.includes(crystalEmoji.id)) return roleId;
        if (!crystalEmoji.id && key === crystalEmoji.name) return roleId;
    }
    return null;
}

module.exports = {
    handleAutoRoleCommand,
    handleAutoRoleInteraction,
    handleAutoRoleReactionAdd,
    handleAutoRoleReactionRemove
};