const storageKey = "ai-workflow-preclass-survey";

const steps = [
  ["个人背景", "确认岗位和 AI 使用基础"],
  ["真实任务", "把一个高频工作说清楚"],
  ["材料输出", "找到输入、标准和样例"],
  ["系统雏形", "圈出 AI 步骤和人工检查点"]
];

const defaultState = {
  name: "",
  department: "",
  role: "",
  contact: "",
  aiUsageLevel: "",
  aiCurrentUse: "",
  taskTitle: "",
  taskDescription: "",
  taskFrequency: "",
  currentTimeCost: "",
  taskCategory: "",
  painPoints: [],
  painPointOther: "",
  inputMaterials: [],
  materialSample: "",
  outputTypes: [],
  outputAudience: "",
  outputStandard: "",
  idealSampleAvailable: "",
  aiHelpSteps: [],
  humanCheckItems: [],
  sensitivityLevel: "",
  dataMaskingPlan: "",
  successMetric: "",
  desiredSystemName: "",
  questionsForTraining: "",
  shareWillingness: "",
  finalConsent: false
};

let state = { ...defaultState };
let currentStep = 0;
let finalSummary = "";

const formView = document.getElementById("formView");
const surveyShell = document.getElementById("surveyShell");
const resultView = document.getElementById("resultView");
const surveyForm = document.getElementById("surveyForm");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const submitButton = document.getElementById("submitButton");
const errorMessage = document.getElementById("errorMessage");

function loadState() {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return;
  try {
    state = { ...defaultState, ...JSON.parse(saved) };
  } catch {
    window.localStorage.removeItem(storageKey);
  }
}

