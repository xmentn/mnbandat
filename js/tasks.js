import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
// ==========================================
// CÁC THÀNH PHẦN GIAO DIỆN
// ==========================================

const taskForm = document.getElementById("taskForm");

const assignedDateInput = document.getElementById("assignedDate");

const taskNameInput = document.getElementById("taskName");

const assigneeSelect = document.getElementById("assignee");

const deadlineInput = document.getElementById("deadline");

const expectedOutputInput = document.getElementById("expectedOutput");

const taskSubmitButton = document.getElementById("taskSubmitButton");

const taskMessage = document.getElementById("taskMessage");

const taskList = document.getElementById("taskList");

// ==========================================
// NGƯỜI DÙNG HIỆN TẠI
// ==========================================

let currentUser = null;

// Hàm dùng để ngừng theo dõi tasks
// khi người dùng đăng xuất
let unsubscribeTasks = null;

// ==========================================
// CHỜ FIREBASE XÁC NHẬN ĐĂNG NHẬP
// ==========================================

onAuthStateChanged(auth, async (user) => {
  // Nếu người dùng đã đăng xuất
  if (!user) {
    currentUser = null;

    if (unsubscribeTasks) {
      unsubscribeTasks();

      unsubscribeTasks = null;
    }

    return;
  }

  // Lưu người dùng hiện tại
  currentUser = user;

  // Tải giáo viên
  await loadTeachers();

  // Theo dõi danh sách nhiệm vụ
  subscribeToTasks();
});

// ==========================================
// ĐỌC DANH SÁCH GIÁO VIÊN
// ==========================================

async function loadTeachers() {
  if (!assigneeSelect) {
    return;
  }

  assigneeSelect.innerHTML = `
        <option value="">
            Đang tải danh sách giáo viên...
        </option>
    `;

  assigneeSelect.disabled = true;

  try {
    const teachersRef = collection(db, "teachers");

    const teachersQuery = query(teachersRef, where("active", "==", true));

    const teachersSnapshot = await getDocs(teachersQuery);

    const teachers = teachersSnapshot.docs.map((teacherDocument) => {
      return {
        id: teacherDocument.id,
        ...teacherDocument.data(),
      };
    });

    // Sắp xếp tên giáo viên theo tiếng Việt
    teachers.sort((a, b) => {
      const nameA = a.fullName || "";

      const nameB = b.fullName || "";

      return nameA.localeCompare(nameB, "vi");
    });

    assigneeSelect.innerHTML = "";

    // Không có giáo viên
    if (teachers.length === 0) {
      const option = document.createElement("option");

      option.value = "";

      option.textContent = "-- Chưa có giáo viên đang hoạt động --";

      assigneeSelect.appendChild(option);

      console.log("Không có giáo viên active.");

      return;
    }

    // Option mặc định
    const defaultOption = document.createElement("option");

    defaultOption.value = "";

    defaultOption.textContent = "-- Chọn giáo viên --";

    assigneeSelect.appendChild(defaultOption);

    // Thêm từng giáo viên
    teachers.forEach((teacher) => {
      if (!teacher.fullName) {
        return;
      }

      const option = document.createElement("option");

      option.value = teacher.id;

      option.textContent = teacher.fullName;

      option.dataset.fullName = teacher.fullName;

      assigneeSelect.appendChild(option);
    });

    assigneeSelect.disabled = false;

    console.log(`Đã tải ${teachers.length} giáo viên.`);
  } catch (error) {
    console.error("Lỗi tải danh sách giáo viên:", error);

    assigneeSelect.innerHTML = `
            <option value="">
                Không thể tải danh sách giáo viên
            </option>
        `;

    assigneeSelect.disabled = true;
  }
}

// ==========================================
// GIAO NHIỆM VỤ
// ==========================================

