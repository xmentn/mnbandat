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
// BẢO VỆ KHU VỰC ĐIỂM TRƯỜNG
// Chỉ role = "campus" và đúng campusId mới được truy cập.
// =========================================================

const currentCampusUser = document.getElementById("currentCampusUser");
const sidebarCampusName = document.getElementById("sidebarCampusName");
const campusWelcomeName = document.getElementById("campusWelcomeName");
const campusLogoutButton = document.getElementById("campusLogoutButton");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  try {
    // 1. Đọc hồ sơ tài khoản
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      await exitToLogin("Tài khoản chưa có hồ sơ phân quyền.");
      return;
    }

    const userData = userSnapshot.data();

    // Nếu BGH gõ trực tiếp campus.html thì đưa về Dashboard.
    if (userData.role === "bgh") {
      window.location.replace("dashboard.html");
      return;
    }

    if (userData.role !== "campus") {
      await exitToLogin("Tài khoản không có quyền truy cập khu vực điểm trường.");
      return;
    }

    if (userData.active === false) {
      await exitToLogin("Tài khoản điểm trường đang tạm khóa.");
      return;
    }

    const campusId = typeof userData.campusId === "string"
      ? userData.campusId.trim()
      : "";

    if (!campusId) {
      await exitToLogin("Tài khoản chưa được liên kết với điểm trường.");
      return;
    }

    // 2. Đọc đúng document điểm trường được liên kết
    const campusRef = doc(db, "campuses", campusId);
    const campusSnapshot = await getDoc(campusRef);

    if (!campusSnapshot.exists()) {
      await exitToLogin("Không tìm thấy điểm trường được liên kết với tài khoản.");
      return;
    }

    const campusData = campusSnapshot.data();
    const campusName = campusData.name || userData.displayName || "Điểm trường";

    if (currentCampusUser) {
      currentCampusUser.textContent = campusName;
    }

    if (sidebarCampusName) {
      sidebarCampusName.textContent = campusName;
    }

    if (campusWelcomeName) {
      campusWelcomeName.textContent = campusName;
    }

    document.title = `${campusName} | Trường Mầm non Tân Khánh 2`;

    // Hiện giao diện sau khi xác minh xong.
    document.body.classList.remove("auth-checking");
  } catch (error) {
    console.error("Lỗi kiểm tra quyền điểm trường:", error);
    await exitToLogin(
      "Không thể xác minh quyền truy cập điểm trường. Vui lòng đăng nhập lại.",
    );
  }
});

if (campusLogoutButton) {
  campusLogoutButton.addEventListener("click", async () => {
    try {
      campusLogoutButton.disabled = true;
      campusLogoutButton.textContent = "Đang đăng xuất...";

      await signOut(auth);
      window.location.replace("login.html");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      campusLogoutButton.disabled = false;
      campusLogoutButton.textContent = "Đăng xuất";
      window.alert("Không thể đăng xuất. Vui lòng thử lại.");
    }
  });
}

async function exitToLogin(message) {
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
