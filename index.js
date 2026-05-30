require('dotenv').config();
const express = require('express'); // Tích hợp Express làm Web Server cho Render
const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField, 
    EmbedBuilder,
    Events,          
    MessageFlags     
} = require('discord.js');

// ==================== 1. KHỞI TẠO WEB SERVER (CHO RENDER.COM) ====================
const app = express();
const PORT = process.env.PORT || 3000;

// Tạo một endpoint "/" để Render ping kiểm tra tình trạng bot (Health Check)
app.get('/', (req, res) => {
    res.send('🤖 Bot Discord của bạn đang chạy online 24/7 trên Render!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web Server đang lắng nghe tại port: ${PORT}`);
});

// ==================== 2. CẤU HÌNH VÀ KHỞI TẠO DISCORD BOT ====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers 
    ]
});

const TOKEN = process.env.TOKEN; 
const CATEGORY_ID = process.env.CATEGORY_ID; 
const ADMIN_ID = process.env.ADMIN_ID; 
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const RULES_CHANNEL_ID = process.env.RULES_CHANNEL_ID;
const TICKET_CHANNEL_ID = process.env.TICKET_CHANNEL_ID;
const MINIGAME_CHANNEL_ID = process.env.MINIGAME_CHANNEL_ID; 
const START_ROLE_ID = process.env.START_ROLE_ID;             

// QUẢN LÝ MINIGAME TIẾNG ANH BẰNG MAP
const activeGames = new Map();

client.once(Events.ClientReady, (readyClient) => {
    console.log(`🤖 Bot đã sẵn sàng! Đăng nhập thành công dưới tên: ${readyClient.user.tag}`);
});

// ==================== 3. TÍNH NĂNG: WELCOME & AUTO-ROLE ====================
client.on('guildMemberAdd', async (member) => {
    if (START_ROLE_ID) {
        const roleToAssign = member.guild.roles.cache.get(START_ROLE_ID);
        if (roleToAssign) {
            await member.roles.add(roleToAssign)
                .then(() => console.log(`✅ Đã tự động cấp role ${roleToAssign.name} cho thành viên ${member.user.tag}`))
                .catch(err => console.error(`❌ Lỗi không thể cấp role cho người mới:`, err));
        }
    }

    const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!welcomeChannel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🎉 CHÀO MỪNG THÀNH VIÊN MỚI! 🎉`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
            `Chào mừng ${member} đã gia nhập vào đại gia đình server của chúng ta!\n\n` +
            `📌 Hãy chắc chắn rằng bạn đã đọc kỹ luật tại: <#${RULES_CHANNEL_ID}>\n` +
            `🎫 Nếu cần hỗ trợ hoặc có thắc mắc, hãy mở một ticket tại: <#${TICKET_CHANNEL_ID}>`
        )
        .setTimestamp();

    await welcomeChannel.send({ embeds: [welcomeEmbed] }).catch(console.error);
});

