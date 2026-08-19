import { auth, db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const els = {
  denied: document.querySelector("#adminDenied"),
  content: document.querySelector("#adminContent"),
  defaultCommune: document.querySelector("#defaultCommune"),
  files: document.querySelector("#excelFiles"),
  previewBtn: document.querySelector("#previewBtn"),
  importBtn: document.querySelector("#importBtn"),
  message: document.querySelector("#importMessage"),
  previewCount: document.querySelector("#previewCount"),
  fileCount: document.querySelector("#fileCount"),
  previewVillages: document.querySelector("#previewVillages"),
  previewBody: document.querySelector("#previewBody"),
  manageBody: document.querySelector("#manageBody"),
  manageSearch: document.querySelector("#manageSearch"),
  reload: document.querySelector("#reloadBtn"),
  logout: document.querySelector("#logoutBtn")
};

let previewRows = [];
let currentRows = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists() || userDoc.data().role !== "admin") {
    els.denied.classList.remove("hidden");
    return;
  }
  els.content.classList.remove("hidden");
  await loadCurrentRows();
});

els.previewBtn.addEventListener("click", async () => {
  const files = [...els.files.files];
  if (!files.length) {
    setMessage("Bạn chưa chọn file Excel.", true);
    return;
  }
  setMessage("Đang đọc file...");
  previewRows = [];
  for (const file of files) {
    try {
      const rows = await parseExcelFile(file);
      previewRows.push(...rows);
    } catch (error) {
      console.error(file.name, error);
      setMessage(`Lỗi khi đọc ${file.name}: ${error.message}`, true);
      return;
    }
  }

  // Chỉ loại bản ghi TRÙNG HOÀN TOÀN theo khóa nguồn đã tạo.
  // Không gộp các hộ chỉ vì cùng họ tên và cùng địa chỉ.
  const map = new Map();
  let exactDuplicateCount = 0;
  for (const row of previewRows) {
    if (map.has(row._key)) exactDuplicateCount++;
    map.set(row._key, row);
  }
  previewRows = [...map.values()];

  renderPreview();
  els.importBtn.disabled = previewRows.length === 0;

  const sameNameGroups = findSameNameGroups(previewRows);
  const notes = [];
  if (exactDuplicateCount > 0) {
    notes.push(`đã bỏ ${exactDuplicateCount} dòng trùng hoàn toàn`);
  }
  if (sameNameGroups.length > 0) {
    notes.push(`phát hiện ${sameNameGroups.length} nhóm chủ hộ trùng tên nhưng vẫn GIỮ RIÊNG từng hộ`);
  }

  setMessage(
    `Đã đọc ${previewRows.length.toLocaleString("vi-VN")} hộ hợp lệ từ ${files.length} file` +
    (notes.length ? `. Lưu ý: ${notes.join("; ")}.` : ".")
  );
});

els.importBtn.addEventListener("click", async () => {
  if (!previewRows.length) return;
  els.importBtn.disabled = true;
  setMessage("Đang ghi dữ liệu vào Firebase...");
  try {
    let done = 0;
    const chunks = chunk(previewRows, 400);
    for (const group of chunks) {
      const batch = writeBatch(db);
      for (const row of group) {
        const ref = doc(db, "households", row._key);
        const { _key, ...payload } = row;
        batch.set(ref, {
          ...payload,
          active: true,
          updatedAt: serverTimestamp(),
          importedAt: serverTimestamp()
        }, { merge: true });
      }
      await batch.commit();
      done += group.length;
      setMessage(`Đã ghi ${done}/${previewRows.length} hộ...`);
    }
    setMessage(`Hoàn thành: ${done.toLocaleString("vi-VN")} hộ. Nếu nhập lại cùng hộ, hệ thống cập nhật thay vì tạo bản trùng.`);
    await loadCurrentRows();
  } catch (error) {
    console.error(error);
    setMessage(`Không ghi được dữ liệu: ${error.message}`, true);
  } finally {
    els.importBtn.disabled = false;
  }
});

async function parseExcelFile(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const output = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    if (!matrix.length) continue;

    const headerIndex = findHeaderRow(matrix);
    if (headerIndex < 0) continue;

    const header = matrix[headerIndex].map(v => normHeader(v));
    const col = {
      stt: findCol(header, ["stt"]),
      name: findCol(header, ["ho va ten", "ho ten"]),
      residence: findCol(header, ["thuong tru phuong xa", "thuong tru", "phuong xa"]),
      address: findCol(header, ["dia chi chi tiet", "dia chi"]),
      population: findCol(header, ["so luong nhan khau", "nhan khau"]),
      floodedFloor: findCol(header, ["ngap nen nha", "ngap nen"]),
      floodedRoof: findCol(header, ["ngap noc nha", "ngap noc"])
    };
    if (col.name < 0 || col.population < 0) continue;

    const villageFromHeading = detectVillage(matrix, headerIndex);
    const communeFromHeading = detectCommune(matrix, headerIndex) || els.defaultCommune.value.trim();

    for (let r = headerIndex + 1; r < matrix.length; r++) {
      const row = matrix[r];
      const headName = clean(row[col.name]);
      if (!headName) continue;

      const sourceStt = clean(valueAt(row, col.stt));
      const permanentResidence = normalizeAdministrativeName(
        clean(valueAt(row, col.residence)) || communeFromHeading
      );
      const detailAddress = clean(valueAt(row, col.address));
      const village = normalizeAdministrativeName(detailAddress || villageFromHeading);
      const population = parseNumber(valueAt(row, col.population));

      const record = {
        headName,
        commune: normalizeAdministrativeName(communeFromHeading),
        permanentResidence,
        village,
        detailAddress,
        population,
        floodedFloor: clean(valueAt(row, col.floodedFloor)),
        floodedRoof: clean(valueAt(row, col.floodedRoof)),
        sourceStt,
        sourceFile: file.name,
        sourceSheet: sheetName,
        sourceRow: r + 1
      };
      record._key = await buildStableId(record);
      output.push(record);
    }
  }
  return output;
}

