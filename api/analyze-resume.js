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
    const { resumeBase64Url, targetRole } = req.body || {};

    if (!resumeBase64Url || typeof resumeBase64Url !== "string") {
      return res.status(400).json({ error: "Missing or invalid resume image data." });
    }

    // Safety limit: 15MB base64 payload limit (~10MB binary image)
    if (resumeBase64Url.length > 15 * 1024 * 1024) {
      return res.status(400).json({ error: "Resume image payload is too large (maximum 10MB)." });
    }

    const match = resumeBase64Url.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/s);
    if (!match) {
      return res.status(400).json({ error: "Invalid image format. Please upload a valid PNG or JPG image." });
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const cleanTargetRole = typeof targetRole === "string" && targetRole.trim() 
      ? targetRole.trim().slice(0, 100) 
      : "Frontend Developer";

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const systemInstruction = `
You are an expert Technical Recruiter and Senior Market Analyst specializing in the tech industry.
Analyze the user's resume image and compare it against the latest industry demand for their target role: "${cleanTargetRole}".

You MUST return a JSON object with the following structure:
{
  "roleAnalyzed": "string (the target role)",
  "marketAlignmentScore": "number (percentage match between 0 and 100)",
  "detectedSkills": ["string (skills found in their resume)"],
  "criticalSkillGaps": [
    {
      "skill": "string (missing skill)",
      "importance": "string (High | Medium)",
      "reason": "string (why it is critical in the current market)"
    }
  ],
  "marketComparison": [
    {
      "skill": "string",
      "yourLevel": "number (0 to 100 rating based on resume)",
      "marketDemand": "number (0 to 100 rating based on market trends)"
    }
  ],
  "recruiterFeedback": "string (overall feedback and recommendations)",
  "suggestedInterviewQuestions": [
    "string (technical question tailored to their gaps and profile)"
  ]
}

Ensure the response is valid JSON and strictly matches the keys above. Do not wrap the JSON in markdown code blocks or add extra text outside the JSON.
`;

    const prompt = `Here is an image of my resume. Analyze this resume against the role: ${cleanTargetRole}.`;
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }, imagePart] }],
      systemInstruction: systemInstruction,
    });

    const response = await result.response;
    const text = response.text();
    const parsedData = safeJsonParse(text);

    return res.status(200).json(parsedData);
  } catch (error) {
    return handleApiError(res, error, "Failed to analyze resume. Please try again.");
  }
}
