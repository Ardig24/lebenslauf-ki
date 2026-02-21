/**
 * OpenAI Service — Handles API calls for CV content enhancement
 * 
 * Takes user input in their native language and produces:
 * 1. Professional German text for the CV
 * 2. Explanation in the user's language of what was generated
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// API key from environment variable (preferred) or localStorage (fallback for dev)
const ENV_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

/**
 * Get the API key - prioritizes env variable, falls back to localStorage
 */
export function getApiKey() {
    // Prefer environment variable (production)
    if (ENV_API_KEY) {
        return ENV_API_KEY;
    }
    // Fallback to localStorage (development/user override)
    return localStorage.getItem('cvprofi_openai_key') || '';
}

/**
 * Store the API key in localStorage (for development/user override)
 * Note: In production, use VITE_OPENAI_API_KEY env variable instead
 */
export function setApiKey(key) {
    localStorage.setItem('cvprofi_openai_key', key.trim());
}

/**
 * Check if API key is from environment (not user-provided)
 */
export function isEnvApiKey() {
    return !!ENV_API_KEY;
}

/**
 * Check if an API key is configured
 * Always returns true since we use Supabase Edge Function with server-side API key
 */
export function hasApiKey() {
    return true;
}

/**
 * Enhance CV content using OpenAI
 * 
 * @param {string} userInput - Raw text from the user
 * @param {string} fieldType - What kind of field (name, title, summary, description, degree, school, company, location, skills, languages)
 * @param {string} userLang - The language code the user is chatting in (e.g. 'sq', 'tr', 'ar')
 * @param {string} userLangName - The language name (e.g. 'Albanian', 'Turkish')
 * @param {object} context - Additional context (e.g. job title for summary enhancement)
 * @returns {Promise<{german: string, explanation: string}>}
 */
export async function enhanceContent(userInput, fieldType, userLang, userLangName, context = {}) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('No API key configured');
    }

    const systemPrompt = buildSystemPrompt(fieldType, userLangName, context);
    const userPrompt = buildUserPrompt(userInput, fieldType, userLangName, context);

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.3,
                max_tokens: 500,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('Empty response from API');
        }

        const parsed = JSON.parse(content);
        return {
            german: parsed.german || userInput,
            explanation: parsed.explanation || '',
        };
    } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
    }
}

/**
 * Build the system prompt based on field type
 */
function buildSystemPrompt(fieldType, userLangName, context) {
    const baseInstruction = `You are a professional CV writing assistant for immigrants in Germany. 
Your job is to take user input (which may be in ${userLangName}, German, or a mix) and produce:
1. A polished, professional GERMAN text suitable for a formal CV/Lebenslauf
2. A brief explanation in ${userLangName} telling the user what you wrote and why

IMPORTANT RULES:
- The German output must be grammatically perfect, properly capitalized, and professionally worded
- Use formal German CV conventions (no personal pronouns, concise, achievement-oriented)
- Proper nouns (names, cities, companies) must be correctly capitalized
- If the input contains abbreviations or informal text, expand and formalize them
- GmbH, AG, etc. should be properly formatted
- Respond ONLY with a JSON object: {"german": "...", "explanation": "..."}`;

    const fieldInstructions = {
        name: `\nFIELD TYPE: Full Name\n- Just properly capitalize the name (first letter of each part uppercase)\n- Don't translate names, just fix capitalization\n- Keep the explanation very brief`,

        title: `\nFIELD TYPE: Professional Job Title\n- Translate to the proper German job title used in the German labor market\n- Examples: Electrician → Elektriker, Engineer → Ingenieur, Nurse → Krankenpfleger/in\n- Use the standard German occupational title`,

        summary: `\nFIELD TYPE: Professional Summary (Berufliches Profil)\n- Create a 2-3 sentence professional summary in German\n- Use third-person style or no pronouns (typical German CV style)\n- Highlight experience, key skills, and professional qualities\n- The user's current job title is: "${context.jobTitle || 'not specified'}"`,

        description: `\nFIELD TYPE: Job Description / Responsibilities\n- Convert to professional German bullet-point style descriptions\n- Use action verbs in noun form (Durchführung, Betreuung, Verantwortung für...)\n- Make it sound professional and achievement-oriented\n- If the input is very short, expand it into a proper description`,

        company: `\nFIELD TYPE: Company Name\n- Properly capitalize the company name\n- Format legal forms correctly (GmbH, AG, KG, etc.)\n- Don't translate company names, just format them properly`,

        location: `\nFIELD TYPE: Location/City\n- Properly capitalize city and country names\n- Use the German name for the city if it has one (e.g., München not Munich)\n- Format as "City, Country" or just "City" if it's in Germany`,

        degree: `\nFIELD TYPE: Education Degree\n- Translate to the German equivalent degree name\n- Examples: Bachelor of Engineering → Bachelor of Engineering (Bauingenieurwesen)\n- Use proper German academic terminology`,

        school: `\nFIELD TYPE: School/University Name\n- Properly capitalize the institution name\n- Use the common/official name\n- Format as "Institution Name, City" if city is mentioned`,

        skills: `\nFIELD TYPE: Skills\n- Translate skill names to German where appropriate\n- Technical terms (AutoCAD, Excel, etc.) stay in English\n- Properly capitalize each skill`,

        languages: `\nFIELD TYPE: Languages with Proficiency\n- Format as "Language - Proficiency Level"\n- Use German proficiency terms: Muttersprache, Fließend, Gute Kenntnisse, Grundkenntnisse\n- Or CEFR levels: A1, A2, B1, B2, C1, C2`,
    };

    return baseInstruction + (fieldInstructions[fieldType] || '');
}

