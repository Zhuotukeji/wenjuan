const { readSubmissions } = require("../lib/submission-store");

function getExpectedToken() {
  return process.env.ADMIN_TOKEN || process.env.QUESTIONNAIRE_ADMIN_TOKEN || "";
}

function getRequestToken(req) {
  const url = new URL(req.url || "/api/submissions", "http://localhost");
  return (
    url.searchParams.get("token") ||
    req.headers["x-admin-token"] ||
    req.headers["X-Admin-Token"] ||
    ""
  );
}

function authorize(req) {
  const expectedToken = getExpectedToken();
  if (!expectedToken) {
    return true;
  }

  return getRequestToken(req) === expectedToken;
}

async function getSubmissions(req) {
  if (!authorize(req)) {
    return {
      status: 401,
      body: {
        ok: false,
        message: "管理口令不正确。"
      }
    };
  }

  const submissions = await readSubmissions();

  return {
    status: 200,
    body: {
      ok: true,
      source: "backend",
      count: submissions.length,
      submissions
    }
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, message: "Method not allowed" }));
    return;
  }

  try {
    const result = await getSubmissions(req);
    res.statusCode = result.status;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(result.body));
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, message: "读取汇总失败。" }));
  }
};

module.exports._getSubmissions = getSubmissions;
