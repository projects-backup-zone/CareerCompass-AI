import { GoogleGenerativeAI } from "@google/generative-ai";

// Cache the GoogleGenerativeAI client instance per process
let cachedClient = null;
let cachedKey = null;

export const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Returns an initialized GoogleGenerativeAI client using the server-side GEMINI_API_KEY.
 * Never exposes the key to the client.
 */
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new GoogleGenerativeAI(apiKey.trim());
    cachedKey = apiKey;
  }

  return cachedClient;
}

/**
 * Helper to safely parse JSON from Gemini responses, handling accidental markdown wrappers.
 */
export function safeJsonParse(rawText) {
  if (typeof rawText !== "string") {
    throw new Error("Response is not text.");
  }
  let cleaned = rawText.trim();
  // Strip markdown code fences if model enclosed JSON in them
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned);
}

/**
 * In-memory sliding window rate limiter per client IP.
 * Protects against excessive requests and denial-of-service abuse.
 */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute per IP

export function checkRateLimit(req) {
  // Extract client IP address from Vercel / proxy headers or socket
  const forwarded = req.headers["x-forwarded-for"];
  const clientIp = typeof forwarded === "string" 
    ? forwarded.split(",")[0].trim() 
    : (req.socket?.remoteAddress || "unknown");

  const now = Date.now();
  const clientData = rateLimitMap.get(clientIp);

  // Periodic cleanup of stale rate-limit entries
  if (rateLimitMap.size > 2000) {
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now - data.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
        rateLimitMap.delete(ip);
      }
    }
  }

  if (!clientData || now - clientData.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(clientIp, { windowStart: now, count: 1 });
    return { allowed: true };
  }

  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - clientData.windowStart)) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  clientData.count += 1;
  return { allowed: true };
}

/**
 * Validates HTTP method and sets basic security headers.
 */
export function validateMethod(req, res, allowedMethod = "POST") {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  if (req.method !== allowedMethod) {
    res.setHeader("Allow", allowedMethod);
    res.status(405).json({
      error: `Method ${req.method} Not Allowed. Only ${allowedMethod} requests are supported.`
    });
    return false;
  }
  return true;
}

/**
 * Sanitizes errors so that internal paths, API keys, or raw provider stacks are never leaked.
 */
export function handleApiError(res, error, customFallbackMessage = "An unexpected error occurred.") {
  const apiKey = process.env.GEMINI_API_KEY || "";
  
  // Log on server without leaking raw API key
  let logMessage = error?.message || String(error);
  if (apiKey) {
    logMessage = logMessage.split(apiKey).join("[REDACTED_API_KEY]");
  }
  console.error("[Secure Backend Error]:", logMessage);

  if (error?.message?.includes("GEMINI_API_KEY is not configured")) {
    return res.status(500).json({
      error: "AI service configuration error. Server environment variable GEMINI_API_KEY is missing."
    });
  }

  // Handle Gemini quota / rate limit errors gracefully
  if (logMessage.includes("429") || logMessage.includes("RESOURCE_EXHAUSTED")) {
    return res.status(429).json({
      error: "Google Gemini rate limit reached or quota exhausted. Please wait a moment and try again."
    });
  }

  return res.status(500).json({
    error: customFallbackMessage
  });
}
