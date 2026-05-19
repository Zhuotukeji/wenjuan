import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getRequestToken, verifyAdminToken } = require("../../../../lib/admin-auth");
const { readSubmissions } = require("../../../../lib/submission-store");

function json(body, status = 200) {
  return Response.json(body, { status });
}

export async function GET(request) {
  const auth = verifyAdminToken(getRequestToken(request));

  if (!auth.ok) {
    return json(
      {
        ok: false,
        message: auth.message
      },
      auth.status
    );
  }

  try {
    const submissions = await readSubmissions();

    return json({
      ok: true,
      source: "upstash-redis",
      count: submissions.length,
      submissions
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        message:
          error && error.code === "STORAGE_NOT_CONFIGURED"
            ? error.message
            : "读取汇总失败。"
      },
      error && error.code === "STORAGE_NOT_CONFIGURED" ? 503 : 500
    );
  }
}
