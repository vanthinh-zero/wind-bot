# Wind Bot

Bot cộng đồng Discord của Wind, gồm trò chơi, Pet, AI, hồ sơ, ticket, moderation,
Premium và các công cụ tạo không khí riêng cho từng server.

## Chạy bot

```powershell
npm install
npm test
npm start
```

`node .` cũng hoạt động vì `package.json` trỏ `main` tới `index.js`.

## Cấu hình

Giữ bí mật trong `.env`:

```env
DISCORD_TOKEN=...
GEMINI_KEY=...
PAYMENT_WEBHOOK_SECRET=...
```

Các thiết lập dễ thay đổi nằm trong [src/config/settings.json](src/config/settings.json):
giá Premium, tài khoản nhận tiền, category VIP, channel và role.

### Thiết lập server tự động

Administrator có thể dùng:

```text
/setup-server
```

Bot sẽ hỏi hai bước riêng tư:

1. Phong cách server: Cozy, Gaming, Học tập, Creator, Anime/Fandom, Business, Music hoặc Social.
2. Tính năng cần dùng: Game/Cowcoin, Pet, Học tập, AI, Voice, Sự kiện, Ticket, Nội quy và Khí hậu cộng đồng.

Wind chỉ tạo những category/channel được chọn, tái sử dụng cấu trúc đã tồn tại và lưu đúng khóa cấu hình cho từng handler.

ID channel được lưu riêng theo `guildId` trong SQLite. Welcome và Goodbye sẽ tự dùng
cấu hình của từng server; `.env` chỉ còn là fallback cho server chưa chạy setup.

Token, API key và webhook secret không được đưa vào Git hoặc gửi trong chat.

## Premium

Người dùng tạo đơn bằng `/vip mua`. Bot tạo mã đơn duy nhất và hiển thị số tiền:

- 3 ngày: 20.000đ
- 7 ngày: 50.000đ
- 30 ngày: 200.000đ

SePay gọi webhook tại:

```text
https://<domain-cua-ban>/webhooks/sepay
```

Webhook phải gửi secret qua `Authorization: Apikey <secret>` hoặc `x-api-key`.
Bot chỉ tự kích hoạt khi mã đơn, số tiền và transaction ID hợp lệ; transaction ID đã xử lý sẽ bị từ chối lại để chống replay.
Webhook cũng có giới hạn request theo IP để giảm spam và request giả.

## Dữ liệu nhiều server

Cowcoin, điểm danh, chuyển tiền, Tài Xỉu, làm việc và shop dùng khóa theo `guildId + userId`,
nên số dư ở server này không ảnh hưởng server khác. Hồ sơ cá nhân và Premium cá nhân vẫn dùng chung theo tài khoản Discord.
Pet legacy và dữ liệu Tu Tiên dạng JSON cũ vẫn được giữ nguyên trong giai đoạn migration,
chưa tự động tách theo server để tránh làm mất tiến trình hiện tại.

Lệnh liên quan:

- `/vip trangthai`: xem hạn Premium.
- `/vip dacquyen`: xem quyền lợi.
- `/vip duyet`: duyệt thủ công.
- `/vip huy`: hủy đơn chờ.

## Vận hành

- Bot cần quyền `Manage Roles`, `Manage Channels`, `View Channel`, `Send Messages` và `Read Message History`.
- Role bot phải nằm cao hơn role Premium.
- Kênh không tồn tại sẽ khiến job định kỳ tự dừng và chỉ thử lại sau lần restart.
- SQLite nằm tại `data/windbot.sqlite`; nên backup định kỳ.
- Tạo backup thủ công bằng `npm run backup`; file được lưu trong `data/backups/`.
- Dữ liệu counter được ghi theo lô để giảm tải SQLite.

## Kiểm thử

```powershell
npm test
```

Smoke test không cần token Discord hay gọi API bên ngoài.
