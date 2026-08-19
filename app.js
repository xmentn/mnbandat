import { auth, db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const els = {
  body: document.querySelector("#householdBody"),
  search: document.querySelector("#searchInput"),
  village: document.querySelector("#villageFilter"),
  status: document.querySelector("#statusFilter"),
  clear: document.querySelector("#clearFilters"),
  logout: document.querySelector("#logoutBtn"),
  empty: document.querySelector("#emptyState"),
  totalHouseholds: document.querySelector("#totalHouseholds"),
  totalPopulation: document.querySelector("#totalPopulation"),
  totalVillages: document.querySelector("#totalVillages"),
  totalFlooded: document.querySelector("#totalFlooded"),
  exportExcel: document.querySelector("#exportExcelBtn")
};

let allHouseholds = [];
let unsubscribe = null;

// Bộ so sánh theo bảng chữ cái tiếng Việt: A, Ă, Â, B, C, D, Đ, E, Ê...
const viCollator = new Intl.Collator("vi-VN", {
  usage: "sort",
  sensitivity: "base",
  numeric: true,
  ignorePunctuation: true
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  startRealtimeData();
});

function startRealtimeData() {
  if (unsubscribe) unsubscribe();
  const q = query(collection(db, "households"), orderBy("headName"));
  unsubscribe = onSnapshot(q, (snapshot) => {
    allHouseholds = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    rebuildVillageFilter();
    render();
  }, (error) => {
    console.error(error);
    els.empty.classList.remove("hidden");
    els.empty.textContent = "Không tải được dữ liệu. Kiểm tra Firestore Rules và kết nối mạng.";
  });
}

function norm(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function rebuildVillageFilter() {
  const current = els.village.value;
  const villages = [...new Set(allHouseholds.map(x => x.village).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "vi"));
  els.village.innerHTML = '<option value="">Tất cả</option>' +
    villages.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  if (villages.includes(current)) els.village.value = current;
}

function getFiltered() {
  const search = norm(els.search.value);
  const village = els.village.value;
  const status = els.status.value;

  return allHouseholds
    .filter((item) => {
      const matchesSearch = !search || norm(item.headName).includes(search);
      const matchesVillage = !village || item.village === village;
      const isActive = item.active !== false;
      const matchesStatus = status === "all" ||
        (status === "active" && isActive) ||
        (status === "inactive" && !isActive);
      return matchesSearch && matchesVillage && matchesStatus;
    })
    .sort((a, b) => {
      // Ưu tiên sắp xếp theo họ và tên chủ hộ bằng quy tắc tiếng Việt.
      const byName = viCollator.compare(a.headName || "", b.headName || "");
      if (byName !== 0) return byName;

      // Nếu trùng tên, sắp tiếp theo xóm/tổ rồi STT nguồn để thứ tự ổn định.
      const byVillage = viCollator.compare(a.village || "", b.village || "");
      if (byVillage !== 0) return byVillage;
      return Number(a.sourceStt || 0) - Number(b.sourceStt || 0);
    });
}

function render() {
  const data = getFiltered();
  els.body.innerHTML = data.map((item, index) => `
    <tr class="${item.active === false ? "inactive-row" : ""}">
      <td>${index + 1}</td>
      <td class="name-cell">${escapeHtml(item.headName || "")}</td>
      <td>${escapeHtml(item.permanentResidence || item.commune || "")}</td>
      <td>${escapeHtml(item.detailAddress || item.village || "")}</td>
      <td class="num">${Number(item.population || 0)}</td>
      <td>${formatFlag(item.floodedFloor)}</td>
      <td>${formatFlag(item.floodedRoof)}</td>
      <td class="source">${escapeHtml(item.sourceFile || "")}</td>
    </tr>
  `).join("");

  els.empty.classList.toggle("hidden", data.length > 0);
  updateStats(data);
}

function updateStats(data) {
  els.totalHouseholds.textContent = data.length.toLocaleString("vi-VN");
  els.totalPopulation.textContent = data.reduce((sum, x) => sum + Number(x.population || 0), 0).toLocaleString("vi-VN");
  els.totalVillages.textContent = new Set(data.map(x => x.village).filter(Boolean)).size.toLocaleString("vi-VN");
  els.totalFlooded.textContent = data.filter(x => truthyFlag(x.floodedFloor) || truthyFlag(x.floodedRoof)).length.toLocaleString("vi-VN");
}

function truthyFlag(v) {
  if (v === true) return true;
  const s = norm(v);
  return ["x", "co", "1", "yes", "true"].includes(s);
}

function formatFlag(v) {
  return truthyFlag(v) ? "Có" : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}



function exportCurrentListToExcel() {
  const data = getFiltered();

  if (!data.length) {
    alert("Không có dữ liệu phù hợp để xuất Excel.");
    return;
  }

  if (!window.XLSX) {
    alert("Chưa tải được thư viện xuất Excel. Vui lòng kiểm tra kết nối mạng và thử lại.");
    return;
  }

  // Xuất đúng danh sách đang hiển thị sau khi tìm kiếm/lọc và đã sắp xếp A → Z tiếng Việt.
  const rows = data.map((item, index) => ({
    "STT": index + 1,
    "Họ và tên chủ hộ": item.headName || "",
    "Thường trú phường/xã": item.permanentResidence || item.commune || "",
    "Xóm/Tổ": item.village || "",
    "Địa chỉ chi tiết": item.detailAddress || item.village || "",
    "Số lượng nhân khẩu": Number(item.population || 0),
    "Ngập nền nhà": truthyFlag(item.floodedFloor) ? "Có" : "",
    "Ngập nóc nhà": truthyFlag(item.floodedRoof) ? "Có" : "",
    "Trạng thái": item.active === false ? "Đã khóa" : "Đang sử dụng",
    "Nguồn": item.sourceFile || ""
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Giữ hàng tiêu đề khi lọc trong Excel và đặt độ rộng cột dễ đọc.
  const range = XLSX.utils.decode_range(ws["!ref"]);
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: range.e.c } }) };
  ws["!cols"] = [
    { wch: 7 },
    { wch: 30 },
    { wch: 24 },
    { wch: 22 },
    { wch: 30 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 38 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Danh sách hộ gia đình");

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  XLSX.writeFile(wb, `Danh-sach-ho-gia-dinh-${yyyy}-${mm}-${dd}.xlsx`);
}

[els.search, els.village, els.status].forEach(el => el.addEventListener("input", render));
els.clear.addEventListener("click", () => {
  els.search.value = "";
  els.village.value = "";
  els.status.value = "active";
  render();
});
els.exportExcel?.addEventListener("click", exportCurrentListToExcel);
els.logout.addEventListener("click", () => signOut(auth));
