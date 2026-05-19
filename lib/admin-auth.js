function getExpectedAdminToken() {
  return process.env.ADMIN_TOKEN || process.env.QUESTIONNAIRE_ADMIN_TOKEN || "";
}

function isProduction() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

function assertAdminConfigured() {
  const expectedToken = getExpectedAdminToken();

  if (!expectedToken && isProduction()) {
    return {
      ok: false,
      status: 500,
      message: "后台管理口令未配置，请在 Vercel 环境变量中设置 ADMIN_TOKEN。"
    };
  }

  return {
    ok: true,
    expectedToken
  };
}

function getRequestToken(request) {
  const url = new URL(request.url);
  return (
    url.searchParams.get("token") ||
    request.headers.get("x-admin-token") ||
    ""
  );
}

async function getJsonToken(request) {
  try {
    const body = await request.json();
    return typeof body.token === "string" ? body.token : "";
  } catch {
    return "";
  }
}

function verifyAdminToken(token) {
  const config = assertAdminConfigured();
  if (!config.ok) return config;

  if (!config.expectedToken) {
    return {
      ok: true
    };
  }

  if (token !== config.expectedToken) {
    return {
      ok: false,
      status: 401,
      message: "管理口令不正确。"
    };
  }

  return {
    ok: true
  };
}

module.exports = {
  assertAdminConfigured,
  getJsonToken,
  getRequestToken,
  verifyAdminToken
};
