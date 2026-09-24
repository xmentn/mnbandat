import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// =========================================================
// CÁC ĐIỂM TRƯỜNG
// Bước 3: quản lý tên + khung điểm trường + liên kết tài khoản điểm trường.
// Collection Firestore: campuses
// =========================================================

const addCampusButton = document.getElementById("addCampusButton");
const campusEditor = document.getElementById("campusEditor");
const campusEditorTitle = document.getElementById("campusEditorTitle");
const campusForm = document.getElementById("campusForm");
const campusNameInput = document.getElementById("campusName");
const campusSaveButton = document.getElementById("campusSaveButton");
const campusCancelButton = document.getElementById("campusCancelButton");
const campusMessage = document.getElementById("campusMessage");
const campusSearch = document.getElementById("campusSearch");
const campusTotal = document.getElementById("campusTotal");
const campusList = document.getElementById("campusList");
const campusDetailCard = document.getElementById("campusDetailCard");
const campusDetailName = document.getElementById("campusDetailName");
const closeCampusDetailButton = document.getElementById("closeCampusDetailButton");

let currentUser = null;
let campuses = [];
let editingCampusId = null;
let unsubscribeCampuses = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user || null;

  if (!user) {
    stopCampusListener();
    return;
  }

  subscribeToCampuses();
});

// =========================================================
// MỞ / ĐÓNG FORM
// =========================================================

if (addCampusButton) {
  addCampusButton.addEventListener("click", () => {
    openCampusEditor();
  });
}

if (campusCancelButton) {
  campusCancelButton.addEventListener("click", () => {
    closeCampusEditor();
  });
}

if (closeCampusDetailButton) {
  closeCampusDetailButton.addEventListener("click", () => {
    closeCampusDetail();
  });
}

function openCampusEditor(campus = null) {
  if (!campusEditor || !campusForm || !campusNameInput) {
    return;
  }

  closeCampusDetail();
  clearCampusMessage();
  campusForm.reset();

  if (campus) {
    editingCampusId = campus.id;
    campusEditorTitle.textContent = "Sửa điểm trường";
    campusSaveButton.textContent = "Lưu thay đổi";
    campusNameInput.value = campus.name || "";
  } else {
    editingCampusId = null;
    campusEditorTitle.textContent = "Thêm điểm trường";
    campusSaveButton.textContent = "Lưu điểm trường";
  }

  campusEditor.hidden = false;
  campusNameInput.focus();
  campusEditor.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeCampusEditor() {
  if (!campusEditor || !campusForm) {
    return;
  }

  campusForm.reset();
  editingCampusId = null;
  campusEditor.hidden = true;
  clearCampusMessage();
}

// =========================================================
// KHUNG QUẢN LÝ RIÊNG CỦA TỪNG ĐIỂM TRƯỜNG
// =========================================================

function openCampusDetail(campus) {
  if (!campusDetailCard || !campusDetailName || !campus) {
    return;
  }

  closeCampusEditor();
  campusDetailName.textContent = campus.name || "Chi tiết điểm trường";
  campusDetailCard.hidden = false;

  window.dispatchEvent(
    new CustomEvent("campus:selected", {
      detail: {
        campus: {
          id: campus.id,
          name: campus.name || "",
        },
      },
    }),
  );

  campusDetailCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeCampusDetail() {
  if (!campusDetailCard) {
    return;
  }

  campusDetailCard.hidden = true;
  window.dispatchEvent(new CustomEvent("campus:closed"));
}

// =========================================================
// THÊM / SỬA ĐIỂM TRƯỜNG
// =========================================================

if (campusForm) {
  campusForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showCampusMessage("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.", "error");
      return;
    }

    const name = normalizeCampusName(campusNameInput.value);

    if (!name) {
      showCampusMessage("Vui lòng nhập tên điểm trường.", "error");
      campusNameInput.focus();
      return;
    }

    const duplicatedCampus = campuses.find((campus) => {
      if (campus.id === editingCampusId) {
        return false;
      }

      return normalizeForCompare(campus.name) === normalizeForCompare(name);
    });

    if (duplicatedCampus) {
      showCampusMessage("Tên điểm trường này đã có trong danh sách.", "error");
      campusNameInput.focus();
      return;
    }

    setCampusSubmitting(true);

    try {
      if (editingCampusId) {
        await updateDoc(doc(db, "campuses", editingCampusId), {
          name,
          updatedAt: serverTimestamp(),
          updatedByUid: currentUser.uid,
        });

        showCampusMessage("Đã cập nhật tên điểm trường.", "success");
        window.AdminUI?.toast("Đã cập nhật tên điểm trường.", "success");
      } else {
        await addDoc(collection(db, "campuses"), {
          name,
          createdAt: serverTimestamp(),
          createdByUid: currentUser.uid,
          updatedAt: serverTimestamp(),
          updatedByUid: currentUser.uid,
        });

        showCampusMessage("Đã thêm điểm trường.", "success");
        window.AdminUI?.toast("Đã thêm điểm trường mới.", "success");
      }

      window.setTimeout(() => {
        closeCampusEditor();
      }, 500);
    } catch (error) {
      console.error("Lỗi lưu điểm trường:", error);
      showCampusMessage(
        "Không thể lưu điểm trường. Vui lòng kiểm tra quyền Firestore và thử lại.",
        "error",
      );
    } finally {
      setCampusSubmitting(false);
    }
  });
}

