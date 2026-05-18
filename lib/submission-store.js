const fs = require("fs/promises");
const path = require("path");

function getStorePath() {
  if (process.env.SUBMISSION_STORE_PATH) {
    return process.env.SUBMISSION_STORE_PATH;
  }

  if (process.env.VERCEL) {
    return path.join("/tmp", "ai-workflow-survey-submissions.json");
  }

  return path.join(process.cwd(), "data", "submissions.json");
}

async function readSubmissions() {
  const storePath = getStorePath();

  try {
    const content = await fs.readFile(storePath, "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeSubmissions(submissions) {
  const storePath = getStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  const temporaryPath = `${storePath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(submissions, null, 2), "utf8");
  await fs.rename(temporaryPath, storePath);
}

async function appendSubmission(submission) {
  const submissions = await readSubmissions();
  submissions.push(submission);
  await writeSubmissions(submissions);

  return {
    count: submissions.length,
    path: getStorePath()
  };
}

module.exports = {
  appendSubmission,
  getStorePath,
  readSubmissions
};
