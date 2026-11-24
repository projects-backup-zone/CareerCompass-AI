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
    const { resumeAnalysis } = req.body || {};

    if (!resumeAnalysis || typeof resumeAnalysis !== "object") {
      return res.status(400).json({ error: "Missing or invalid resume analysis summary." });
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });

    const role = resumeAnalysis.roleAnalyzed || "Software Engineer";
    const detectedSkills = resumeAnalysis.detectedSkills?.join(", ") || "None";
    const criticalGaps = resumeAnalysis.criticalSkillGaps?.map(g => `${g.skill} (${g.importance})`).join(", ") || "None";

    const prompt = `
You are a senior career coach and learning strategist.
Based on this candidate's skill gaps and target role, create a realistic, specific 30-60-90 day skill sprint plan.

Target Role: ${role}
Current Skills: ${detectedSkills}
Critical Gaps to Bridge: ${criticalGaps}

Return ONLY a JSON object with this exact structure, no markdown:
{
  "targetRole": "${role}",
  "days30": {
    "theme": "Foundation Sprint",
    "goal": "one sentence goal for days 1-30",
    "weeks": [
      {
        "week": 1,
        "focus": "Skill or concept to learn",
        "tasks": ["specific daily task 1", "specific daily task 2", "specific daily task 3"],
        "milestone": "what you can do by end of week",
        "resource": "best free resource (e.g. official docs, specific course)"
      }
    ]
  },
  "days60": {
    "theme": "Build & Apply Sprint",
    "goal": "one sentence goal for days 31-60",
    "weeks": [
      {
        "week": 5,
        "focus": "Project or application focus",
        "tasks": ["task 1", "task 2", "task 3"],
        "milestone": "what you can demonstrate by end of week",
        "resource": "relevant resource"
      }
    ]
  },
  "days90": {
    "theme": "Ship & Interview Sprint",
    "goal": "one sentence goal for days 61-90",
    "weeks": [
      {
        "week": 9,
        "focus": "Interview prep and portfolio polishing",
        "tasks": ["task 1", "task 2", "task 3"],
        "milestone": "interview-ready achievement",
        "resource": "resource"
      }
    ]
  }
}
Generate exactly 4 weeks per phase (weeks 1-4, 5-8, 9-12). Be very specific and actionable.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsedData = safeJsonParse(text);

    return res.status(200).json(parsedData);
  } catch (error) {
    return handleApiError(res, error, "Failed to generate skill sprint plan. Please try again.");
  }
}