// =========================================================
// ĐỌC DANH SÁCH ĐIỂM TRƯỜNG THEO THỜI GIAN THỰC
// =========================================================

function subscribeToCampuses() {
  if (!campusList) {
    return;
  }

  stopCampusListener();
  showCampusState("Đang tải danh sách điểm trường...");

  const campusesQuery = query(collection(db, "campuses"), orderBy("name", "asc"));

  unsubscribeCampuses = onSnapshot(
    campusesQuery,
    (snapshot) => {
      campuses = snapshot.docs.map((campusDocument) => ({
        id: campusDocument.id,
        ...campusDocument.data(),
      }));

      renderCampuses();
    },
    (error) => {
      console.error("Lỗi tải danh sách điểm trường:", error);
      campuses = [];
      updateCampusTotal(0);
      showCampusState(
        "Không thể tải danh sách điểm trường. Vui lòng kiểm tra quyền Firestore.",
        "error",
      );
    },
  );
}

function stopCampusListener() {
  if (unsubscribeCampuses) {
    unsubscribeCampuses();
    unsubscribeCampuses = null;
  }
}

// =========================================================
// TÌM KIẾM + HIỂN THỊ
// =========================================================

if (campusSearch) {
  campusSearch.addEventListener("input", () => {
    renderCampuses();
  });
}

function renderCampuses() {
  if (!campusList) {
    return;
  }

  const keyword = normalizeForCompare(campusSearch?.value || "");

  const filteredCampuses = keyword
    ? campuses.filter((campus) => normalizeForCompare(campus.name).includes(keyword))
    : campuses;

  campusList.innerHTML = "";
  updateCampusTotal(campuses.length);

  if (campuses.length === 0) {
    showCampusState("Chưa có điểm trường nào. Hãy chọn “+ Thêm điểm trường” để bắt đầu.");
    return;
  }

  if (filteredCampuses.length === 0) {
    showCampusState("Không tìm thấy điểm trường phù hợp với từ khóa.");
    return;
  }

  filteredCampuses.forEach((campus) => {
    campusList.appendChild(createCampusCard(campus));
  });
}

