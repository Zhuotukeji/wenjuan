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

async function readFromWebhook(req) {
  const webhookUrl =
    process.env.QUESTIONNAIRE_WEBHOOK_URL ||
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.FORM_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      configured: false,
      submissions: [],
      error: ""
    };
  }

  const url = new URL(webhookUrl);
  url.searchParams.set("action", "list");

  const token = getRequestToken(req);
  if (token) {
    url.searchParams.set("token", token);
  }

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Webhook list failed with status ${response.status}`);
    }

    const data = await response.json();
    return {
      configured: true,
      submissions: Array.isArray(data.submissions) ? data.submissions : [],
      error: data.ok === false ? data.message || "Webhook list failed" : ""
    };
  } catch (error) {
    console.error(error);
    return {
      configured: true,
      submissions: [],
      error: error instanceof Error ? error.message : "Webhook list failed"
    };
  }
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

  const [localSubmissions, webhookResult] = await Promise.all([
    readSubmissions().catch((error) => {
      console.error(error);
      return [];
    }),
    readFromWebhook(req)
  ]);

  const source = webhookResult.configured && !webhookResult.error ? "webhook" : "local";
  const submissions = source === "webhook" ? webhookResult.submissions : localSubmissions;

  return {
    status: 200,
    body: {
      ok: true,
      source,
      count: submissions.length,
      submissions,
      warning: webhookResult.error
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