if (taskForm) {
  taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // ------------------------------
    // KIỂM TRA NGƯỜI DÙNG
    // ------------------------------

    if (!currentUser) {
      showTaskMessage(
        "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
        "error",
      );

      return;
    }

    // ------------------------------
    // LẤY DỮ LIỆU FORM
    // ------------------------------

    const assignedDate = assignedDateInput.value;

    const title = taskNameInput.value.trim();

    const assigneeId = assigneeSelect.value;

    const deadline = deadlineInput.value;

    const expectedOutput = expectedOutputInput.value.trim();

    // Lấy giáo viên đang được chọn
    const selectedOption = assigneeSelect.options[assigneeSelect.selectedIndex];

    const assigneeName = selectedOption?.dataset?.fullName || "";

    // ------------------------------
    // KIỂM TRA ĐỦ THÔNG TIN
    // ------------------------------

    if (
      !assignedDate ||
      !title ||
      !assigneeId ||
      !assigneeName ||
      !deadline ||
      !expectedOutput
    ) {
      showTaskMessage("Vui lòng nhập đầy đủ thông tin nhiệm vụ.", "error");

      return;
    }

    // ------------------------------
    // KIỂM TRA NGÀY
    // ------------------------------

    if (deadline < assignedDate) {
      showTaskMessage(
        "Thời hạn hoàn thành không được trước ngày giao việc.",
        "error",
      );

      return;
    }

    // ------------------------------
    // KHÓA NÚT
    // ------------------------------

    setSubmittingState(true);

    showTaskMessage("Đang lưu nhiệm vụ...", "info");

    try {
      // --------------------------
      // LƯU FIRESTORE
      // --------------------------

      const taskDocument = await addDoc(collection(db, "tasks"), {
        assignedDate: assignedDate,

        title: title,

        assigneeId: assigneeId,

        assigneeName: assigneeName,

        deadline: deadline,

        expectedOutput: expectedOutput,

        createdByUid: currentUser.uid,

        createdAt: serverTimestamp(),
      });

      console.log("Đã tạo nhiệm vụ:", taskDocument.id);

      showTaskMessage("Giao nhiệm vụ thành công.", "success");

      // Xóa dữ liệu trong form
      resetTaskForm();
    } catch (error) {
      console.error("Lỗi khi lưu nhiệm vụ:", error);

      showTaskMessage("Không thể lưu nhiệm vụ. Vui lòng thử lại.", "error");
    } finally {
      setSubmittingState(false);
    }
  });
}

// ==========================================
// THEO DÕI DANH SÁCH NHIỆM VỤ
// ==========================================

function subscribeToTasks() {
  if (!taskList) {
    return;
  }

  // Nếu đã có listener cũ
  // thì ngừng listener đó trước
  if (unsubscribeTasks) {
    unsubscribeTasks();
  }

  // Hiển thị trạng thái đang tải
  showTaskListLoading();

  // Collection tasks
  const tasksRef = collection(db, "tasks");

  // Nhiệm vụ mới nhất hiển thị trước
  const tasksQuery = query(tasksRef, orderBy("createdAt", "desc"));

  // Theo dõi thay đổi thời gian thực
  unsubscribeTasks = onSnapshot(
    tasksQuery,

    (snapshot) => {
      const tasks = snapshot.docs.map((taskDocument) => {
        return {
          id: taskDocument.id,
          ...taskDocument.data(),
        };
      });

      renderTasks(tasks);

      console.log(`Đã tải ${tasks.length} nhiệm vụ.`);
    },

    (error) => {
      console.error("Lỗi tải danh sách nhiệm vụ:", error);

      showTaskListError();
    },
  );
}

// ==========================================
// HIỂN THỊ DANH SÁCH NHIỆM VỤ
// ==========================================

function renderTasks(tasks) {
  if (!taskList) {
    return;
  }

  // Xóa dữ liệu đang có
  taskList.innerHTML = "";

  // Không có nhiệm vụ
  if (tasks.length === 0) {
    const row = document.createElement("tr");

    const cell = document.createElement("td");

    cell.colSpan = 6;

    cell.className = "empty-message";

    cell.textContent = "Chưa có nhiệm vụ nào.";

    row.appendChild(cell);

    taskList.appendChild(row);

    return;
  }

  // Hiển thị từng nhiệm vụ
  tasks.forEach((task) => {
    const row = document.createElement("tr");

    // --------------------------
    // NGÀY GIAO
    // --------------------------

    const assignedDateCell = document.createElement("td");

    assignedDateCell.textContent = formatDate(task.assignedDate);

    // --------------------------
    // TÊN NHIỆM VỤ
    // --------------------------

    const titleCell = document.createElement("td");

    titleCell.textContent = task.title || "";

    // --------------------------
    // NGƯỜI THỰC HIỆN
    // --------------------------

    const assigneeCell = document.createElement("td");

    assigneeCell.textContent = task.assigneeName || "";

    // --------------------------
    // THỜI HẠN
    // --------------------------

    const deadlineCell = document.createElement("td");

    deadlineCell.textContent = formatDate(task.deadline);

    // --------------------------
    // KẾT QUẢ ĐẦU RA
    // --------------------------

    const outputCell = document.createElement("td");

    outputCell.textContent = task.expectedOutput || "";
    // --------------------------
    // THAO TÁC
    // --------------------------

    const actionCell = document.createElement("td");

    actionCell.className = "task-actions";

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";

    deleteButton.className = "btn-delete";

    deleteButton.textContent = "Xóa";

    deleteButton.addEventListener("click", () => {
      deleteTask(task.id, task.title, deleteButton);
    });

    actionCell.appendChild(deleteButton);
    // --------------------------
    // GHÉP VÀO HÀNG
    // --------------------------

    row.appendChild(assignedDateCell);

    row.appendChild(titleCell);

    row.appendChild(assigneeCell);

    row.appendChild(deadlineCell);

    row.appendChild(outputCell);
    row.appendChild(actionCell);
    taskList.appendChild(row);
  });
}

