import ai from '@/lib/gemini'

export interface ParsedJobDescription {
  jobTitle: string
  company?: string
  department?: string
  employmentType?: string
  location?: string
  requiredSkills: string[]
  preferredSkills: string[]
  responsibilities: string[]
  keywords: string[]
  minimumExperience?: string
  education?: string
}

export async function analyzeJobDescription(rawText: string): Promise<ParsedJobDescription> {
  const prompt = `You are an expert technical recruiter and ATS system. 
Analyze the following Job Description (or role summary) and extract the key information into a structured JSON format. Even if the text is very short or brief, deduce the appropriate role title, plausible required skills, and core responsibilities for that profession.

Job Description / Role:
${rawText}

Instructions:
1. Extract or determine the exact job title (e.g. "Ophthalmologist / Eye Specialist Doctor").
2. Extract the company name, department, employment type (e.g., Full-time, Contract), and location if mentioned (or return null).
3. Extract 'requiredSkills' as a flat array of strings (e.g. ["Ophthalmology", "Eye Surgery", "Patient Diagnosis"]). Always provide at least 2-5 relevant skills.
4. Extract 'preferredSkills' as a flat array of strings.
5. Extract 'responsibilities' as a flat array of strings. Always provide at least 2-4 core responsibilities.
6. Extract 'keywords' that might be useful for semantic searching.
7. Extract 'minimumExperience' (e.g., "3+ years") and 'education' (e.g., "MBBS / MD in Ophthalmology").

Return ONLY a valid JSON object matching the requested fields. Do not include markdown blocks, backticks, or any other text.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    })

    const text = response.text
    if (!text) {
      throw new Error("No response from AI")
    }
    
    // Clean text in case model returned markdown codeblocks
    const cleanText = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleanText) as Partial<ParsedJobDescription>

    return {
      jobTitle: parsed.jobTitle || rawText.slice(0, 60).trim() || 'Untitled Job',
      company: parsed.company || undefined,
      department: parsed.department || undefined,
      employmentType: parsed.employmentType || 'Full-time',
      location: parsed.location || 'Unspecified',
      requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
      preferredSkills: Array.isArray(parsed.preferredSkills) ? parsed.preferredSkills : [],
      responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      minimumExperience: parsed.minimumExperience || undefined,
      education: parsed.education || undefined
    }
  } catch (error) {
    console.error('Job analysis failed, using fallback parser:', error)
    // Fallback: If AI fails or API key issue, safely construct structured JD
    const firstLine = rawText.split('\n')[0].trim().slice(0, 60)
    const words = rawText.split(/[\s,]+/).filter(w => w.length > 3)
    return {
      jobTitle: firstLine || 'Open Job Role',
      employmentType: 'Full-time',
      location: 'Unspecified',
      requiredSkills: words.slice(0, 5),
      preferredSkills: [],
      responsibilities: [rawText.slice(0, 120)],
      keywords: words.slice(0, 10),
    }
  }
}
