import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// ==============================
// CÁC THÀNH PHẦN GIAO DIỆN
// ==============================

const logoutButton = document.getElementById("logoutButton");

const currentUser = document.getElementById("currentUser");

// ==============================
// KIỂM TRA ĐĂNG NHẬP
// VÀ QUYỀN BGH
// ==============================

onAuthStateChanged(auth, async (user) => {
  // ----------------------
  // CHƯA ĐĂNG NHẬP
  // ----------------------

  if (!user) {
    console.log("Người dùng chưa đăng nhập.");

    window.location.replace("login.html");

    return;
  }

  try {
    // ----------------------
    // LẤY HỒ SƠ USER
    // ----------------------

    const userRef = doc(db, "users", user.uid);

    const userSnapshot = await getDoc(userRef);

    // ----------------------
    // KHÔNG CÓ HỒ SƠ USER
    // ----------------------

    if (!userSnapshot.exists()) {
      console.warn("Không tìm thấy hồ sơ người dùng.");

      await signOut(auth);

      alert("Tài khoản chưa được cấp quyền sử dụng hệ thống.");

      window.location.replace("login.html");

      return;
    }

    // ----------------------
    // LẤY DỮ LIỆU USER
    // ----------------------

    const userData = userSnapshot.data();

    // ----------------------
    // KIỂM TRA ROLE
    // ----------------------

    if (userData.role !== "bgh") {
      console.warn("Tài khoản không có quyền BGH.");

      await signOut(auth);

      alert("Tài khoản không có quyền truy cập khu vực Ban Giám hiệu.");

      window.location.replace("login.html");

      return;
    }

    // ----------------------
    // TÀI KHOẢN HỢP LỆ
    // ----------------------

    console.log("Xác thực quyền thành công:", userData.role);

    // Hiển thị tên người dùng
    if (currentUser) {
      currentUser.textContent =
        userData.displayName || user.email || "Ban Giám hiệu";
    }

    // Hiện Dashboard
    document.body.classList.remove("auth-checking");
  } catch (error) {
    console.error("Lỗi kiểm tra quyền:", error);

    alert("Không thể xác minh quyền truy cập. Vui lòng đăng nhập lại.");

    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error("Lỗi khi đăng xuất:", signOutError);
    }

    window.location.replace("login.html");
  }
});

// ==============================
// ĐĂNG XUẤT
// ==============================

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      logoutButton.disabled = true;

      logoutButton.textContent = "Đang đăng xuất...";

      await signOut(auth);

      console.log("Đăng xuất thành công.");

      window.location.replace("login.html");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);

      alert("Không thể đăng xuất. Vui lòng thử lại.");

      logoutButton.disabled = false;

      logoutButton.textContent = "Đăng xuất";
    }
  });
}
