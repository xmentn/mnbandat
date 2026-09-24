import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// =========================================================
// ĐĂNG NHẬP DÙNG CHUNG
// - BGH      -> dashboard.html
// - Điểm trường -> campus.html
// =========================================================

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

const pendingNotice = sessionStorage.getItem("loginNotice");
if (pendingNotice) {
  sessionStorage.removeItem("loginNotice");
  showMessage(pendingNotice, "error");
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!email || !password) {
      showMessage("Vui lòng nhập đầy đủ email và mật khẩu.", "error");
      return;
    }

    setLoginState(true);
    showMessage("Đang xác thực tài khoản...", "info");

    try {
      // 1. Đăng nhập Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const user = userCredential.user;

      // 2. Đọc hồ sơ phân quyền trong Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        await safeSignOut();
        showMessage(
          "Tài khoản chưa có hồ sơ phân quyền trong hệ thống.",
          "error",
        );
        return;
      }

      const userData = userSnapshot.data();

      // Tài khoản bị khóa
      if (userData.active === false) {
        await safeSignOut();
        showMessage(
          "Tài khoản đang tạm khóa. Vui lòng liên hệ Ban Giám hiệu.",
          "error",
        );
        return;
      }

      // 3. Điều hướng theo role
      if (userData.role === "bgh") {
        showMessage("Đăng nhập thành công. Đang mở khu vực quản trị...", "success");
        window.location.replace("dashboard.html");
        return;
      }

      if (userData.role === "campus") {
        if (!userData.campusId || typeof userData.campusId !== "string") {
          await safeSignOut();
          showMessage(
            "Tài khoản điểm trường chưa được liên kết với điểm trường.",
            "error",
          );
          return;
        }

        showMessage("Đăng nhập thành công. Đang mở khu vực điểm trường...", "success");
        window.location.replace("campus.html");
        return;
      }

      // Role không hợp lệ
      await safeSignOut();
      showMessage("Tài khoản chưa được cấp quyền truy cập phù hợp.", "error");
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      showMessage(getLoginErrorMessage(error.code), "error");
    } finally {
      setLoginState(false);
    }
  });
}

async function safeSignOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Lỗi khi kết thúc phiên đăng nhập:", error);
  }
}

function setLoginState(isLoading) {
  if (!loginButton) {
    return;
  }

  loginButton.disabled = isLoading;
  loginButton.textContent = isLoading ? "Đang đăng nhập..." : "Đăng nhập";
}

function showMessage(message, type) {
  if (!loginMessage) {
    return;
  }

  loginMessage.textContent = message;
  loginMessage.className = `login-message ${type}`;
}

function getLoginErrorMessage(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Địa chỉ email không hợp lệ.";

    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email hoặc mật khẩu không đúng.";

    case "auth/user-disabled":
      return "Tài khoản này đã bị vô hiệu hóa trong Firebase Authentication.";

    case "auth/too-many-requests":
      return "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.";

    case "auth/network-request-failed":
      return "Không thể kết nối mạng. Vui lòng kiểm tra Internet.";

    default:
      return "Không thể đăng nhập. Vui lòng thử lại.";
  }
}