function saveState() {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

function setField(field, value) {
  state[field] = value;
  saveState();
  render();
}

function toggleList(field, value) {
  const list = Array.isArray(state[field]) ? state[field] : [];
  state[field] = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  saveState();
  render();
}

function getCompleteness() {
  let score = 0;
  if (state.name && state.department && state.role) score += 15;
  if (state.aiUsageLevel) score += 8;
  if (state.taskTitle && state.taskDescription) score += 18;
  if (state.taskFrequency && state.currentTimeCost) score += 12;
  if (state.painPoints.length > 0 || state.painPointOther) score += 10;
  if (state.inputMaterials.length > 0) score += 10;
  if (state.outputTypes.length > 0 && state.outputStandard) score += 12;
  if (state.aiHelpSteps.length > 0) score += 8;
  if (state.humanCheckItems.length > 0 && state.sensitivityLevel) score += 7;
  return Math.min(score, 100);
}

function getWorkflowPotential() {
  let score = 0;
  if (["每天", "每周"].includes(state.taskFrequency)) score += 25;
  if (state.inputMaterials.length > 0) score += 20;
  if (state.outputTypes.length > 0) score += 20;
  if (state.outputStandard.trim().length > 12) score += 15;
  if (state.humanCheckItems.length > 0) score += 10;
  if (state.idealSampleAvailable === "可以带脱敏样例") score += 10;
  return Math.min(score, 100);
}

function getPotentialLabel(score) {
  if (score >= 80) return "很适合课堂深挖";
  if (score >= 55) return "适合做工作流";
  if (score >= 30) return "需要补充材料";
  return "先把任务说具体";
}

function join(values, extra) {
  const list = Array.isArray(values) ? [...values] : [];
  if (extra) list.push(extra);
  return list.filter(Boolean).join("、");
}

function buildSummary(submissionId) {
  return [
    submissionId ? `提交编号：${submissionId}` : "",
    `姓名/部门/岗位：${state.name || "未填"} / ${state.department || "未填"} / ${state.role || "未填"}`,
    `AI基础：${state.aiUsageLevel || "未填"}；当前用法：${state.aiCurrentUse || "未填"}`,
    `想改造的任务：${state.taskTitle || "未填"}`,
    `任务描述：${state.taskDescription || "未填"}`,
    `频率和耗时：${state.taskFrequency || "未填"}；${state.currentTimeCost || "未填"}`,
    `任务类型：${state.taskCategory || "未填"}`,
    `主要痛点：${join(state.painPoints, state.painPointOther) || "未填"}`,
    `输入材料：${join(state.inputMaterials) || "未填"}`,
    `期望输出：${join(state.outputTypes) || "未填"}；面向对象：${state.outputAudience || "未填"}`,
    `输出标准：${state.outputStandard || "未填"}`,
    `可由AI处理的步骤：${join(state.aiHelpSteps) || "未填"}`,
    `人工检查点：${join(state.humanCheckItems) || "未填"}`,
    `敏感级别和脱敏方式：${state.sensitivityLevel || "未填"}；${state.dataMaskingPlan || "未填"}`,
    `想形成的小系统：${state.desiredSystemName || "未填"}`,
    `成功标准：${state.successMetric || "未填"}`,
    `课堂最想解决的问题：${state.questionsForTraining || "未填"}`,
    `分享意愿：${state.shareWillingness || "未填"}`
  ]
    .filter(Boolean)
    .join("\n");
}

function validateStep() {
  if (currentStep === 0) {
    return state.name && state.department && state.role && state.aiUsageLevel;
  }
  if (currentStep === 1) {
    return state.taskTitle && state.taskDescription && state.taskFrequency;
  }
  if (currentStep === 2) {
    return state.inputMaterials.length > 0 && state.outputTypes.length > 0;
  }
  return true;
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.hidden = true;
}

function setSubmitButtonText(label) {
  const textNode = [...submitButton.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.textContent = ` ${label} `;
  }
}

function render() {
  document.querySelectorAll("[data-field]").forEach((element) => {
    const field = element.dataset.field;
    if (element.type === "checkbox") {
      element.checked = Boolean(state[field]);
    } else if (element.value !== state[field]) {
      element.value = state[field] || "";
    }
  });

  document.querySelectorAll("[data-choice-group]").forEach((group) => {
    const field = group.dataset.choiceGroup;
    const isMulti = group.dataset.multi === "true";
    group.querySelectorAll("[data-choice]").forEach((button) => {
      const value = button.dataset.choice;
      const selected = isMulti ? state[field].includes(value) : state[field] === value;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  });

  document.querySelectorAll("[data-step-section]").forEach((section) => {
    section.classList.toggle("active", Number(section.dataset.stepSection) === currentStep);
  });

  const stepItems = document.querySelectorAll("#stepList li");
  stepItems.forEach((item, index) => {
    item.classList.toggle("active", index === currentStep);
    item.classList.toggle("done", index < currentStep);
  });

  document.getElementById("stepCounter").textContent = `第 ${currentStep + 1} 部分 / 共 ${steps.length} 部分`;
  document.getElementById("stepTitle").textContent = steps[currentStep][0];
  document.getElementById("stepNote").textContent = steps[currentStep][1];

  const completeness = getCompleteness();
  document.getElementById("completenessText").textContent = `${completeness}%`;
  document.getElementById("completenessBar").style.width = `${completeness}%`;

  const potential = getWorkflowPotential();
  document.getElementById("potentialLabel").textContent = getPotentialLabel(potential);
  document.getElementById("potentialScore").textContent = `工作流潜力 ${potential}%`;
  document.getElementById("caseHint").textContent =
    state.taskTitle || "填写真实任务后，这里会逐步形成讲师筛选案例的线索。";

  prevButton.disabled = currentStep === 0;
  nextButton.hidden = currentStep === steps.length - 1;
  submitButton.hidden = currentStep !== steps.length - 1;
}

function goNext() {
  if (!validateStep()) {
    showError("先把本页的关键项补齐，后面的工作流才会有根。");
    return;
  }
  clearError();
  currentStep = Math.min(currentStep + 1, steps.length - 1);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goPrev() {
  clearError();
  currentStep = Math.max(currentStep - 1, 0);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function submitSurvey(event) {
  event.preventDefault();
  clearError();

  if (!state.finalConsent) {
    showError("请先确认已脱敏并同意提交。");
    return;
  }

  submitButton.disabled = true;
  setSubmitButtonText("提交中");

  const payload = {
    ...state,
    completeness: getCompleteness(),
    workflowPotential: getWorkflowPotential(),
    instructorSummary: buildSummary()
  };

  try {
    const response = await fetch("/api/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.message || "提交失败，请稍后重试。");
    }
    finalSummary = buildSummary(data.submissionId);
    showResult(data);
  } catch (error) {
    showError(error.message || "提交失败，请稍后重试。");
  } finally {
    submitButton.disabled = false;
    setSubmitButtonText("提交问卷");
  }
}

function showResult(data) {
  window.localStorage.removeItem(storageKey);
  formView.hidden = true;
  surveyShell.hidden = true;
  resultView.hidden = false;
  document.getElementById("resultMessage").textContent = data.message;
  document.getElementById("submissionId").textContent = data.submissionId;
  document.getElementById("storageStatus").textContent = data.webhookStored
    ? "已写入外部收集端点"
    : data.localStored
      ? "已写入本地备份"
      : "未写入";
  document.getElementById("summaryText").textContent = finalSummary;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function copySummary() {
  await navigator.clipboard.writeText(finalSummary);
  const copyButton = document.getElementById("copyButton");
  const originalText = copyButton.lastChild.textContent;
  copyButton.lastChild.textContent = "已复制";
  window.setTimeout(() => {
    copyButton.lastChild.textContent = originalText;
  }, 1600);
}

function downloadSummary() {
  const blob = new Blob([finalSummary], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${state.name || "AI工作流问卷"}-课前摘要.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function restart() {
  state = { ...defaultState };
  currentStep = 0;
  finalSummary = "";
  resultView.hidden = true;
  formView.hidden = false;
  surveyShell.hidden = false;
  clearError();
  saveState();
  render();
}

loadState();
render();

document.querySelectorAll("[data-field]").forEach((element) => {
  const field = element.dataset.field;
  const eventName = element.type === "checkbox" ? "change" : "input";
  element.addEventListener(eventName, () => {
    setField(field, element.type === "checkbox" ? element.checked : element.value);
  });
});

document.querySelectorAll("[data-choice-group]").forEach((group) => {
  const field = group.dataset.choiceGroup;
  const isMulti = group.dataset.multi === "true";
  group.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      if (isMulti) {
        toggleList(field, button.dataset.choice);
      } else {
        setField(field, button.dataset.choice);
      }
    });
  });
});

prevButton.addEventListener("click", goPrev);
nextButton.addEventListener("click", goNext);
surveyForm.addEventListener("submit", submitSurvey);
document.getElementById("copyButton").addEventListener("click", copySummary);
document.getElementById("downloadButton").addEventListener("click", downloadSummary);
document.getElementById("restartButton").addEventListener("click", restart);
