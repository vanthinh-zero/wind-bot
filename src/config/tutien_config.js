const CANH_GIOI_LIST = [
    { id: 1, name: "Phàm Nhân", maxExp: 100, baseRate: 100, loseLevel: false },
    { id: 2, name: "Luyện Khí Kỳ", maxExp: 300, baseRate: 85, loseLevel: false },
    { id: 3, name: "Trúc Cơ Kỳ", maxExp: 800, baseRate: 60, loseLevel: false },
    { id: 4, name: "Kim Đan Cảnh (Lão Tổ)", maxExp: 2000, baseRate: 40, loseLevel: true },
    { id: 5, name: "Nguyên Anh Cảnh (Đại Năng)", maxExp: 5000, baseRate: 20, loseLevel: true },
    { id: 6, name: "Hóa Thần Kỳ (Đỉnh Phong)", maxExp: 999999, baseRate: 0, loseLevel: false }
];

const LINH_CAN_TYPES = [
    { name: "Thiên Linh Căn (Hỏa)", rateBonus: 10, expMultiplier: 1.5, color: "#e74c3c" },
    { name: "Thiên Linh Căn (Lôi)", rateBonus: 15, expMultiplier: 1.3, color: "#9b59b6" },
    { name: "Chân Linh Căn (Mộc-Thủy)", rateBonus: 5, expMultiplier: 1.1, color: "#2ecc71" },
    { name: "Tạp Linh Căn (Ngũ Hành)", rateBonus: 0, expMultiplier: 0.8, color: "#7f8c8d" }
];

const DAN_DUOC_SHOP = {
    "quy_nguyen": { name: "Quy Nguyên Đan", price: 60, desc: "Tăng 40 EXP. Chỉ dùng cho Luyện Khí trở xuống.", reqMaxId: 2, type: "exp", value: 40 },
    "tu_khi": { name: "Tụ Khí Đan", price: 150, desc: "Tăng 120 EXP. Dành cho Trúc Cơ Kỳ trở lên.", reqMinId: 3, type: "exp", value: 120 },
    "truc_co_dan": { name: "Trúc Cơ Bảo Đan", price: 300, desc: "Dược lực tích tụ sẵn trong người. Giúp tăng +20% tỷ lệ đột phá cho lần kế tiếp.", type: "rate", value: 20 },
    "pha_ma_dan": { name: "Phá Ma Đan", price: 600, desc: "Dược lực hộ mệnh sẵn trong người. Nếu đột phá thất bại không lo rớt cảnh giới.", type: "protect", value: 0 }
};

module.exports = { CANH_GIOI_LIST, LINH_CAN_TYPES, DAN_DUOC_SHOP };