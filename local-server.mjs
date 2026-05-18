import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { _handlePayload } = require("./api/submit.js");
const { _getSubmissions } = require("./api/submissions.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function sendFile(res, requestedPath) {
  const cleanPath = requestedPath === "/" ? "/index.html" : requestedPath;
  const safePath = path.normalize(cleanPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "content-type": contentTypes[ext] || "application/octet-stream"
    });
    res.end(data);
  } catch {
    res.writeHead(404, {
      "content-type": "text/plain; charset=utf-8"
    });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (url.pathname === "/api/submit") {
    if (req.method !== "POST") {
      res.writeHead(405, {
        "content-type": "application/json; charset=utf-8"
      });
      res.end(JSON.stringify({ ok: false, message: "Method not allowed" }));
      return;
    }

    try {
      const raw = await readRequestBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const result = await _handlePayload(payload, req.headers);
      res.writeHead(result.status, {
        "content-type": "application/json; charset=utf-8"
      });
      res.end(JSON.stringify(result.body));
    } catch (error) {
      console.error(error);
      res.writeHead(500, {
        "content-type": "application/json; charset=utf-8"
      });
      res.end(JSON.stringify({ ok: false, message: "提交失败，请稍后重试。" }));
    }
    return;
  }

  if (url.pathname === "/api/submissions") {
    if (req.method !== "GET") {
      res.writeHead(405, {
        "content-type": "application/json; charset=utf-8"
      });
      res.end(JSON.stringify({ ok: false, message: "Method not allowed" }));
      return;
    }

    try {
      const result = await _getSubmissions(req);
      res.writeHead(result.status, {
        "content-type": "application/json; charset=utf-8"
      });
      res.end(JSON.stringify(result.body));
    } catch (error) {
      console.error(error);
      res.writeHead(500, {
        "content-type": "application/json; charset=utf-8"
      });
      res.end(JSON.stringify({ ok: false, message: "读取汇总失败。" }));
    }
    return;
  }

  await sendFile(res, url.pathname);
});

server.listen(port, () => {
  console.log(`AI workflow survey is running at http://localhost:${port}`);
});
