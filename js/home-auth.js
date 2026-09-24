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
// TRẠNG THÁI ĐĂNG NHẬP TẠI TRANG CHỦ
// - Chưa đăng nhập: hiện nút Đăng nhập hệ thống
// - BGH: hiện tài khoản + nút Vào trang quản trị
// - Điểm trường: hiện tài khoản + nút Vào điểm trường
// =========================================================

const authArea = document.getElementById("portalAuthArea");
const authLoading = document.getElementById("portalAuthLoading");
const loginLink = document.getElementById("portalLoginLink");
const sessionArea = document.getElementById("portalSession");
const areaLink = document.getElementById("portalAreaLink");

const accountButton = document.getElementById("portalAccountButton");
const accountName = document.getElementById("portalAccountName");
const accountMenu = document.getElementById("portalAccountMenu");
const menuName = document.getElementById("portalMenuName");
const menuRole = document.getElementById("portalMenuRole");
const menuEmail = document.getElementById("portalMenuEmail");
const logoutButton = document.getElementById("portalLogoutButton");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showLoggedOutState();
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      await signOut(auth);
      showLoggedOutState();
      return;
    }

    const userData = userSnapshot.data();

    if (userData.active === false) {
      await signOut(auth);
      showLoggedOutState();
      return;
    }

    if (userData.role !== "bgh" && userData.role !== "campus") {
      await signOut(auth);
      showLoggedOutState();
      return;
    }

    showLoggedInState(user, userData);
  } catch (error) {
    console.error("Không thể đọc trạng thái đăng nhập tại trang chủ:", error);
    showLoggedOutState();
  }
});

function showLoggedOutState() {
  closeAccountMenu();

  if (authLoading) {
    authLoading.hidden = true;
  }

  if (loginLink) {
    loginLink.hidden = false;
  }

  if (sessionArea) {
    sessionArea.hidden = true;
  }

  authArea?.classList.remove("is-checking");
}

function showLoggedInState(user, userData) {
  const displayName =
    userData.displayName?.trim() || user.email || "Tài khoản đã đăng nhập";

  const roleLabel =
    userData.role === "bgh" ? "Ban Giám hiệu" : "Tài khoản điểm trường";

  if (authLoading) {
    authLoading.hidden = true;
  }

  if (loginLink) {
    loginLink.hidden = true;
  }

  if (sessionArea) {
    sessionArea.hidden = false;
  }

  if (accountName) {
    accountName.textContent = displayName;
  }

  if (menuName) {
    menuName.textContent = displayName;
  }

  if (menuRole) {
    menuRole.textContent = roleLabel;
  }

  if (menuEmail) {
    menuEmail.textContent = user.email || userData.email || "";
  }

  if (areaLink) {
    if (userData.role === "bgh") {
      areaLink.textContent = "Vào trang quản trị";
      areaLink.href = "dashboard.html";
      areaLink.setAttribute("aria-label", "Vào trang quản trị Ban Giám hiệu");
    } else {
      areaLink.textContent = "Vào điểm trường";
      areaLink.href = "campus.html";
      areaLink.setAttribute("aria-label", "Vào khu vực điểm trường");
    }
  }

  authArea?.classList.remove("is-checking");
}

if (accountButton && accountMenu) {
  accountButton.addEventListener("click", () => {
    const willOpen = accountMenu.hidden;

    accountMenu.hidden = !willOpen;
    accountButton.setAttribute("aria-expanded", String(willOpen));
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    const originalText = logoutButton.textContent;

    try {
      logoutButton.disabled = true;
      logoutButton.textContent = "Đang đăng xuất...";

      await signOut(auth);
      closeAccountMenu();
      showLoggedOutState();
    } catch (error) {
      console.error("Không thể đăng xuất tại trang chủ:", error);
      logoutButton.textContent = "Không thể đăng xuất. Thử lại";

      window.setTimeout(() => {
        logoutButton.textContent = originalText;
        logoutButton.disabled = false;
      }, 1800);

      return;
    }

    logoutButton.disabled = false;
    logoutButton.textContent = originalText;
  });
}

document.addEventListener("click", (event) => {
  if (!accountMenu || accountMenu.hidden) {
    return;
  }

  const accountWrap = accountButton?.closest(".portal-account-wrap");

  if (accountWrap && !accountWrap.contains(event.target)) {
    closeAccountMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAccountMenu();
  }
});

function closeAccountMenu() {
  if (accountMenu) {
    accountMenu.hidden = true;
  }

  if (accountButton) {
    accountButton.setAttribute("aria-expanded", "false");
  }
}