/**
 * Build the user prompt
 */
function buildUserPrompt(userInput, fieldType, userLangName, context = {}) {
    let prompt = `User input (${userLangName}): "${userInput}"\n\nPlease enhance this for a German CV.`;
    
    if (context.feedback) {
        prompt += `\n\nIMPORTANT: The user was not satisfied with the previous suggestion and said: "${context.feedback}". Please provide a different/better version based on their feedback.`;
    }
    
    prompt += `\n\nReturn JSON with "german" and "explanation" keys.`;
    return prompt;
}

/**
 * Generate a motivational letter using AI
 * 
 * @param {object} params - Letter generation parameters
 * @param {string} params.cvSummary - Summary of the CV data
 * @param {string} params.jobTitle - Target job title
 * @param {string} params.company - Target company name
 * @param {string} params.jobUrl - Optional job posting URL
 * @param {string} params.additionalInfo - Optional additional info from user
 * @returns {Promise<string>} Generated letter text
 */
export async function generateMotivationalLetter({ cvSummary, jobTitle, company, jobUrl, additionalInfo }) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('No API key configured');
    }

    const systemPrompt = `You are an expert German job application letter writer. 
You write professional, compelling Bewerbungsschreiben (motivational letters) in German.

IMPORTANT RULES:
- Write in formal German (Sie-Form)
- Follow the standard German application letter structure:
  1. Header with date and address placeholders
  2. Subject line (Betreff)
  3. Salutation
  4. Opening paragraph (why you're applying, how you found the position)
  5. Main body (your qualifications, experience, why you're a good fit)
  6. Closing paragraph (enthusiasm, availability for interview)
  7. Formal closing (Mit freundlichen Grüßen)
- Keep it professional but personable
- Highlight relevant experience from the CV
- Be concise - aim for about 300-400 words
- Use proper German business letter conventions`;

    let userPrompt = `Please write a professional German motivational letter (Bewerbungsschreiben) for the following:

TARGET POSITION: ${jobTitle || 'Not specified'}
COMPANY: ${company || 'Not specified'}
${jobUrl ? `JOB POSTING URL: ${jobUrl}` : ''}

CANDIDATE'S CV INFORMATION:
${cvSummary}

${additionalInfo ? `ADDITIONAL NOTES FROM CANDIDATE:\n${additionalInfo}` : ''}

Please write a complete, professional German motivational letter. Include placeholder text like [Ihr Name], [Ihre Adresse], [Datum] where appropriate.`;

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.7,
                max_tokens: 1500,
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('Empty response from API');
        }

        return content;
    } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
    }
}

export default { enhanceContent, generateMotivationalLetter, getApiKey, setApiKey, hasApiKey, isEnvApiKey };
