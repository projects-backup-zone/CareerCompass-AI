/**
 * src/utils/api.js
 *
 * Secure frontend API client — calls the server-side Vercel functions.
 * NO Gemini API key is ever present here. All keys live exclusively in
 * the server-side api/ functions and in the GEMINI_API_KEY environment
 * variable on Vercel (never prefixed with VITE_).
 */

const BASE = import.meta.env.DEV ? "/api" : "/api";

/** Generic POST helper with structured error handling */
async function post(endpoint, body) {
  const response = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned an unexpected response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    // Surface the backend's safe error message; never expose internal server details
    throw new Error(data?.error || `Request failed with status ${response.status}.`);
  }

  return data;
}

/**
 * Analyze a resume image against a target role.
 * @param {string} resumeBase64Url – data URL of the resume image (PNG/JPG)
 * @param {string} targetRole – e.g. "Frontend Developer"
 */
export async function analyzeResume(resumeBase64Url, targetRole = "Frontend Developer") {
  return post("/analyze-resume", { resumeBase64Url, targetRole });
}

/**
 * Match a resume analysis summary against a job description.
 * @param {object} resumeAnalysis – the full object returned by analyzeResume
 * @param {string} jobDescriptionText – raw text of the JD
 */
export async function matchJobDescription(resumeAnalysis, jobDescriptionText) {
  return post("/match-jd", { resumeAnalysis, jobDescriptionText });
}

/**
 * Generate a 30-60-90 day skill sprint plan from a resume analysis.
 * @param {object} resumeAnalysis – the full object returned by analyzeResume
 */
export async function generateSkillSprint(resumeAnalysis) {
  return post("/generate-sprint", { resumeAnalysis });
}

/**
 * Evaluate a user's mock-interview answer for a given question.
 * @param {string} question – the interview question
 * @param {string} userAnswer – the candidate's answer text
 * @returns {{ feedback: string }}
 */
export async function evaluateInterviewAnswer(question, userAnswer) {
  return post("/evaluate-interview", { question, userAnswer });
}
