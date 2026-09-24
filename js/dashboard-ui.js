// =========================================================
// DASHBOARD-UI.JS
// 1. Chuyển tab giao diện trang quản trị.
// 2. Cung cấp hộp thoại xác nhận + toast dùng chung.
// Không đọc/ghi Firebase.
// =========================================================

const adminTabButtons = document.querySelectorAll("[data-admin-tab]");
const adminTabPanels = document.querySelectorAll("[data-admin-panel]");

function openAdminTab(tabName) {
  adminTabButtons.forEach((button) => {
    const isActive = button.dataset.adminTab === tabName;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  adminTabPanels.forEach((panel) => {
    const isActive = panel.dataset.adminPanel === tabName;

    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

adminTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openAdminTab(button.dataset.adminTab);
  });
});

// =========================================================
// THÔNG BÁO DÙNG CHUNG
// =========================================================

let dialogResolve = null;
let lastFocusedElement = null;

const feedbackRoot = document.createElement("div");
feedbackRoot.className = "admin-feedback-root";
feedbackRoot.innerHTML = `
  <div class="admin-dialog-backdrop" id="adminDialogBackdrop" hidden>
    <section
      class="admin-dialog"
      id="adminDialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adminDialogTitle"
      aria-describedby="adminDialogMessage"
    >
      <div class="admin-dialog-icon" id="adminDialogIcon" aria-hidden="true">!</div>

      <div class="admin-dialog-content">
        <h2 id="adminDialogTitle">Xác nhận</h2>
        <p id="adminDialogMessage"></p>
        <p class="admin-dialog-detail" id="adminDialogDetail" hidden></p>
      </div>

      <div class="admin-dialog-actions">
        <button type="button" class="btn btn-outline" id="adminDialogCancel">
          Hủy
        </button>
        <button type="button" class="btn admin-dialog-confirm" id="adminDialogConfirm">
          Xác nhận
        </button>
      </div>
    </section>
  </div>

  <div class="admin-toast-region" id="adminToastRegion" aria-live="polite" aria-atomic="true"></div>
`;

document.body.appendChild(feedbackRoot);

const dialogBackdrop = document.getElementById("adminDialogBackdrop");
const dialogElement = document.getElementById("adminDialog");
const dialogIcon = document.getElementById("adminDialogIcon");
const dialogTitle = document.getElementById("adminDialogTitle");
const dialogMessage = document.getElementById("adminDialogMessage");
const dialogDetail = document.getElementById("adminDialogDetail");
const dialogCancelButton = document.getElementById("adminDialogCancel");
const dialogConfirmButton = document.getElementById("adminDialogConfirm");
const toastRegion = document.getElementById("adminToastRegion");

function closeDialog(result) {
  if (!dialogBackdrop || dialogBackdrop.hidden) {
    return;
  }

  dialogBackdrop.hidden = true;
  document.body.classList.remove("dialog-open");

  if (dialogResolve) {
    const resolve = dialogResolve;
    dialogResolve = null;
    resolve(result);
  }

  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }

  lastFocusedElement = null;
}

function confirmDialog(options = {}) {
  const {
    title = "Xác nhận thao tác",
    message = "Anh/chị có chắc chắn muốn thực hiện thao tác này?",
    detail = "",
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    tone = "primary",
  } = options;

  if (dialogResolve) {
    closeDialog(false);
  }

  lastFocusedElement = document.activeElement;

  dialogTitle.textContent = title;
  dialogMessage.textContent = message;
  dialogConfirmButton.textContent = confirmText;
  dialogCancelButton.textContent = cancelText;

  if (detail) {
    dialogDetail.textContent = detail;
    dialogDetail.hidden = false;
  } else {
    dialogDetail.textContent = "";
    dialogDetail.hidden = true;
  }

  dialogElement.dataset.tone = tone;
  dialogIcon.textContent = tone === "danger" ? "!" : "✓";

  dialogBackdrop.hidden = false;
  document.body.classList.add("dialog-open");

  window.setTimeout(() => {
    dialogCancelButton.focus();
  }, 0);

  return new Promise((resolve) => {
    dialogResolve = resolve;
  });
}

function toast(message, type = "success", duration = 3200) {
  if (!toastRegion || !message) {
    return;
  }

  const item = document.createElement("div");
  item.className = `admin-toast ${type}`;

  const icon = document.createElement("span");
  icon.className = "admin-toast-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = type === "error" ? "!" : type === "info" ? "i" : "✓";

  const text = document.createElement("span");
  text.className = "admin-toast-text";
  text.textContent = message;

  item.append(icon, text);
  toastRegion.appendChild(item);

  window.setTimeout(() => {
    item.classList.add("show");
  }, 20);

  window.setTimeout(() => {
    item.classList.remove("show");
    window.setTimeout(() => item.remove(), 220);
  }, duration);
}

if (dialogCancelButton) {
  dialogCancelButton.addEventListener("click", () => closeDialog(false));
}

if (dialogConfirmButton) {
  dialogConfirmButton.addEventListener("click", () => closeDialog(true));
}

if (dialogBackdrop) {
  dialogBackdrop.addEventListener("click", (event) => {
    if (event.target === dialogBackdrop) {
      closeDialog(false);
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (dialogBackdrop?.hidden) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeDialog(false);
    return;
  }

  if (event.key === "Enter" && document.activeElement !== dialogCancelButton) {
    event.preventDefault();
    closeDialog(true);
  }
});

window.AdminUI = {
  confirm: confirmDialog,
  toast,
  openTab: openAdminTab,
};