// ==================== 4. TÍNH NĂNG: LỆNH CHAT & MINIGAME ====================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return; 

    // [LỆNH 1]: SETUP TICKET
    if (message.content === '!setup-ticket') {
        const embed = new EmbedBuilder()
            .setTitle('🎫 HỆ THỐNG HỖ TRỢ')
            .setDescription('Nếu bạn cần hỗ trợ hoặc gặp sự cố, hãy bấm vào nút bên dưới để nhận sự trợ giúp từ Admin!')
            .setColor(0x0099FF);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('📩 Mở Ticket')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] }).catch(console.error);
        return;
    }

    // [LỆNH 2]: TẮT BOT KHẨN CẤP
    if (message.content === '!stop-bot') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ MÀY ĐÉO ĐỦ TUỔI ĐUỔI TAO!').catch(console.error);
        }
        await message.channel.send('🤖 Mày tày rồi, tao đi ngủ đây...').catch(console.error);
        client.destroy();
        process.exit();
    }

    // [LỆNH 3]: XÓA TIN NHẮN (TÍCH HỢP CẢ !clear [SỐ] VÀ !clear-all)
    if (message.content.startsWith('!clear')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không có quyền `Quản lý tin nhắn` để dùng lệnh này!').catch(console.error);
        }

        let amount = 0;
        if (message.content === '!clear-all') {
            amount = 100; 
        } else if (message.content.startsWith('!clear ')) {
            const args = message.content.split(' ');
            amount = parseInt(args[1]);
        } else {
            return message.reply('❌ Sai cú pháp! Vui lòng dùng `!clear [số từ 1-100]` hoặc `!clear-all`.').catch(console.error);
        }

        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply('❌ Vui lòng nhập số lượng tin nhắn cần xóa từ 1 đến 100!').catch(console.error);
        }

        try {
            await message.delete().catch(() => {});
            const deletedMessages = await message.channel.bulkDelete(amount, true);
            const successMsg = message.content === '!clear-all' 
                ? `✅ Đã dọn dẹp sạch kênh (Xóa nhanh **${deletedMessages.size}** tin nhắn gần đây)!`
                : `✅ Đã xóa thành công **${deletedMessages.size}** tin nhắn!`;

            const successReply = await message.channel.send(successMsg);
            setTimeout(() => successReply.delete().catch(() => {}), 3000);
        } catch (error) {
            console.error('Lỗi khi xóa tin nhắn:', error);
            message.channel.send('❌ Có lỗi xảy ra khi dọn dẹp kênh! (Tin nhắn quá 14 ngày tuổi không thể xóa hàng loạt).').catch(console.error);
        }
        return;
    }

    // [LỆNH MODERATION 1]: BAN (CẤM THÀNH VIÊN) - Cú pháp: !ban @user Lý do
    if (message.content.startsWith('!ban ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers) && message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không có quyền `Cấm thành viên` để sử dụng lệnh này!').catch(console.error);
        }

        const targetMember = message.mentions.members.first();
        if (!targetMember) return message.reply('❌ Vui lòng tag (mention) người bạn muốn ban! (Ví dụ: `!ban @user spam`)').catch(console.error);
        if (!targetMember.bannable) return message.reply('❌ Không thể ban người này! (Họ có quyền cao hơn Bot hoặc Bot thiếu quyền)').catch(console.error);

        const args = message.content.split(' ');
        const reason = args.slice(2).join(' ') || 'Không có lý do được cung cấp.';

        try {
            await targetMember.ban({ reason: `${reason} | Kích hoạt bởi Admin: ${message.author.tag}` });
            await message.channel.send(`🔨 Đã cấm thành viên **${targetMember.user.tag}** khỏi server!\n**Lý do:** ${reason}`).catch(console.error);
        } catch (error) {
            console.error(error);
            message.reply('❌ Đã xảy ra lỗi trong quá trình thực thi lệnh ban.').catch(console.error);
        }
        return;
    }

    // [LỆNH MODERATION 2]: MUTE/TIMEOUT (CẤM CHAT TẠM THỜI) - Cú pháp: !mute @user [số phút] [Lý do]
    if (message.content.startsWith('!mute ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) && message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không có quyền `Quản lý thành viên (Moderate Members)` để dùng lệnh này!').catch(console.error);
        }

        const args = message.content.split(' ');
        const targetMember = message.mentions.members.first();
        if (!targetMember) return message.reply('❌ Vui lòng tag người muốn mute! (Ví dụ: `!mute @user 10 vi_pham`)').catch(console.error);
        
        const durationInput = parseInt(args[2]);
        if (isNaN(durationInput) || durationInput <= 0) {
            return message.reply('❌ Vui lòng nhập số phút hợp lệ! (Ví dụ để mute 10 phút: `!mute @user 10`)').catch(console.error);
        }

        const reason = args.slice(3).join(' ') || 'Không có lý do được cung cấp.';
        const durationMs = durationInput * 60 * 1000; // Đổi sang mili-giây

        try {
            await targetMember.timeout(durationMs, `${reason} | Thực hiện bởi: ${message.author.tag}`);
            await message.channel.send(`🔇 Đã cấm chat (Timeout) thành viên **${targetMember.user.tag}** trong vòng **${durationInput} phút**!\n**Lý do:** ${reason}`).catch(console.error);
        } catch (error) {
            console.error(error);
            message.reply('❌ Không thể gỡ gạc hay áp đặt mute cho người này! Kiểm tra phân cấp quyền hoặc quyền hạn Bot.').catch(console.error);
        }
        return;
    }

    // [LỆNH MODERATION 3]: UNMUTE (GỠ CẤM CHAT) - Cú pháp: !unmute @user
    if (message.content.startsWith('!unmute ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) && message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không có quyền để dùng lệnh này!').catch(console.error);
        }

        const targetMember = message.mentions.members.first();
        if (!targetMember) return message.reply('❌ Vui lòng tag người muốn gỡ mute!').catch(console.error);

        try {
            await targetMember.timeout(null); // Truyền null để xóa hoàn toàn timeout cũ
            await message.channel.send(`🔊 Đã gỡ cấm chat thành công cho thành viên **${targetMember.user.tag}**!`).catch(console.error);
        } catch (error) {
            console.error(error);
            message.reply('❌ Không thể mở khóa chat cho người này.').catch(console.error);
        }
        return;
    }

    // ==================== KIỂM TRA CHỈ ĐỊNH KÊNH CHƠI GAME ====================
    const isGameCommand = message.content === '!play' || message.content === '!stop-game';
    const isChannelPlaying = activeGames.has(message.channel.id);

    if (isGameCommand || isChannelPlaying) {
        if (message.channel.id !== MINIGAME_CHANNEL_ID) {
            if (isGameCommand) {
                const reply = await message.reply(`❌ Trò chơi này chỉ được chơi tại kênh <#${MINIGAME_CHANNEL_ID}> thôi bạn nhé!`);
                setTimeout(() => {
                    if (message.deletable) message.delete().catch(() => {});
                    reply.delete().catch(() => {});
                }, 4000);
            }
            return;
        }
    }

    // [LỆNH 4]: BẬT MINIGAME NỐI TỪ TIẾNG ANH
    if (message.content === '!play') {
        if (activeGames.has(message.channel.id)) {
            return message.reply('🎮 Kênh này đang có một trận đấu đang diễn ra rồi!').catch(console.error);
        }

        const startingWordsPool = [
            "apple", "banana", "computer", "database", "elephant", 
            "football", "guitar", "hospital", "internet", "jacket", 
            "kangaroo", "lemon", "monkey", "notebook", "orange", 
            "penguin", "queen", "rabbit", "shadow", "telephone", 
            "umbrella", "volcano", "window", "xylophone", "yellow", 
            "zebra", "nature", "history", "future", "galaxy"
        ];

        const startWord = startingWordsPool[Math.floor(Math.random() * startingWordsPool.length)];
        
        const timeoutId = setTimeout(async () => {
            if (activeGames.has(message.channel.id)) {
                activeGames.delete(message.channel.id);
                await message.channel.send('⏰ **Trò chơi kết thúc tự động** do không có ai nối từ trong vòng 5 phút!').catch(console.error);
            }
        }, 5 * 60 * 1000);

        activeGames.set(message.channel.id, {
            lastWord: startWord,
            lastPlayerId: null,
            usedWords: new Set([startWord]),
            timeoutId: timeoutId
        });

        const gameEmbed = new EmbedBuilder()
            .setTitle('🎮 MINIGAME NỐI TỪ TIẾNG ANH (ENGLISH WORD-CHAIN) 🎮')
            .setDescription(
                `Trò chơi đã bắt đầu tại kênh này!\n` +
                `Từ khởi đầu ngẫu nhiên của Bot là: **${startWord.toUpperCase()}**\n\n` +
                `👉 Người tiếp theo hãy gõ một từ tiếng Anh bắt đầu bằng chữ **"${startWord.slice(-1).toUpperCase()}"** (chữ cái cuối cùng).\n` +
                `❌ Gõ \`!stop-game\` để kết thúc.`
            )
            .setColor(0x00FF00);

        await message.channel.send({ embeds: [gameEmbed] }).catch(console.error);
        return;
    }

    // [LỆNH 5]: TẮT MINIGAME NỐI TỪ
    if (message.content === '!stop-game') {
        const gameState = activeGames.get(message.channel.id);
        if (!gameState) return;

        clearTimeout(gameState.timeoutId);
        activeGames.delete(message.channel.id);

        await message.channel.send('🛑 **Minigame Nối Từ đã được đóng!** Cảm ơn mọi người đã tham gia.').catch(console.error);
        return;
    }

    // ==================== LOGIC XỬ LÝ CHƠI GAME TIẾNG ANH ====================
    const gameState = activeGames.get(message.channel.id);
    if (gameState && !message.content.startsWith('!')) {
        
        const cleanContent = message.content.trim().toLowerCase();

        const handleViolation = async (errorText) => {
            try {
                if (message.deletable) await message.delete().catch(() => {});
                const reply = await message.channel.send(`${message.author} ${errorText}`);
                setTimeout(() => reply.delete().catch(() => {}), 4000);
            } catch (err) { console.error("Lỗi thực thi lệnh phạt:", err); }
        };

        if (!/^[a-z]+$/.test(cleanContent)) {
            return handleViolation('❌ Vui lòng nhập đúng một từ đơn tiếng Anh hợp lệ! (Chỉ chứa chữ cái, không dấu, không cách)');
        }
        if (message.author.id === gameState.lastPlayerId) {
            return handleViolation('❌ Bạn không được nối từ 2 lần liên tiếp, hãy đợi người khác!');
        }
        if (gameState.usedWords.has(cleanContent)) {
            return handleViolation(`❌ Từ **"${cleanContent.toUpperCase()}"** đã được dùng trong lượt chơi này rồi!`);
        }

        const expectedLetter = gameState.lastWord.slice(-1); 
        if (cleanContent.charAt(0) !== expectedLetter) {
            return handleViolation(`❌ Sai luật! Bạn phải nhập từ bắt đầu bằng chữ cái **"${expectedLetter.toUpperCase()}"**.`);
        }

        clearTimeout(gameState.timeoutId); 
        
        const newTimeoutId = setTimeout(async () => {
            if (activeGames.has(message.channel.id)) {
                activeGames.delete(message.channel.id);
                await message.channel.send('⏰ **Trò chơi kết thúc tự động** do không có ai nối từ trong vòng 5 phút!').catch(console.error);
            }
        }, 5 * 60 * 1000);

        gameState.lastWord = cleanContent;
        gameState.lastPlayerId = message.author.id;
        gameState.usedWords.add(cleanContent);
        gameState.timeoutId = newTimeoutId;

        await message.react('✅').catch(() => {});
        
        const nextLetter = cleanContent.slice(-1).toUpperCase();
        await message.channel.send(`👉 Từ tiếp theo phải bắt đầu bằng chữ cái: **${nextLetter}**`).catch(console.error);
    }
});

