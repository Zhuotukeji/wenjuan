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

  try {
    const store = await appendSubmission(payload);
    return {
      status: 200,
      body: {
        ok: true,
        submissionId,
        stored: true,
        backendStored: true,
        localStored: true,
        count: store.count,
        message: "提交成功，已写入后台。"
      }
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      body: {
        ok: false,
        submissionId,
        stored: false,
        backendStored: false,
        localStored: false,
        message: "提交失败，后台暂时无法写入，请联系培训组织者。"
      }
    };
  }
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
