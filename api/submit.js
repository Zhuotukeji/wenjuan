const { randomUUID } = require("crypto");
const { appendSubmission } = require("../lib/submission-store");

const requiredFields = ["name", "department", "role", "taskTitle"];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function forwardToWebhook(payload) {
  const webhookUrl =
    process.env.QUESTIONNAIRE_WEBHOOK_URL ||
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.FORM_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      configured: false,
      ok: true
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with status ${response.status}`);
  }

  return {
    configured: true,
    ok: true
  };
}

async function tryForwardToWebhook(payload) {
  try {
    const result = await forwardToWebhook(payload);
    return {
      ...result,
      error: ""
    };
  } catch (error) {
    console.error(error);
    return {
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : "Webhook failed"
    };
  }
}

async function tryStoreLocally(payload) {
  try {
    const result = await appendSubmission(payload);
    return {
      ok: true,
      count: result.count,
      path: result.path,
      error: ""
    };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      count: 0,
      path: "",
      error: error instanceof Error ? error.message : "Local store failed"
    };
  }
}

async function handlePayload(body, headers = {}) {
  const missing = requiredFields.filter((field) => !hasText(body[field]));

  if (!body.finalConsent) {
    missing.push("finalConsent");
  }

  if (missing.length > 0) {
    return {
      status: 400,
      body: {
        ok: false,
        message: "请补充必填项后再提交。",
        missing
      }
    };
  }

  const submittedAt = new Date().toISOString();
  const submissionId = `AIWF-${submittedAt.slice(0, 10).replace(/-/g, "")}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;

  const payload = {
    ...body,
    submissionId,
    submittedAt,
    userAgent: headers["user-agent"] || headers["User-Agent"] || ""
  };

  const localStore = await tryStoreLocally(payload);
  const forwarding = await tryForwardToWebhook(payload);
  const stored = localStore.ok || forwarding.ok;
  const warnings = [localStore.error, forwarding.error].filter(Boolean);

  return {
    status: stored ? 200 : 500,
    body: {
      ok: stored,
      submissionId,
      stored,
      localStored: localStore.ok,
      webhookStored: forwarding.configured && forwarding.ok,
      warnings,
      message: stored
        ? forwarding.configured && forwarding.ok
          ? "提交成功，问卷已收集。"
          : "提交成功，已写入本地备份。当前未配置或未连通外部收集端点。"
        : "提交失败，未能写入任何收集端点，请联系培训组织者。"
    }
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, message: "Method not allowed" }));
    return;
  }

  try {
    const body = await readJson(req);
    const result = await handlePayload(body, req.headers);
    res.statusCode = result.status;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(result.body));
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        ok: false,
        message: "提交失败，请稍后重试或联系培训组织者。"
      })
    );
  }
};

module.exports._handlePayload = handlePayload;
