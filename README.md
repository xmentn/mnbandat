# Website quản lý hộ gia đình bằng Firebase

## 1. Cấu trúc
- `login.html`: đăng nhập.
- `index.html` + `app.js`: xem, tìm kiếm, lọc và tổng hợp số hộ/nhân khẩu.
- `admin.html` + `admin.js`: nhập nhiều file Excel và khóa/mở khóa bản ghi.
- `firebase-config.js`: cấu hình Firebase của dự án.
- `firestore.rules`: quy tắc bảo mật Firestore.
- `styles.css`: giao diện.

## 2. Tạo Firebase
1. Tạo Firebase Project.
2. Tạo Web App và lấy `firebaseConfig`, dán vào `firebase-config.js`.
3. Bật Cloud Firestore.
4. Bật Authentication > Sign-in method > Email/Password.
5. Tạo ít nhất 1 tài khoản người dùng trong Authentication.

## 3. Tạo quyền admin
Sau khi tạo tài khoản admin trong Authentication, lấy UID của tài khoản đó.
Trong Firestore tạo collection `users`, document có ID đúng bằng UID, dữ liệu:

```json
{
  "role": "admin"
}
```

Các tài khoản khác vẫn đăng nhập và xem dữ liệu được, nhưng không ghi dữ liệu nếu không có `role: "admin"`.

## 4. Cài Firestore Rules
Mở Firestore Database > Rules, thay nội dung bằng file `firestore.rules`, sau đó Publish.

## 5. Chạy trên VS Code
Không nên mở file HTML trực tiếp bằng `file://`.
Cài extension **Live Server** trong VS Code, sau đó bấm chuột phải `login.html` > **Open with Live Server**.

## 6. Nhập Excel
- Đăng nhập bằng tài khoản admin.
- Mở `admin.html`.
- Chọn nhiều file Excel một lần.
- Bấm **Đọc và xem trước**.
- Kiểm tra vài dòng đầu.
- Bấm **Ghi vào Firebase**.

Trang nhập được thiết kế cho dạng file giống mẫu đã cung cấp:
- có dòng tiêu đề chứa `Họ và tên`;
- có `THƯỜNG TRÚ PHƯỜNG/XÃ`;
- có `ĐỊA CHỈ CHI TIẾT`;
- có `Số lượng nhân khẩu`;
- tùy chọn `Ngập nền nhà`, `Ngập nóc nhà`.

Mỗi hộ được tạo ID ổn định từ xã + xóm/tổ + chủ hộ + địa chỉ. Vì vậy nhập lại cùng dữ liệu sẽ cập nhật bản ghi cũ thay vì sinh bản trùng.

## 7. Cơ chế khóa dữ liệu
Mỗi hộ có trường `active`.
- `active: true`: được tính vào tổng và hiển thị mặc định.
- `active: false`: bị khóa, không tính vào tổng mặc định nhưng vẫn giữ lịch sử.

Đây là cách an toàn hơn xóa thẳng dữ liệu trong giai đoạn đang xây dựng/kiểm thử.

## 8. Lưu ý trước khi dùng thật
Dữ liệu hộ gia đình có thông tin cá nhân, vì vậy không nên để Firestore Rules ở chế độ public. Bản mẫu này yêu cầu đăng nhập mới được xem và chỉ admin mới được sửa.

Khi số dữ liệu tăng rất lớn (hàng chục nghìn/hàng trăm nghìn hộ), nên bổ sung phân trang và truy vấn theo chỉ mục thay vì tải toàn bộ collection mỗi lần mở trang.