function findHeaderRow(matrix) {
  const max = Math.min(matrix.length, 30);
  for (let r = 0; r < max; r++) {
    const row = matrix[r].map(v => normHeader(v));
    const hasName = row.some(v => v === "ho va ten" || v.includes("ho va ten"));
    const hasPopulation = row.some(v => v.includes("nhan khau"));
    if (hasName && hasPopulation) return r;
  }
  return -1;
}

function detectVillage(matrix, headerIndex) {
  for (let r = headerIndex - 1; r >= 0; r--) {
    const texts = matrix[r].map(clean).filter(Boolean);
    const candidate = texts.find(v => /^(xom|to|thon|ban)\b/i.test(norm(v)));
    if (candidate) return normalizeAdministrativeName(candidate);
  }
  return "";
}

function detectCommune(matrix, headerIndex) {
  for (let r = 0; r < Math.min(headerIndex, 8); r++) {
    for (const cell of matrix[r]) {
      const text = clean(cell);
      if (/^(xa|phuong|thi tran)\b/i.test(norm(text))) return normalizeAdministrativeName(text);
    }
  }
  return "";
}

function findCol(header, candidates) {
  return header.findIndex(h => candidates.some(c => h === c || h.includes(c)));
}

function valueAt(row, index) {
  return index >= 0 ? row[index] : "";
}

function clean(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function normHeader(v) {
  return norm(v).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function norm(v = "") {
  return String(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(v) {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toTitleCase(s) {
  return clean(s).toLocaleLowerCase("vi").replace(/(^|\s)\S/g, m => m.toLocaleUpperCase("vi"));
}

// Chuẩn hóa cách viết tên đơn vị hành chính/xóm để
// "XÓM BÃI PHẲNG", "Xóm Bãi Phẳng", "xóm bãi phẳng" được hiểu là một.
function normalizeAdministrativeName(value) {
  const text = clean(value);
  if (!text) return "";
  return toTitleCase(text);
}

async function buildStableId(record) {
  // STT nguồn được đưa vào khóa để hai hộ cùng tên/cùng địa chỉ vẫn là hai hộ riêng.
  // Không đưa số nhân khẩu vào khóa vì nhân khẩu có thể thay đổi theo thời gian.
  // Không đưa tên file vào khóa để đổi tên file rồi nhập lại vẫn cập nhật đúng bản ghi.
  const sourceIdentity = record.sourceStt
    ? `stt:${norm(record.sourceStt)}`
    : `row:${norm(record.sourceSheet)}:${record.sourceRow}`;

  const raw = [
    record.commune,
    record.village,
    sourceIdentity,
    record.headName,
    record.detailAddress
  ].map(norm).join("|");

  const bytes = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function findSameNameGroups(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = [row.commune, row.village, row.headName].map(norm).join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.values()].filter(group => group.length > 1);
}

function renderPreview() {
  els.previewCount.textContent = previewRows.length.toLocaleString("vi-VN");
  els.fileCount.textContent = new Set(previewRows.map(x => x.sourceFile)).size.toLocaleString("vi-VN");
  els.previewVillages.textContent = new Set(
    previewRows.map(x => norm(x.village)).filter(Boolean)
  ).size.toLocaleString("vi-VN");
  els.previewBody.innerHTML = previewRows.slice(0, 300).map(row => `
    <tr>
      <td>${escapeHtml(row.headName)}</td>
      <td>${escapeHtml(row.commune)}</td>
      <td>${escapeHtml(row.village)}</td>
      <td>${escapeHtml(row.detailAddress)}</td>
      <td>${row.population}</td>
      <td>${escapeHtml(row.sourceFile)}</td>
      <td>${row.sourceStt ? `STT ${escapeHtml(row.sourceStt)} / dòng ${row.sourceRow}` : row.sourceRow}</td>
    </tr>`).join("");
}

async function loadCurrentRows() {
  const snapshot = await getDocs(collection(db, "households"));
  currentRows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderManage();
}

function renderManage() {
  const key = norm(els.manageSearch.value);
  const rows = currentRows
    .filter(x => !key || norm(`${x.headName} ${x.village} ${x.detailAddress}`).includes(key))
    .sort((a,b) => (a.headName || "").localeCompare(b.headName || "", "vi"))
    .slice(0, 500);

  els.manageBody.innerHTML = rows.map(row => `
    <tr class="${row.active === false ? "inactive-row" : ""}">
      <td>${escapeHtml(row.headName || "")}</td>
      <td>${escapeHtml(row.village || "")}</td>
      <td>${Number(row.population || 0)}</td>
      <td>${row.active === false ? "Đã khóa" : "Đang dùng"}</td>
      <td><button class="btn small toggle-active" data-id="${row.id}" data-active="${row.active === false ? "0" : "1"}">${row.active === false ? "Mở khóa" : "Khóa"}</button></td>
    </tr>`).join("");

  document.querySelectorAll(".toggle-active").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const active = btn.dataset.active === "1";
      await updateDoc(doc(db, "households", id), {
        active: !active,
        updatedAt: serverTimestamp()
      });
      await loadCurrentRows();
    });
  });
}

function setMessage(text, isError = false) {
  els.message.textContent = text;
  els.message.classList.toggle("error", isError);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

els.manageSearch.addEventListener("input", renderManage);
els.reload.addEventListener("click", loadCurrentRows);
els.logout.addEventListener("click", () => signOut(auth));
