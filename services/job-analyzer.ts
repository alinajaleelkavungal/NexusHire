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

function cleanRoleFallback(rawText: string): ParsedJobDescription {
  const firstLine = rawText.split('\n')[0].trim()
  
  // Extract experience like "3 years", "5 yrs", "1 year"
  const expMatch = rawText.match(/(\d+)\s*(?:years?|yrs?|yr)\s*(?:of\s+experience|experience)?/i)
  const minimumExperience = expMatch ? `${expMatch[1]} years` : undefined

  // Clean title: remove "an ", "a ", "the ", and trailing experience phrases
  let cleanedTitle = firstLine
    .replace(/^(an|a|the|looking for|hiring|we need)\s+/i, '')
    .replace(/\s+(of|with|having)\s+\d+.*$/i, '')
    .trim()

  // Capitalize title properly
  cleanedTitle = cleanedTitle
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')

  const words = rawText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['an', 'the', 'for', 'with', 'and', 'year', 'years', 'experience', 'having'].includes(w))

  const inferredSkills = Array.from(new Set([
    cleanedTitle,
    ...words.map(w => w.charAt(0).toUpperCase() + w.slice(1))
  ])).slice(0, 5)

  return {
    jobTitle: cleanedTitle || 'Open Position',
    employmentType: 'Full-time',
    location: 'Unspecified',
    minimumExperience,
    requiredSkills: inferredSkills.length > 0 ? inferredSkills : ['Professional Competencies'],
    preferredSkills: [],
    responsibilities: [`Execute duties and deliver key outcomes for ${cleanedTitle || 'this role'}.`],
    keywords: words.slice(0, 8),
  }
}

export async function analyzeJobDescription(rawText: string): Promise<ParsedJobDescription> {
  const prompt = `You are an expert technical recruiter and ATS system. 
Analyze the following Job Description (or role summary) and extract the key information into a structured JSON format. Even if the text is very short or brief (e.g. "an software developer of 3 year experience"), deduce the appropriate professional title, required skills, and core responsibilities for that profession.

Job Description / Role:
${rawText}

Instructions:
1. Extract or determine the exact clean job title (e.g. "Software Developer", "Ophthalmologist", "Registered Nurse"). Do not include filler words like "an" or "looking for".
2. Extract the company name, department, employment type (e.g., Full-time, Contract), and location if mentioned (or return null).
3. Extract 'requiredSkills' as a flat array of strings (e.g. ["JavaScript", "React", "Node.js", "Git"]). Always provide at least 3-6 relevant skills.
4. Extract 'preferredSkills' as a flat array of strings.
5. Extract 'responsibilities' as a flat array of strings. Always provide at least 2-4 core responsibilities.
6. Extract 'keywords' that might be useful for semantic searching.
7. Extract 'minimumExperience' (e.g., "3 years") and 'education' (e.g., "Bachelor's degree in CS").

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

    const fallback = cleanRoleFallback(rawText)

    return {
      jobTitle: parsed.jobTitle || fallback.jobTitle,
      company: parsed.company || undefined,
      department: parsed.department || undefined,
      employmentType: parsed.employmentType || 'Full-time',
      location: parsed.location || 'Unspecified',
      requiredSkills: Array.isArray(parsed.requiredSkills) && parsed.requiredSkills.length > 0 
        ? parsed.requiredSkills 
        : fallback.requiredSkills,
      preferredSkills: Array.isArray(parsed.preferredSkills) ? parsed.preferredSkills : [],
      responsibilities: Array.isArray(parsed.responsibilities) && parsed.responsibilities.length > 0 
        ? parsed.responsibilities 
        : fallback.responsibilities,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : fallback.keywords,
      minimumExperience: parsed.minimumExperience || fallback.minimumExperience,
      education: parsed.education || undefined
    }
  } catch (error) {
    console.warn('Job analysis via AI failed, using intelligent rule-based parser:', error)
    return cleanRoleFallback(rawText)
  }
}