// ==========================================
// HIỂN THỊ ĐANG TẢI
// ==========================================

function showTaskListLoading() {
  if (!taskList) {
    return;
  }

  taskList.innerHTML = "";

  const row = document.createElement("tr");

  const cell = document.createElement("td");

  cell.colSpan = 6;

  cell.className = "empty-message";

  cell.textContent = "Đang tải danh sách nhiệm vụ...";

  row.appendChild(cell);

  taskList.appendChild(row);
}

// ==========================================
// HIỂN THỊ LỖI
// ==========================================

function showTaskListError() {
  if (!taskList) {
    return;
  }

  taskList.innerHTML = "";

  const row = document.createElement("tr");

  const cell = document.createElement("td");

  cell.colSpan = 6;

  cell.className = "empty-message";

  cell.textContent = "Không thể tải danh sách nhiệm vụ.";

  row.appendChild(cell);

  taskList.appendChild(row);
}

// ==========================================
// ĐỊNH DẠNG NGÀY
// YYYY-MM-DD → DD/MM/YYYY
// ==========================================
// ==========================================
// XÓA NHIỆM VỤ
// ==========================================

async function deleteTask(taskId, taskTitle, deleteButton) {
  // Kiểm tra ID
  if (!taskId) {
    return;
  }

  // Hỏi xác nhận trước khi xóa
  const confirmed = window.AdminUI
    ? await window.AdminUI.confirm({
        title: "Xóa nhiệm vụ?",
        message: `Anh/chị đang chuẩn bị xóa “${taskTitle}”.`,
        detail: "Dữ liệu sau khi xóa sẽ không thể khôi phục.",
        confirmText: "Xóa nhiệm vụ",
        cancelText: "Giữ lại",
        tone: "danger",
      })
    : window.confirm(`Anh/chị có chắc chắn muốn xóa nhiệm vụ “${taskTitle}”?`);

  if (!confirmed) {
    return;
  }

  try {
    // Khóa nút trong lúc xử lý
    deleteButton.disabled = true;

    deleteButton.textContent = "Đang xóa...";

    // Xóa document khỏi Firestore
    await deleteDoc(doc(db, "tasks", taskId));

    console.log("Đã xóa nhiệm vụ:", taskId);

    showTaskMessage("Đã xóa nhiệm vụ.", "success");
    window.AdminUI?.toast("Đã xóa nhiệm vụ.", "success");

    // Không cần tự xóa hàng khỏi bảng.
    // onSnapshot() sẽ tự cập nhật giao diện.
  } catch (error) {
    console.error("Lỗi khi xóa nhiệm vụ:", error);

    showTaskMessage("Không thể xóa nhiệm vụ. Vui lòng thử lại.", "error");

    deleteButton.disabled = false;

    deleteButton.textContent = "Xóa";
  }
}
function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const parts = dateString.split("-");

  if (parts.length !== 3) {
    return dateString;
  }

  const [year, month, day] = parts;

  return `${day}/${month}/${year}`;
}

// ==========================================
// ĐƯA FORM VỀ TRẠNG THÁI BAN ĐẦU
// ==========================================

function resetTaskForm() {
  if (!taskForm) {
    return;
  }

  taskForm.reset();
}

// ==========================================
// KHÓA / MỞ NÚT GIAO NHIỆM VỤ
// ==========================================

function setSubmittingState(isSubmitting) {
  if (!taskSubmitButton) {
    return;
  }

  taskSubmitButton.disabled = isSubmitting;

  taskSubmitButton.textContent = isSubmitting ? "Đang lưu..." : "Giao nhiệm vụ";
}

// ==========================================
// HIỂN THỊ THÔNG BÁO FORM
// ==========================================

function showTaskMessage(message, type) {
  if (!taskMessage) {
    return;
  }

  taskMessage.textContent = message;

  taskMessage.className = `task-message ${type}`;
}
