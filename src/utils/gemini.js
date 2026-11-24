/**
 * src/utils/gemini.js
 *
 * SECURITY NOTE: This file previously contained a direct Gemini API client
 * that exposed VITE_GEMINI_API_KEY to the browser bundle.
 *
 * All Gemini calls are now handled exclusively by server-side Vercel
 * serverless functions in the /api directory. The GEMINI_API_KEY environment
 * variable is a server-only secret and is NEVER prefixed with VITE_.
 *
 * This file is intentionally kept as a redirect shim so that any external
 * code that still imports from here continues to work without changes.
 */

export {
  analyzeResume,
  matchJobDescription,
  generateSkillSprint,
  evaluateInterviewAnswer,
} from "./api.js";

/**
 * Always returns true in the new secure architecture — the API key is
 * configured on the server, not the client. The UI no longer needs to
 * gate itself on whether a client-side key is present.
 */
export const isGeminiConfigured = () => true;
