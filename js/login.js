import { auth } from "./firebase-config.js";

import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// Lấy các thành phần trên giao diện
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");

// Xử lý khi người dùng nhấn Đăng nhập
loginForm.addEventListener("submit", async (event) => {
  // Không cho form tự tải lại trang
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Kiểm tra dữ liệu
  if (!email || !password) {
    showMessage("Vui lòng nhập đầy đủ email và mật khẩu.", "error");

    return;
  }

  // Thông báo đang xử lý
  showMessage("Đang đăng nhập...", "info");

  try {
    // Gửi email và mật khẩu tới Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

    console.log("Đăng nhập thành công:", userCredential.user.uid);

    showMessage("Đăng nhập thành công.", "success");

    // Chuyển sang dashboard
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Lỗi đăng nhập:", error.code);

    // Không hiển thị lỗi kỹ thuật khó hiểu cho người dùng
    showMessage(getLoginErrorMessage(error.code), "error");
  }
});

// ==============================
// HIỂN THỊ THÔNG BÁO
// ==============================

function showMessage(message, type) {
  loginMessage.textContent = message;

  loginMessage.className = `login-message ${type}`;
}

// ==============================
// CHUYỂN LỖI FIREBASE
// THÀNH THÔNG BÁO DỄ HIỂU
// ==============================

function getLoginErrorMessage(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Địa chỉ email không hợp lệ.";

    case "auth/invalid-credential":
      return "Email hoặc mật khẩu không đúng.";

    case "auth/user-disabled":
      return "Tài khoản này đã bị vô hiệu hóa.";

    case "auth/too-many-requests":
      return "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.";

    case "auth/network-request-failed":
      return "Không thể kết nối mạng. Vui lòng kiểm tra Internet.";

    default:
      return "Không thể đăng nhập. Vui lòng thử lại.";
  }
}
