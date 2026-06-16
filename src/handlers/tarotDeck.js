const tarotDeck = [
    {
        name: "0. The Fool (Chàng Khờ)",
        image: "https://i.pinimg.com/originals/11/4a/1b/114a1b02b54bc36209b5ca1473fbcf9b.jpg",
        upright: {
            general: "🟢 **Tổng quan:** Khởi đầu mới, cơ hội mới, sự tự do và tinh thần lạc quan không sợ hãi.",
            love: "💖 **Về Tình Cảm:** Bạn hoặc đối phương đang chuẩn bị bước vào một giai đoạn yêu đương mới mẻ, tự do, không ràng buộc. Nếu đang độc thân, một mối tình bất ngờ đầy thú vị sắp sửa gõ cửa.",
            work: "💼 **Về Công Việc:** Dấu hiệu của một dự án mới, hướng đi mới hoặc một công việc thử thách hoàn toàn khác biệt. Đừng ngại mạo hiểm, hãy tin vào trực giác của mình!"
        },
        reversed: {
            general: "🔴 **Tổng quan:** Sự liều lĩnh, thiếu cân nhắc, hành động bốc đồng hoặc trì hoãn một khởi đầu mới.",
            love: "💖 **Về Tình Cảm:** Mối quan hệ đang thiếu đi sự cam kết hoặc một trong hai đang quá vô tâm, ích kỷ, hành động thiếu chín chắn gây tổn thương cho người còn lại.",
            work: "💼 **Về Công Việc:** Bạn đang quá vội vã đưa ra quyết định hoặc thiếu sự chuẩn bị kỹ càng. Hãy cẩn trọng với những lời hứa hẹn quá ngọt ngào trong sự nghiệp."
        }
    },
    {
        name: "I. The Magician (Nhà Ảo Thuật)",
        image: "https://i.pinimg.com/originals/e8/3b/bc/e83bbcca621b4b1df8f4f9104085e7ec.jpg",
        upright: {
            general: "🟢 **Tổng quan:** Năng lượng sáng tạo, sức mạnh ý chí, khả năng hiện thực hóa mong muốn và làm chủ tình thế.",
            love: "💖 **Về Tình Cảm:** Một mối quan hệ đầy cuốn hút và có sự thấu hiểu sâu sắc. Bạn có đủ sự tự tin và sức hút để chinh phục hoặc hâm nóng tình cảm với đối phương.",
            work: "💼 **Về Công Việc:** Bạn đang nắm trong tay mọi công cụ và khả năng để thành công. Đây là thời điểm vàng để thực hiện các kế hoạch lớn hoặc thăng tiến vị trí mới."
        },
        reversed: {
            general: "🔴 **Tổng quan:** Sự thao túng, lừa dối, lãng phí tài năng hoặc mất phương hướng.",
            love: "💖 **Về Tình Cảm:** Hãy cẩn thận với những lời nói dối hoặc sự thao túng tâm lý trong tình cảm. Có thể có ai đó đang không hoàn toàn thành thật với bạn.",
            work: "💼 **Về Công Việc:** Tài năng của bạn đang bị sử dụng sai chỗ, hoặc có sự gian lận, chèn ép ngầm nơi công sở. Hãy tỉnh táo rà soát lại các mối quan hệ đồng nghiệp."
        }
    },
    {
        name: "II. The High Priestess (Nữ Tư Tế)",
        image: "https://i.pinimg.com/originals/8e/3c/30/8e3c306d577bc09e0817b966e34ea7eb.jpg",
        upright: {
            general: "🟢 **Tổng quan:** Trực giác nhạy bén, tri thức bí ẩn, sự kiên nhẫn và thế giới nội tâm sâu sắc.",
            love: "💖 **Về Tình Cảm:** Tình cảm thiên về tinh thần nhiều hơn thể xác. Hãy lắng nghe tiếng nói bên trong cơ thể để biết đối phương có thực sự phù hợp với mình hay không.",
            work: "💼 **Về Công Việc:** Thay vì hành động hấp tấp, đây là lúc bạn nên lùi lại quan sát, học hỏi và thu thập thêm thông tin. Mọi bí mật hoặc góc khuất sắp sửa được phơi bày."
        },
        reversed: {
            general: "🔴 **Tổng quan:** Bỏ qua trực giác, sống hời hợt, hoặc những bí mật xấu bị bại lộ.",
            love: "💖 **Về Tình Cảm:** Có sự che giấu hoặc mập mờ đang diễn ra. Bạn đang cố tình phớt lờ những dấu hiệu bất ổn (red flags) mà trực giác đã cảnh báo từ trước.",
            work: "💼 **Về Công Việc:** Bạn đang nghe theo những lời đồn thổi vô căn cứ hoặc đưa ra quyết định sai lầm do thiếu đi sự phân tích khách quan."
        }
    },
    {
        name: "III. The Empress (Nữ Hoàng)",
        image: "https://i.pinimg.com/originals/50/a4/09/50a409f5fa3fa7bbce8c4eb5e7e0129a.jpg",
        upright: {
            general: "🟢 **Tổng quan:** Sự giàu có, sung túc, tình mẫu tử, khả năng sinh sôi nảy nở và sự chăm sóc.",
            love: "💖 **Về Tình Cảm:** Tình yêu thăng hoa, tràn ngập sự ngọt ngào và gắn kết sâu sắc. Rất có thể mối quan hệ sẽ có bước tiến lớn như kết hôn hoặc đón nhận tin vui về gia đình.",
            work: "💼 **Về Công Việc:** Giai đoạn gặt hái thành quả rực rỡ từ những nỗ lực trước đây. Các dự án kinh doanh hoặc ý tưởng sáng tạo của bạn đang phát triển rất thịnh vượng."
        },
        reversed: {
            general: "🔴 **Tổng quan:** Sự ngột ngạt, phụ thuộc cảm xúc, hoặc thiếu đi sự phát triển.",
            love: "💖 **Về Tình Cảm:** Bạn hoặc đối phương đang yêu một cách quá kiểm soát, bao bọc quá mức gây cảm giác ngột ngạt, mệt mỏi cho người còn lại.",
            work: "💼 **Về Công Việc:** Công việc có dấu hiệu dậm chân tại chỗ do bạn đang thiếu động lực sáng tạo hoặc phân bổ năng lượng không đồng đều."
        }
    },
    {
        name: "IV. The Emperor (Nhà Vua)",
        image: "https://i.pinimg.com/originals/24/76/01/247601f059c3a378ef869dbbf782c3c9.jpg",
        upright: {
            general: "🟢 **Tổng quan:** Kỷ luật, quyền lực, sự bảo hộ, tính tổ chức ổn định và vững chãi.",
            love: "💖 **Về Tình Cảm:** Mối quan hệ dựa trên sự nghiêm túc, rõ ràng và có xu hướng lâu dài. Tuy nhiên, đôi khi tình cảm thiếu đi sự lãng mạn vì tính cách hơi khô khan, gia trưởng.",
            work: "💼 **Về Công Việc:** Bạn đang làm chủ được vận trình của mình. Sự kỷ luật, quyết đoán và tuân thủ quy định sẽ đưa bạn lên vị trí lãnh đạo hoặc đạt được sự công nhận lớn."
        },
        reversed: {
            general: "🔴 **Tổng quan:** Sự lạm quyền, độc đoán, thiếu kiểm soát hoặc bất lực trước hoàn cảnh.",
            love: "💖 **Về Tình Cảm:** Đối phương đang quá áp đặt suy nghĩ cá nhân lên bạn, tạo ra sự bất bình đẳng và ức chế tích tụ trong mối quan hệ.",
            work: "💼 **Về Công Việc:** Sự gò bó từ cấp trên hoặc cơ chế quản lý lỏng lẻo đang kìm hãm năng lực của bạn. Hãy giữ cái đầu lạnh để tránh các cuộc xung đột quyền lực."
        }
    },
    {
        name: "V. The Hierophant (Gióng Chủ/Thầy Cả)",
        image: "https://i.pinimg.com/originals/3d/8c/d7/3d8cd7ef928b939f4d7efd6ec03b9b4d.jpg",
        upright: {
            general: "🟢 **Tổng quan:** Truyền thống, giáo lý, sự thông thái, lời khuyên đúng đắn và các mối quan hệ được công nhận.",
            love: "💖 **Về Tình Cảm:** Tình yêu hướng đến sự cam kết hôn nhân truyền thống, được gia đình hai bên ủng hộ và chúc phúc. Hai bạn có sự hòa hợp lớn về mặt quan điểm sống.",
            work: "💼 **Về Công Việc:** Đây là thời điểm tốt để học hỏi từ những người đi trước, tham gia các khóa đào tạo hoặc tuân thủ theo quy trình có sẵn. Bạn sẽ gặp được quý nhân chỉ đường dẫn lối."
        },
        reversed: {
            general: "🔴 **Tổng quan:** Sự nổi loạn, phá vỡ quy chuẩn cũ, bảo thủ hoặc nhận lời khuyên sai lầm.",
            love: "💖 **Về Tình Cảm:** Mối quan hệ gặp phải sự phản đối từ định kiến xã hội hoặc gia đình. Hai bạn đang có những tư tưởng lệch pha, cần ngồi lại để thấu hiểu nhau hơn.",
            work: "💼 **Về Công Việc:** Bạn cảm thấy chán ghét môi trường làm việc cũ kỹ, gò bó hiện tại và muốn bứt phá ra ngoài làm tự do. Hãy cẩn thận với những lời khuyên thiếu thực tế."
        }
    },
    {
        name: "VI. The Lovers (Tình Nhân)",
        image: "https://i.pinimg.com/originals/7a/12/cc/7a12cc938210bf9b389816da65809bb6.jpg",
        upright: {
            general: "🟢 **Tổng quan:** Sự hòa hợp, tình yêu đôi lứa, những lựa chọn quan trọng từ trái tim và sự kết nối tâm hồn.",
            love: "💖 **Về Tình Cảm:** Quẻ bài tuyệt vời nhất cho tình duyên! Sự kết nối sâu sắc, đồng điệu tuyệt đối giữa hai tâm hồn. Nếu đang có mâu thuẫn, đây là điềm báo hai bạn sẽ sớm hàn gắn.",
            work: "💼 **Về Công Việc:** Bạn chuẩn bị phải đưa ra một quyết định mang tính ngã rẽ lớn trong sự nghiệp. Hãy lựa chọn bằng cả lý trí lẫn đam mê, đồng thời các dự án hợp tác nhóm sẽ cực kỳ suôn sẻ."
        },
        reversed: {
            general: "🔴 **Tổng quan:** Sự bất hòa, mất cân bằng, rạn nứt hoặc trốn tránh trách nhiệm lựa chọn.",
            love: "💖 **Về Tình Cảm:** Dấu hiệu của sự rạn nứt, lệch pha hoặc xuất hiện các tác nhân bên ngoài làm lung lay tình cảm. Có sự bất đồng lớn về mặt mục tiêu chung.",
            work: "💼 **Về Công Việc:** Sự bất đồng ý kiến sâu sắc giữa bạn và đối tác hoặc đồng nghiệp. Kế hoạch công việc có nguy cơ bị trì hoãn do nội bộ thiếu thống nhất."
        }
    },
    {
        name: "VII. The Chariot (Chiến Xa)",
        image: "https://i.pinimg.com/originals/60/a6/bf/60a6bf1930b80ba13994a50d6b9d62d2.jpg",
        upright: {
            general: "🟢 **Tổng quan:** Sự chiến thắng, ý chí kiên định vượt qua nghịch cảnh, tốc độ và sự kiểm soát năng lượng đối lập.",
            love: "💖 **Về Tình Cảm:** Bạn hoặc đối phương đang rất chủ động, quyết liệt theo đuổi tình cảm này. Khoảng cách địa lý hoặc khó khăn thử thách sẽ sớm bị hai bạn chinh phục.",
            work: "💼 **Về Công Việc:** Bạn đang tiến phăng phăng về phía trước với nguồn năng lượng khổng lồ. Mọi rào cản, đối thủ cạnh tranh nơi công sở đều sẽ bị bạn vượt qua một cách thuyết phục."
        },
        reversed: {
            general: "🔴 **Tổng quan:** Mất phương hướng, thiếu kiểm soát, hung hăng vô ích hoặc kiệt sức.",
            love: "💖 **Về Tình Cảm:** Sự nóng nảy, cái tôi quá lớn của hai bên đang đẩy mối quan hệ vào ngõ cụt. Hãy học cách kiềm chế cảm xúc trước khi quá muộn.",
            work: "💼 **Về Công Việc:** Công việc đang có biểu hiện mất kiểm soát do bạn ôm đồm quá nhiều thứ hoặc đi sai định hướng ban đầu. Đã đến lúc phải hãm phanh lại để định hình lại lộ trình."
        }
    }
];

module.exports = tarotDeck;