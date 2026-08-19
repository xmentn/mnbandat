NÂNG CẤP TRANG CHỦ - SẮP XẾP TIẾNG VIỆT + XUẤT EXCEL

Thay 3 file sau vào thư mục dự án:
- index.html
- app.js
- styles.css

Không thay firebase-config.js, admin.js, admin.html hoặc dữ liệu Firebase.

Chức năng mới:
1. Danh sách hộ luôn sắp xếp A → Z theo quy tắc tiếng Việt bằng Intl.Collator("vi-VN").
2. Nếu trùng tên: sắp tiếp theo Xóm/Tổ và STT nguồn.
3. Nút "Xuất Excel" xuất đúng danh sách đang hiển thị theo bộ lọc/tìm kiếm hiện tại.
4. File Excel có các cột dữ liệu chính, trạng thái và nguồn; có AutoFilter và độ rộng cột.
5. Tên file: Danh-sach-ho-gia-dinh-YYYY-MM-DD.xlsx.

Sau khi chép đè, nhấn Ctrl+F5 trên trình duyệt.
