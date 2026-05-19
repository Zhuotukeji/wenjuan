const { Redis } = require("@upstash/redis");

const SUBMISSIONS_KEY = "ai-workflow-survey:submissions";

let redisClient;

function getEnv(name) {
  return process.env[name] || "";
}

function getRestConfigFromRedisUrl(value) {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (!["redis:", "rediss:"].includes(parsed.protocol)) return null;

    const host = parsed.hostname;
    const token = decodeURIComponent(parsed.password || "");

    if (!host || !token) return null;

    return {
      source: parsed.protocol === "rediss:" ? "rediss-url" : "redis-url",
      url: `https://${host}`,
      token
    };
  } catch {
    return null;
  }
}

function getRedisConfig() {
  const candidates = [
    {
      source: "vercel-kv-rest",
      url: getEnv("KV_REST_API_URL"),
      token: getEnv("KV_REST_API_TOKEN")
    },
    {
      source: "upstash-rest",
      url: getEnv("UPSTASH_REDIS_REST_URL"),
      token: getEnv("UPSTASH_REDIS_REST_TOKEN")
    },
    getRestConfigFromRedisUrl(getEnv("KV_URL")),
    getRestConfigFromRedisUrl(getEnv("REDIS_URL"))
  ].filter(Boolean);

  const config = candidates.find((item) => item.url && item.token);
  if (!config) return null;

  return {
    url: config.url,
    token: config.token
  };
}

function getRedis() {
  if (redisClient) return redisClient;

  const config = getRedisConfig();
  if (!config) {
    const error = new Error(
      "后台存储未配置，请在 Vercel 中绑定 Upstash Redis，并确认已设置 KV_REST_API_URL 和 KV_REST_API_TOKEN。"
    );
    error.code = "STORAGE_NOT_CONFIGURED";
    throw error;
  }

  redisClient = new Redis(config);
  return redisClient;
}

function normalizeSubmission(raw) {
  if (typeof raw === "string") {
    return JSON.parse(raw);
  }

  return raw;
}

async function appendSubmission(submission) {
  const redis = getRedis();
  const serialized = JSON.stringify(submission);

  await redis.lpush(SUBMISSIONS_KEY, serialized);
  const count = await redis.llen(SUBMISSIONS_KEY);

  return {
    count
  };
}

async function readSubmissions() {
  const redis = getRedis();
  const rows = await redis.lrange(SUBMISSIONS_KEY, 0, -1);

  return rows.map(normalizeSubmission).filter(Boolean);
}

module.exports = {
  appendSubmission,
  readSubmissions
};
