// Cấu hình Cảnh Giới phân định Chính - Ma độc quyền
const CANH_GIOI_LIST = [
    { id: 1, name_chinh: "Phàm Nhân", name_ma: "Phàm Nhân", maxExp: 100, baseRate: 100, loseLevel: false },
    { id: 2, name_chinh: "Luyện Khí Kỳ", name_ma: "Luyện Huyết Kỳ", maxExp: 300, baseRate: 85, loseLevel: false },
    { id: 3, name_chinh: "Trúc Cơ Kỳ", name_ma: "Mao Cương Cảnh", maxExp: 800, baseRate: 60, loseLevel: false },
    { id: 4, name_chinh: "Kim Đan Cảnh (Lão Tổ)", name_ma: "Ma Đan Cảnh (Ma Đầu)", maxExp: 2000, baseRate: 40, loseLevel: true },
    { id: 5, name_chinh: "Nguyên Anh Cảnh (Đại Năng)", name_ma: "Vạn Ma Cảnh (Lão Ma)", maxExp: 5000, baseRate: 20, loseLevel: true },
    { id: 6, name_chinh: "Hóa Thần Kỳ (Đỉnh Phong)", name_ma: "Thiên Ma Kỳ (Cự Ma)", maxExp: 999999, baseRate: 0, loseLevel: false }
];

const LINH_CAN_TYPES = [
    { name: "Thiên Linh Căn (Hỏa)", rateBonus: 10, expMultiplier: 1.5, color: "#e74c3c" },
    { name: "Thiên Linh Căn (Lôi)", rateBonus: 15, expMultiplier: 1.3, color: "#9b59b6" },
    { name: "Chân Linh Căn (Mộc-Thủy)", rateBonus: 5, expMultiplier: 1.1, color: "#2ecc71" },
    { name: "Tạp Linh Căn (Ngũ Hành)", rateBonus: 0, expMultiplier: 0.8, color: "#7f8c8d" }
];

const DAN_DUOC_SHOP = {
    "quy_nguyen": { name: "Quy Nguyên Đan", price: 60, desc: "Tăng 40 EXP. Chỉ dùng cho Luyện Khí/Luyện Huyết trở xuống.", reqMaxId: 2, type: "exp", value: 40 },
    "tu_khi": { name: "Tụ Khí Đan", price: 150, desc: "Tăng 120 EXP. Dành cho Trúc Cơ/Mao Cương trở lên.", reqMinId: 3, type: "exp", value: 120 },
    "truc_co_dan": { name: "Trúc Cơ Bảo Đan", price: 300, desc: "Dược lực tích tụ sẵn trong người. Giúp tăng +20% tỷ lệ đột phá cho lần kế tiếp.", type: "rate", value: 20 },
    "pha_ma_dan": { name: "Phá Ma Đan", price: 600, desc: "Dược lực hộ mệnh sẵn trong người. Nếu đột phá thất bại không lo rớt cảnh giới.", type: "protect", value: 0 }
};

module.exports = { CANH_GIOI_LIST, LINH_CAN_TYPES, DAN_DUOC_SHOP };