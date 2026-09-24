import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// =========================================================
// THÔNG TIN TÀI KHOẢN ĐIỂM TRƯỜNG TRÊN DASHBOARD BGH
// Bước này chỉ HIỂN THỊ trạng thái tài khoản đã được tạo
// trong Firebase Authentication + Firestore.
// Không tạo tài khoản và không gửi email đặt lại mật khẩu.
// =========================================================

const campusAccountPanel = document.getElementById("campusAccountPanel");
const campusAccountTitle = document.getElementById("campusAccountTitle");
const campusAccountStatus = document.getElementById("campusAccountStatus");
const campusAccountDescription = document.getElementById("campusAccountDescription");
const campusAccountExisting = document.getElementById("campusAccountExisting");
const campusAccountEmailDisplay = document.getElementById("campusAccountEmailDisplay");
const campusAccountActiveDisplay = document.getElementById("campusAccountActiveDisplay");
const campusAccountUidDisplay = document.getElementById("campusAccountUidDisplay");

let selectedCampus = null;
let campusAccounts = new Map();
let unsubscribeCampusAccounts = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    stopListener();
    campusAccounts.clear();
    return;
  }

  subscribeToCampusAccounts();
});

function subscribeToCampusAccounts() {
  stopListener();

  const campusAccountsQuery = query(
    collection(db, "users"),
    where("role", "==", "campus"),
  );

  unsubscribeCampusAccounts = onSnapshot(
    campusAccountsQuery,
    (snapshot) => {
      campusAccounts = new Map();

      snapshot.docs.forEach((accountDocument) => {
        const account = {
          uid: accountDocument.id,
          ...accountDocument.data(),
        };

        if (account.campusId && !campusAccounts.has(account.campusId)) {
          campusAccounts.set(account.campusId, account);
        }
      });

      renderSelectedCampusAccount();
    },
    (error) => {
      console.error("Lỗi tải tài khoản điểm trường:", error);
      campusAccounts.clear();
      renderLoadError();
    },
  );
}

function stopListener() {
  if (unsubscribeCampusAccounts) {
    unsubscribeCampusAccounts();
    unsubscribeCampusAccounts = null;
  }
}

window.addEventListener("campus:selected", (event) => {
  const campus = event.detail?.campus;

  if (!campus?.id) {
    return;
  }

  selectedCampus = {
    id: campus.id,
    name: campus.name || "Điểm trường",
  };

  renderSelectedCampusAccount();
});

window.addEventListener("campus:closed", () => {
  selectedCampus = null;
});

function renderSelectedCampusAccount() {
  if (!campusAccountPanel || !selectedCampus) {
    return;
  }

  const account = campusAccounts.get(selectedCampus.id);

  if (!account) {
    campusAccountTitle.textContent = "Chưa liên kết tài khoản";
    setStatus("Chưa thiết lập", "pending");
    campusAccountDescription.textContent =
      "Hãy tạo tài khoản trong Firebase Authentication, sau đó tạo hồ sơ users/{UID} với role = campus và campusId đúng điểm trường này.";
    campusAccountExisting.hidden = true;
    return;
  }

  campusAccountTitle.textContent = "Tài khoản đã liên kết";
  setStatus(
    account.active === false ? "Tạm khóa" : "Đang hoạt động",
    account.active === false ? "inactive" : "active",
  );

  campusAccountDescription.textContent =
    "Tài khoản đăng nhập trực tiếp bằng email và mật khẩu đã tạo trong Firebase Authentication.";

  campusAccountEmailDisplay.textContent = account.email || "Chưa có email";
  campusAccountActiveDisplay.textContent =
    account.active === false ? "Tạm khóa" : "Đang hoạt động";

  if (campusAccountUidDisplay) {
    campusAccountUidDisplay.textContent = account.uid || "--";
  }

  campusAccountExisting.hidden = false;
}

function renderLoadError() {
  if (!campusAccountPanel || !selectedCampus) {
    return;
  }

  campusAccountTitle.textContent = "Không thể kiểm tra tài khoản";
  setStatus("Lỗi", "error");
  campusAccountDescription.textContent =
    "Không thể đọc hồ sơ tài khoản điểm trường. Vui lòng kiểm tra Firestore Rules.";
  campusAccountExisting.hidden = true;
}

function setStatus(text, state) {
  if (!campusAccountStatus) {
    return;
  }

  campusAccountStatus.textContent = text;
  campusAccountStatus.className = `campus-account-status ${state}`;
}
