import { getGeminiClient, GEMINI_MODEL, checkRateLimit, validateMethod, handleApiError } from "./_utils.js";

export default async function handler(req, res) {
  if (!validateMethod(req, res, "POST")) return;

  const rateCheck = checkRateLimit(req);
  if (!rateCheck.allowed) {
    res.setHeader("Retry-After", String(rateCheck.retryAfterSeconds));
    return res.status(429).json({
      error: `Too many requests. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`
    });
  }

  try {
    const { question, userAnswer } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "Interview question is required." });
    }

    if (!userAnswer || typeof userAnswer !== "string" || !userAnswer.trim()) {
      return res.status(400).json({ error: "User answer is required." });
    }

    if (question.length > 2000) {
      return res.status(400).json({ error: "Interview question is too long." });
    }

    if (userAnswer.length > 10000) {
      return res.status(400).json({ error: "User answer is too long (maximum 10,000 characters)." });
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
    });

    const prompt = `Evaluate my answer to this technical interview question: "${question.trim()}"\n\nMy Answer:\n"${userAnswer.trim()}"\n\nProvide constructive, friendly senior recruiter feedback on whether this answer is complete, correct, and how to improve it.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text() || "Good answer. Keep practicing!";

    return res.status(200).json({ feedback: text });
  } catch (error) {
    return handleApiError(res, error, "Failed to evaluate interview response. Please try again.");
  }
}
