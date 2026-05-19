import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { appendSubmission } = require("../../../../lib/submission-store");

const requiredFields = ["name", "department", "role", "taskTitle"];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function json(body, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        ok: false,
        message: "提交内容格式不正确，请刷新页面后重试。"
      },
      400
    );
  }

  const missing = requiredFields.filter((field) => !hasText(body[field]));

  if (!body.finalConsent) {
    missing.push("finalConsent");
  }

  if (missing.length > 0) {
    return json(
      {
        ok: false,
        message: "请补充必填项后再提交。",
        missing
      },
      400
    );
  }

  const submittedAt = new Date().toISOString();
  const submissionId = `AIWF-${submittedAt.slice(0, 10).replace(/-/g, "")}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;

  const payload = {
    ...body,
    submissionId,
    submittedAt,
    userAgent: request.headers.get("user-agent") || ""
  };

  try {
    const store = await appendSubmission(payload);

    return json({
      ok: true,
      submissionId,
      stored: true,
      backendStored: true,
      count: store.count,
      message: "提交成功，已写入后台。"
    });
  } catch (error) {
    console.error(error);

    const isStorageConfigError = error && error.code === "STORAGE_NOT_CONFIGURED";
    return json(
      {
        ok: false,
        submissionId,
        stored: false,
        backendStored: false,
        message: isStorageConfigError
          ? error.message
          : "提交失败，后台暂时无法写入，请联系培训组织者。"
      },
      isStorageConfigError ? 503 : 500
    );
  }
}