function createCampusCard(campus) {
  const article = document.createElement("article");
  article.className = "campus-card";

  const head = document.createElement("div");
  head.className = "campus-card-head";

  const mark = document.createElement("div");
  mark.className = "campus-card-mark";
  mark.textContent = "ĐT";

  const chip = document.createElement("span");
  chip.className = "status-chip";
  chip.textContent = "Điểm trường";

  head.append(mark, chip);

  const title = document.createElement("h3");
  title.textContent = campus.name || "Chưa đặt tên";

  const description = document.createElement("p");
  description.textContent =
    "Tài khoản đăng nhập và các dữ liệu riêng của điểm trường được quản lý trong khu vực này.";

  const actions = document.createElement("div");
  actions.className = "campus-card-actions";

  const manageButton = document.createElement("button");
  manageButton.type = "button";
  manageButton.className = "btn btn-soft";
  manageButton.textContent = "Quản lý";
  manageButton.addEventListener("click", () => {
    openCampusDetail(campus);
  });

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "btn btn-outline";
  editButton.textContent = "Sửa";
  editButton.addEventListener("click", () => {
    openCampusEditor(campus);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn-delete";
  deleteButton.textContent = "Xóa";
  deleteButton.addEventListener("click", () => {
    deleteCampus(campus, deleteButton);
  });

  actions.append(manageButton, editButton, deleteButton);
  article.append(head, title, description, actions);

  return article;
}

// =========================================================
// XÓA ĐIỂM TRƯỜNG
// =========================================================

async function deleteCampus(campus, deleteButton) {
  if (!currentUser || !campus?.id) {
    return;
  }

  // Khi điểm trường đã có tài khoản đăng nhập, không cho xóa trực tiếp.
  // Việc xử lý tài khoản Firebase Authentication sẽ được thực hiện
  // theo quy trình riêng để tránh tạo dữ liệu mồ côi.
  try {
    const linkedAccountQuery = query(
      collection(db, "users"),
      where("role", "==", "campus"),
      where("campusId", "==", campus.id),
    );

    const linkedAccountSnapshot = await getDocs(linkedAccountQuery);

    if (!linkedAccountSnapshot.empty) {
      window.AdminUI?.toast(
        "Điểm trường này đã có tài khoản đăng nhập nên chưa thể xóa trực tiếp.",
        "info",
        4200,
      );
      return;
    }
  } catch (error) {
    console.error("Lỗi kiểm tra tài khoản điểm trường:", error);
    window.AdminUI?.toast(
      "Chưa thể kiểm tra tài khoản liên kết. Vui lòng thử lại.",
      "error",
      4200,
    );
    return;
  }

  const confirmed = window.AdminUI
    ? await window.AdminUI.confirm({
        title: "Xóa điểm trường?",
        message: `Anh/chị đang chuẩn bị xóa “${campus.name}”.`,
        detail: "Thao tác này không thể hoàn tác. Chỉ tiếp tục khi chắc chắn điểm trường không còn cần sử dụng.",
        confirmText: "Xóa điểm trường",
        cancelText: "Giữ lại",
        tone: "danger",
      })
    : window.confirm(`Anh/chị có chắc chắn muốn xóa điểm trường “${campus.name}”?`);

  if (!confirmed) {
    return;
  }

  const originalText = deleteButton.textContent;
  deleteButton.disabled = true;
  deleteButton.textContent = "Đang xóa...";

  try {
    await deleteDoc(doc(db, "campuses", campus.id));

    if (editingCampusId === campus.id) {
      closeCampusEditor();
    }

    if (campusDetailName?.textContent === campus.name) {
      closeCampusDetail();
    }

    window.AdminUI?.toast(`Đã xóa “${campus.name}”.`, "success");
  } catch (error) {
    console.error("Lỗi xóa điểm trường:", error);

    if (window.AdminUI) {
      window.AdminUI.toast(
        "Không thể xóa điểm trường. Vui lòng kiểm tra quyền Firestore và thử lại.",
        "error",
        4200,
      );
    } else {
      window.alert(
        "Không thể xóa điểm trường. Vui lòng kiểm tra quyền Firestore và thử lại.",
      );
    }

    deleteButton.disabled = false;
    deleteButton.textContent = originalText;
  }
}

// =========================================================
// HÀM HỖ TRỢ
// =========================================================

function normalizeCampusName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeForCompare(value) {
  return normalizeCampusName(value).toLocaleLowerCase("vi");
}

function setCampusSubmitting(isSubmitting) {
  if (!campusSaveButton || !campusCancelButton || !campusNameInput) {
    return;
  }

  campusSaveButton.disabled = isSubmitting;
  campusCancelButton.disabled = isSubmitting;
  campusNameInput.disabled = isSubmitting;

  if (isSubmitting) {
    campusSaveButton.textContent = editingCampusId ? "Đang lưu..." : "Đang thêm...";
  } else {
    campusSaveButton.textContent = editingCampusId ? "Lưu thay đổi" : "Lưu điểm trường";
  }
}

function showCampusMessage(message, type = "info") {
  if (!campusMessage) {
    return;
  }

  campusMessage.textContent = message;
  campusMessage.className = `campus-message ${type}`;
}

function clearCampusMessage() {
  if (!campusMessage) {
    return;
  }

  campusMessage.textContent = "";
  campusMessage.className = "campus-message";
}

function showCampusState(message, type = "") {
  if (!campusList) {
    return;
  }

  campusList.innerHTML = "";

  const state = document.createElement("div");
  state.className = `campus-state-message${type ? ` ${type}` : ""}`;
  state.textContent = message;

  campusList.appendChild(state);
}

function updateCampusTotal(total) {
  if (campusTotal) {
    campusTotal.textContent = String(total);
  }
}
