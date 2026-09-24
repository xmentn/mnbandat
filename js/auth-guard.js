import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// =========================================================
// BẢO VỆ DASHBOARD BAN GIÁM HIỆU
// =========================================================

const logoutButton = document.getElementById("logoutButton");
const currentUser = document.getElementById("currentUser");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      await signOutAndReturn("Tài khoản chưa được cấp quyền sử dụng hệ thống.");
      return;
    }

    const userData = userSnapshot.data();

    // Nếu tài khoản điểm trường gõ trực tiếp dashboard.html,
    // đưa về đúng khu vực điểm trường thay vì đăng xuất.
    if (userData.role === "campus") {
      window.location.replace("campus.html");
      return;
    }

    if (userData.role !== "bgh") {
      await signOutAndReturn("Tài khoản không có quyền truy cập khu vực Ban Giám hiệu.");
      return;
    }

    if (userData.active === false) {
      await signOutAndReturn("Tài khoản đang tạm khóa.");
      return;
    }

    if (currentUser) {
      currentUser.textContent =
        userData.displayName || user.email || "Ban Giám hiệu";
    }

    document.body.classList.remove("auth-checking");
  } catch (error) {
    console.error("Lỗi kiểm tra quyền BGH:", error);
    await signOutAndReturn(
      "Không thể xác minh quyền truy cập. Vui lòng đăng nhập lại.",
    );
  }
});

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      logoutButton.disabled = true;
      logoutButton.textContent = "Đang đăng xuất...";

      await signOut(auth);
      window.location.replace("login.html");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      logoutButton.disabled = false;
      logoutButton.textContent = "Đăng xuất";
      window.alert("Không thể đăng xuất. Vui lòng thử lại.");
    }
  });
}

async function signOutAndReturn(message) {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Lỗi kết thúc phiên đăng nhập:", error);
  }

  if (message) {
    sessionStorage.setItem("loginNotice", message);
  }

  window.location.replace("login.html");
}
