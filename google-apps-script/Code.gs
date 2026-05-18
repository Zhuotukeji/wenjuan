const SHEET_NAME = "AI_Workflow_Preclass_Survey";

const FIELDS = [
  ["submittedAt", "submitted_at"],
  ["submissionId", "submission_id"],
  ["name", "name"],
  ["department", "department"],
  ["role", "role"],
  ["contact", "contact"],
  ["aiUsageLevel", "ai_usage_level"],
  ["aiCurrentUse", "ai_current_use"],
  ["taskTitle", "task_title"],
  ["taskDescription", "task_description"],
  ["taskFrequency", "task_frequency"],
  ["currentTimeCost", "current_time_cost"],
  ["taskCategory", "task_category"],
  ["painPoints", "pain_points"],
  ["inputMaterials", "input_materials"],
  ["materialSample", "material_sample"],
  ["outputTypes", "output_types"],
  ["outputAudience", "output_audience"],
  ["outputStandard", "output_standard"],
  ["idealSampleAvailable", "ideal_sample_available"],
  ["aiHelpSteps", "ai_help_steps"],
  ["humanCheckItems", "human_check_items"],
  ["sensitivityLevel", "sensitivity_level"],
  ["dataMaskingPlan", "data_masking_plan"],
  ["desiredSystemName", "desired_system_name"],
  ["successMetric", "success_metric"],
  ["questionsForTraining", "questions_for_training"],
  ["shareWillingness", "share_willingness"],
  ["completeness", "completeness"],
  ["workflowPotential", "workflow_potential"],
  ["instructorSummary", "instructor_summary"]
];

function setup() {
  const sheet = getSheet_();
  ensureHeaders_(sheet);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    ensureHeaders_(sheet);

    sheet.appendRow(
      FIELDS.map(([key]) => {
        if (key === "submittedAt") return data.submittedAt || new Date().toISOString();
        if (key === "painPoints") return join_(data.painPoints, data.painPointOther);
        if (key === "inputMaterials") return join_(data.inputMaterials);
        if (key === "outputTypes") return join_(data.outputTypes);
        if (key === "aiHelpSteps") return join_(data.aiHelpSteps);
        if (key === "humanCheckItems") return join_(data.humanCheckItems);
        return data[key] || "";
      })
    );

    return json_({
      ok: true
    });
  } catch (error) {
    return json_({
      ok: false,
      message: String(error)
    });
  }
}

function doGet(e) {
  const action = e.parameter.action || "";
  if (action !== "list") {
    return json_({
      ok: true,
      message: "AI workflow survey endpoint is ready."
    });
  }

  const expectedToken =
    PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN") || "";

  if (expectedToken && e.parameter.token !== expectedToken) {
    return json_({
      ok: false,
      message: "Unauthorized"
    });
  }

  const sheet = getSheet_();
  ensureHeaders_(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return json_({
      ok: true,
      submissions: []
    });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, FIELDS.length).getValues();
  const submissions = rows.map((row) => {
    const item = {};
    FIELDS.forEach(([key], index) => {
      item[key] = restoreValue_(key, row[index]);
    });
    return item;
  });

  return json_({
    ok: true,
    submissions
  });
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  const headers = FIELDS.map(([, header]) => header);
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeaders = currentHeaders.every((value) => !value);
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
}

function join_(values, extra) {
  const list = Array.isArray(values) ? values.slice() : [];
  if (extra) list.push(extra);
  return list.filter(Boolean).join(" | ");
}

function restoreValue_(key, value) {
  const listFields = [
    "painPoints",
    "inputMaterials",
    "outputTypes",
    "aiHelpSteps",
    "humanCheckItems"
  ];

  if (listFields.indexOf(key) !== -1) {
    return String(value || "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value || "";
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
