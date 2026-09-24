const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../utils/db');
const { author, footer, progressBar, serverBrand, statField } = require('../utils/embedTheme');

const commandData = new SlashCommandBuilder()
    .setName('khihau')
    .setDescription('Xem khí hậu và năng lượng sống của cộng đồng này')
    .setDMPermission(false);

const WEATHER_STATES = [
    { min: 0, icon: '🌙', weather: 'Đêm yên', season: 'Mầm non', color: 0x64748B, text: 'Cộng đồng đang khởi động. Một lời chào của bạn cũng có thể làm nơi này ấm lên.' },
    { min: 15, icon: '🌤️', weather: 'Nắng nhẹ', season: 'Đang nảy mầm', color: 0xF2C879, text: 'Có những cuộc trò chuyện nhỏ đang nối mọi người lại gần nhau.' },
    { min: 60, icon: '☀️', weather: 'Trời trong', season: 'Mùa hội ngộ', color: 0xF59E0B, text: 'Năng lượng cộng đồng đang rất đẹp. Đây là lúc bắt chuyện với một người mới.' },
    { min: 180, icon: '🌈', weather: 'Cầu vồng', season: 'Mùa rực rỡ', color: 0xE879A8, text: 'Server đang sống mạnh. Mỗi tin nhắn là một tia màu trong bức tranh chung.' },
    { min: 500, icon: '🌌', weather: 'Cực quang', season: 'Truyền thuyết', color: 0x6D8AE8, text: 'Đây là một cộng đồng có nhịp tim riêng, và bạn đang góp phần tạo nên nó.' }
];

function getState(messages) {
    return [...WEATHER_STATES].reverse().find(state => messages >= state.min) || WEATHER_STATES[0];
}

function getEnergy(messages) {
    return Math.min(100, Math.round((Math.log10(messages + 1) / Math.log10(501)) * 100));
}

async function handleClimateCommand(source) {
    const guild = source.guild;
    if (!guild) {
        const reply = { content: '❌ Lệnh này chỉ dùng được trong server.', ephemeral: true };
        return source.reply(reply);
    }

    const climate = (await db.get(`climate.${guild.id}`)) || { messages: 0, activeUsers: {}, lastMessageAt: 0 };
    const messages = Number(climate.messages) || 0;
    const activeUsers = Object.entries(climate.activeUsers || {})
        .sort(([, first], [, second]) => second - first)
        .slice(0, 3);
    const state = getState(messages);
    const energy = getEnergy(messages);
    const topNames = activeUsers.length > 0
        ? activeUsers.map(([userId, count], index) => `${index + 1}. <@${userId}> • ${count.toLocaleString()} năng lượng`).join('\n')
        : 'Chưa có dữ liệu. Hãy là người đầu tiên thắp sáng nơi này.';

    const embed = new EmbedBuilder()
        .setColor(state.color)
        .setAuthor(author('BẢN ĐỒ KHÍ HẬU', serverBrand(guild)))
        .setTitle(`${state.icon} ${state.weather} tại ${guild.name}`)
        .setDescription(`**${state.season}**\n${state.text}`)
        .addFields(
            statField('🌡️ Nhiệt độ cộng đồng', `${energy}%\n${progressBar(energy)}`),
            statField('💬 Nhịp trò chuyện', `${messages.toLocaleString()} tin nhắn`),
            { name: '🏅 Người góp năng lượng', value: topNames, inline: false }
        )
        .setFooter(footer('Khí hậu thay đổi theo hoạt động thật của cộng đồng'))
        .setTimestamp();

    if (source.isChatInputCommand?.()) return source.reply({ embeds: [embed] });
    return source.reply({ embeds: [embed] });
}

module.exports = { commandData, handleClimateCommand };
