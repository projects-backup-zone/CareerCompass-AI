import { getGeminiClient, GEMINI_MODEL, safeJsonParse, checkRateLimit, validateMethod, handleApiError } from "./_utils.js";

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
    const { resumeAnalysis, jobDescriptionText } = req.body || {};

    if (!resumeAnalysis || typeof resumeAnalysis !== "object") {
      return res.status(400).json({ error: "Missing or invalid resume analysis summary." });
    }

    if (!jobDescriptionText || typeof jobDescriptionText !== "string" || !jobDescriptionText.trim()) {
      return res.status(400).json({ error: "Job description text is required." });
    }

    if (jobDescriptionText.length > 30000) {
      return res.status(400).json({ error: "Job description is too long (maximum 30,000 characters)." });
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `
You are an expert ATS (Applicant Tracking System) specialist and technical recruiter.
Given the candidate's resume analysis summary and a job description, evaluate the match.

Resume Analysis Summary:
- Role Analyzed: ${resumeAnalysis.roleAnalyzed || "Software Engineer"}
- Detected Skills: ${resumeAnalysis.detectedSkills?.join(", ") || "None"}
- Market Alignment Score: ${resumeAnalysis.marketAlignmentScore || 0}%
- Critical Gaps: ${resumeAnalysis.criticalSkillGaps?.map(g => g.skill).join(", ") || "None"}

Job Description:
${jobDescriptionText.trim()}

Return ONLY a JSON object with this exact structure, no markdown:
{
  "atsScore": <number 0-100, ATS keyword match score>,
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "strengthHighlights": ["specific strength from resume that matches JD requirement"],
  "resumeTweaks": ["specific actionable tweak to improve ATS score for this JD"],
  "overallVerdict": "a 2-3 sentence honest assessment of the application strength"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsedData = safeJsonParse(text);

    return res.status(200).json(parsedData);
  } catch (error) {
    return handleApiError(res, error, "Failed to match job description. Please try again.");
  }
}
