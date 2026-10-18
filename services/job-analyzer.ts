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
Analyze the following Job Description and extract the key information into a structured JSON format.

Job Description:
${rawText}

Instructions:
1. Extract the exact job title.
2. Extract the company name, department, employment type (e.g., Full-time, Contract), and location if mentioned.
3. Extract 'requiredSkills' as a flat array of strings (e.g. ["Python", "React", "AWS"]).
4. Extract 'preferredSkills' as a flat array of strings.
5. Extract 'responsibilities' as a flat array of strings.
6. Extract 'keywords' that might be useful for semantic searching (e.g., specific tools, methodologies).
7. Extract 'minimumExperience' (e.g., "3+ years") and 'education' (e.g., "Bachelor's degree in CS").

Return ONLY a valid JSON object matching the requested fields. Do not include markdown blocks or any other text.`

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
    
    return JSON.parse(text) as ParsedJobDescription
  } catch (error) {
    console.error('Job analysis failed:', error)
    throw new Error('Failed to analyze job description')
  }
}
