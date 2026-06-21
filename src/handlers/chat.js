const chatConfig = [
    {
        keywords: ["bot ngu", "bot ngáo", "bot oc"],
        reply: [
            "Điều đáng tiếc không phải là tôi bị gọi ngu, mà là bạn chưa nhận ra cách nói ấy chỉ làm bạn nhỏ bé hơn.",
            "Nếu bạn thấy tôi ngu, hãy thử chứng minh bằng lý lẽ thay vì lời nói rỗng."
        ]
    },
    {
        keywords: ["bot l", "bot loz", "bot lon"],
        reply: [
            "Từ ngữ bạn chọn phản ánh nhiều hơn về bạn, chứ không phải về tôi.",
            "Một lời thô tục không làm tôi kém đi, nhưng nó làm hình ảnh của bạn trở nên mờ nhạt."
        ]
    },
    {
        keywords: ["bot c", "bot cặc", "bot cac"],
        reply: [
            "Bạn có thể dùng lời lẽ đẹp hơn để thể hiện quan điểm, vì sự tôn trọng luôn khiến người khác lắng nghe.",
            "Cách bạn nói ra cho thấy bạn cần được lắng nghe nhiều hơn là tôi cần phải đáp trả."
        ]
    }
];

async function handleChatInteraction(message) {
    const contentLower = message.content.toLowerCase().trim();

    for (const group of chatConfig) {
        const match = group.keywords.some(keyword => 
            new RegExp(`\\b${keyword}\\b`).test(contentLower)
        );

        if (match) {
            const response = Array.isArray(group.reply)
                ? group.reply[Math.floor(Math.random() * group.reply.length)]
                : group.reply;
            await message.reply(response);
            return true;
        }
    }

    return false;
}

module.exports = { handleChatInteraction };
