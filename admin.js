const tokenStorageKey = "ai-workflow-admin-token";

let submissions = [];
let filteredSubmissions = [];

const adminToken = document.getElementById("adminToken");
const searchInput = document.getElementById("searchInput");
const departmentFilter = document.getElementById("departmentFilter");
const categoryFilter = document.getElementById("categoryFilter");
const refreshButton = document.getElementById("refreshButton");
const adminError = document.getElementById("adminError");
const submissionList = document.getElementById("submissionList");

function text(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join("、");
  return value == null || value === "" ? "未填" : String(value);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showAdminError(message) {
  adminError.textContent = message;
  adminError.hidden = false;
}

function clearAdminError() {
  adminError.textContent = "";
  adminError.hidden = true;
}

function average(items, field) {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => sum + number(item[field]), 0);
  return Math.round(total / items.length);
}

function getSearchBlob(item) {
  return [
    item.name,
    item.department,
    item.role,
    item.taskTitle,
    item.taskDescription,
    item.taskCategory,
    text(item.painPoints),
    text(item.inputMaterials),
    text(item.outputTypes),
    item.outputStandard,
    item.instructorSummary
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function uniqueValues(field) {
  return [...new Set(submissions.map((item) => item[field]).filter(Boolean))].sort();
}

function renderSelectOptions(select, values, placeholder) {
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = values.includes(current) ? current : "";
}

function updateFilters() {
  renderSelectOptions(departmentFilter, uniqueValues("department"), "全部部门");
  renderSelectOptions(categoryFilter, uniqueValues("taskCategory"), "全部类型");
}

function getFilteredSubmissions() {
  const keyword = searchInput.value.trim().toLowerCase();
  const department = departmentFilter.value;
  const category = categoryFilter.value;

  return submissions.filter((item) => {
    if (department && item.department !== department) return false;
    if (category && item.taskCategory !== category) return false;
    if (keyword && !getSearchBlob(item).includes(keyword)) return false;
    return true;
  });
}

function countBy(items, field) {
  const counts = new Map();
  items.forEach((item) => {
    const value = item[field] || "未填";
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function countListValues(items, field) {
  const counts = new Map();
  items.forEach((item) => {
    const values = Array.isArray(item[field]) ? item[field] : String(item[field] || "").split("、");
    values
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

function renderBreakdown(containerId, rows) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!rows.length) {
    container.innerHTML = `<p class="muted">暂无数据</p>`;
    return;
  }

  rows.forEach(([label, count]) => {
    const row = document.createElement("div");
    row.className = "breakdown-row";
    row.innerHTML = `<span>${escapeHtml(label)}</span><strong>${count}</strong>`;
    container.appendChild(row);
  });
}

function renderStats() {
  document.getElementById("totalCount").textContent = submissions.length;
  document.getElementById("filteredCount").textContent = filteredSubmissions.length;
  document.getElementById("avgCompleteness").textContent = `${average(filteredSubmissions, "completeness")}%`;
  document.getElementById("avgPotential").textContent = `${average(filteredSubmissions, "workflowPotential")}%`;

  renderBreakdown("departmentBreakdown", countBy(filteredSubmissions, "department"));
  renderBreakdown("painBreakdown", countListValues(filteredSubmissions, "painPoints"));
}

function renderSubmissions() {
  if (!filteredSubmissions.length) {
    submissionList.innerHTML = `
      <div class="empty-state">
        <strong>没有匹配的问卷结果</strong>
        <p>可以调整关键词、部门或任务类型筛选。</p>
      </div>
    `;
    return;
  }

  const rows = filteredSubmissions
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(item.contact)}</small>
          </td>
          <td>${escapeHtml(item.department)}</td>
          <td>${escapeHtml(item.role)}</td>
          <td class="wide-cell">
            <strong>${escapeHtml(item.taskTitle)}</strong>
            <small>${escapeHtml(item.taskDescription)}</small>
          </td>
          <td>${escapeHtml(item.taskFrequency)}</td>
          <td>${escapeHtml(item.currentTimeCost)}</td>
          <td>${escapeHtml(item.taskCategory)}</td>
          <td class="wide-cell">${escapeHtml(item.painPoints)}${item.painPointOther ? `、${escapeHtml(item.painPointOther)}` : ""}</td>
          <td class="wide-cell">${escapeHtml(item.inputMaterials)}</td>
          <td class="wide-cell">${escapeHtml(item.outputTypes)}</td>
          <td>${number(item.completeness)}%</td>
          <td>${number(item.workflowPotential)}%</td>
          <td>${escapeHtml(item.shareWillingness)}</td>
          <td>
            <details>
              <summary>查看</summary>
              <pre>${escapeHtml(item.instructorSummary)}</pre>
            </details>
          </td>
        </tr>
      `
    )
    .join("");

  submissionList.innerHTML = `
    <div class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>姓名</th>
            <th>部门</th>
            <th>岗位</th>
            <th>想改造的任务</th>
            <th>频率</th>
            <th>耗时</th>
            <th>类型</th>
            <th>痛点</th>
            <th>输入材料</th>
            <th>期望输出</th>
            <th>完整度</th>
            <th>潜力</th>
            <th>分享</th>
            <th>摘要</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function applyFilters() {
  filteredSubmissions = getFilteredSubmissions();
  renderStats();
  renderSubmissions();
}

async function loadSubmissions() {
  clearAdminError();
  refreshButton.disabled = true;
  refreshButton.lastChild.textContent = "读取中";

  try {
    const token = adminToken.value.trim();
    window.localStorage.setItem(tokenStorageKey, token);

    const url = new URL("/api/submissions", window.location.origin);
    if (token) url.searchParams.set("token", token);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "读取汇总失败。");
    }

    submissions = Array.isArray(data.submissions) ? data.submissions : [];
    document.getElementById("sourceLabel").textContent = "数据源：后台问卷数据";
    document.getElementById("warningLabel").textContent = "";
    updateFilters();
    applyFilters();
  } catch (error) {
    showAdminError(error.message || "读取汇总失败。");
  } finally {
    refreshButton.disabled = false;
    refreshButton.lastChild.textContent = "刷新";
  }
}

function getSummariesText() {
  return filteredSubmissions
    .map((item, index) => `#${index + 1} ${text(item.name)} - ${text(item.taskTitle)}\n${text(item.instructorSummary)}`)
    .join("\n\n---\n\n");
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  return `"${text(value).replace(/"/g, '""')}"`;
}

function downloadCsv() {
  const headers = [
    "提交时间",
    "姓名",
    "部门",
    "岗位",
    "任务",
    "频率",
    "耗时",
    "任务类型",
    "痛点",
    "输入材料",
    "输出结果",
    "完整度",
    "工作流潜力",
    "讲师摘要"
  ];
  const rows = filteredSubmissions.map((item) => [
    item.submittedAt,
    item.name,
    item.department,
    item.role,
    item.taskTitle,
    item.taskFrequency,
    item.currentTimeCost,
    item.taskCategory,
    text(item.painPoints),
    text(item.inputMaterials),
    text(item.outputTypes),
    item.completeness,
    item.workflowPotential,
    item.instructorSummary
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  download("AI工作流课前问卷汇总.csv", `\ufeff${csv}`, "text/csv;charset=utf-8");
}

async function copySummaries() {
  await navigator.clipboard.writeText(getSummariesText());
  const button = document.getElementById("copySummariesButton");
  button.lastChild.textContent = "已复制";
  window.setTimeout(() => {
    button.lastChild.textContent = "复制摘要";
  }, 1600);
}

adminToken.value = window.localStorage.getItem(tokenStorageKey) || "";

refreshButton.addEventListener("click", loadSubmissions);
searchInput.addEventListener("input", applyFilters);
departmentFilter.addEventListener("change", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
document.getElementById("copySummariesButton").addEventListener("click", copySummaries);
document.getElementById("downloadCsvButton").addEventListener("click", downloadCsv);
document.getElementById("downloadJsonButton").addEventListener("click", () => {
  download("AI工作流课前问卷汇总.json", JSON.stringify(filteredSubmissions, null, 2), "application/json;charset=utf-8");
});

loadSubmissions();
