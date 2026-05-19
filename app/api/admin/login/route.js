import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getJsonToken, verifyAdminToken } = require("../../../../../lib/admin-auth");

function json(body, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request) {
  const token = await getJsonToken(request);
  const auth = verifyAdminToken(token);

  if (!auth.ok) {
    return json(
      {
        ok: false,
        message: auth.message
      },
      auth.status
    );
  }

  return json({
    ok: true,
    message: "登录成功。"
  });
}
