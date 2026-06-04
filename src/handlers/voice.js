// src/handlers/voice.js

/**
 * Xử lý sự kiện thông báo khi thành viên ra/vào phòng thoại (Voice Channel)
 * @param {import('discord.js').VoiceState} oldState 
 * @param {import('discord.js').VoiceState} newState 
 */
async function handleVoiceStateUpdate(oldState, newState) {
    const member = newState.member;
    // Bỏ qua nếu không tìm thấy member hoặc member là Bot
    if (!member || member.user.bot) return;

    // Trường hợp 1: Người dùng VÀO phòng voice (Hoặc chuyển từ phòng khác sang phòng này)
    if (newState.channelId && oldState.channelId !== newState.channelId) {
        const voiceChannel = newState.channel;
        if (voiceChannel && voiceChannel.viewable) {
            await voiceChannel.send({
                content: `<@${member.id}> vừa tham gia vào channel.\nDùng \`/voice-notify off\``
            }).catch(() => {});
        }
    } 
    
    // Trường hợp 2: Người dùng RỜI phòng voice (Ngắt kết nối hoàn toàn khỏi hệ thống voice)
    else if (oldState.channelId && !newState.channelId) {
        const voiceChannel = oldState.channel;
        if (voiceChannel && voiceChannel.viewable) {
            await voiceChannel.send({
                content: `<@${member.id}> vừa rời khỏi channel.\nDùng \`/voice-notify off\``
            }).catch(() => {});
        }
    }
}

module.exports = { handleVoiceStateUpdate };