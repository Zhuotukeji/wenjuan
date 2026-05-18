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
    row.innerHTML = `<span>${label}</span><strong>${count}</strong>`;
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
  submissionList.innerHTML = "";

  if (!filteredSubmissions.length) {
    submissionList.innerHTML = `
      <div class="empty-state">
        <strong>没有匹配的问卷结果</strong>
        <p>可以调整关键词、部门或任务类型筛选。</p>
      </div>
    `;
    return;
  }

  filteredSubmissions.forEach((item) => {
    const card = document.createElement("article");
    card.className = "submission-card";
    card.innerHTML = `
      <div class="submission-head">
        <div>
          <span>${text(item.department)} · ${text(item.role)}</span>
          <h2>${text(item.taskTitle)}</h2>
        </div>
        <div class="score-pair">
          <strong>${number(item.workflowPotential)}%</strong>
          <span>工作流潜力</span>
        </div>
      </div>
      <dl class="submission-grid">
        <div><dt>姓名</dt><dd>${text(item.name)}</dd></div>
        <div><dt>频率/耗时</dt><dd>${text(item.taskFrequency)} / ${text(item.currentTimeCost)}</dd></div>
        <div><dt>任务类型</dt><dd>${text(item.taskCategory)}</dd></div>
        <div><dt>分享意愿</dt><dd>${text(item.shareWillingness)}</dd></div>
      </dl>
      <div class="submission-section">
        <strong>主要痛点</strong>
        <p>${text(item.painPoints)}${item.painPointOther ? `、${item.painPointOther}` : ""}</p>
      </div>
      <div class="submission-section">
        <strong>输入与输出</strong>
        <p>输入：${text(item.inputMaterials)}</p>
        <p>输出：${text(item.outputTypes)}</p>
      </div>
      <details>
        <summary>查看讲师摘要</summary>
        <pre>${text(item.instructorSummary)}</pre>
      </details>
    `;
    submissionList.appendChild(card);
  });
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
    document.getElementById("sourceLabel").textContent =
      data.source === "webhook" ? "数据源：外部收集端点" : "数据源：本地备份";
    document.getElementById("warningLabel").textContent = data.warning || "";
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
  const headers = ["提交时间", "姓名", "部门", "岗位", "任务", "频率", "耗时", "任务类型", "痛点", "输入材料", "输出结果", "工作流潜力", "讲师摘要"];
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
