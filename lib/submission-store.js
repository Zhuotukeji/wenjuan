const { Redis } = require("@upstash/redis");

const SUBMISSIONS_KEY = "ai-workflow-survey:submissions";

let redisClient;

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

  if (!url || !token) {
    return null;
  }

  return {
    url,
    token
  };
}

function getRedis() {
  if (redisClient) return redisClient;

  const config = getRedisConfig();
  if (!config) {
    const error = new Error(
      "后台存储未配置，请在 Vercel 中绑定 Upstash Redis，并设置 UPSTASH_REDIS_REST_URL 和 UPSTASH_REDIS_REST_TOKEN。"
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