// ==================== 5. TÍNH NĂNG: XỬ LÝ TICKET BUTTON ====================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'create_ticket') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const channelName = `ticket-${interaction.user.username}`;
        
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone, 
                    deny: [PermissionsBitField.Flags.ViewChannel], 
                },
                {
                    id: interaction.user.id, 
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks], 
                },
                {
                    id: interaction.guild.ownerId, 
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                }
            ],
        }).catch(async (err) => {
            console.error(err);
            await interaction.editReply({ content: '❌ Không thể tạo kênh ticket. Vui lòng kiểm tra lại quyền hạn của Bot!', flags: [MessageFlags.Ephemeral] });
        });

        if (!ticketChannel) return;

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('Chào bạn!')
            .setDescription(`Chào mừng ${interaction.user} đến với kênh hỗ trợ. Đội ngũ Ban quản trị sẽ phản hồi bạn sớm nhất có thể.\n\nBấm nút dưới đây để đóng ticket này lại.`)
            .setColor(0x00FF00);

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('🔒 Đóng Ticket')
                .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `${interaction.user} Đã mở ticket thành công!`, embeds: [welcomeEmbed], components: [closeRow] }).catch(console.error);
        await interaction.editReply({ content: `Đã tạo kênh hỗ trợ cho bạn: ${ticketChannel}`, flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === 'close_ticket') {
        await interaction.reply('Hệ thống sẽ xóa kênh ticket này sau 5 giây...').catch(console.error);
        setTimeout(() => {
            interaction.channel.delete().catch(err => console.log("Lỗi xóa kênh hoặc kênh đã bị xóa trước:", err));
        }, 5000);
    }
});

client.login(TOKEN);