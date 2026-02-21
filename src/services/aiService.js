/**
 * AI Service - Proxies OpenAI calls through Supabase Edge Function
 * This keeps the API key secure on the server side
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const EDGE_FUNCTION_URL = 'openai-proxy';

/**
 * Call OpenAI through the secure Edge Function proxy
 * @param {Array} messages - OpenAI messages array
 * @param {Object} options - Optional settings (model, temperature, response_format)
 * @returns {Promise<Object>} OpenAI response
 */
export async function callOpenAI(messages, options = {}) {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured - AI features unavailable');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('You must be logged in to use AI features');
    }

    const { model = 'gpt-4o-mini', temperature = 0.7, response_format } = options;

    const body = {
        messages,
        model,
        temperature,
    };

    if (response_format) {
        body.response_format = response_format;
    }

    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_URL, {
        body,
    });

    if (error) {
        console.error('Edge function error:', error);
        // If Edge Function fails, check if it returned an error message
        if (data && data.error) {
            throw new Error(data.error);
        }
        throw new Error(error.message || 'AI service error');
    }

    // Check if the response contains an error from the Edge Function
    if (data && data.error) {
        throw new Error(data.error);
    }

    return data;
}

/**
 * Enhance CV content (summary, job description, etc.)
 * @param {string} userInput - User's raw input
 * @param {string} fieldType - Type of field (summary, job_description, etc.)
 * @param {string} userLang - User's language code
 * @param {string} userLangName - User's language name
 * @param {Object} context - Additional context (jobTitle, etc.)
 * @returns {Promise<{german: string, explanation: string}>}
 */
export async function enhanceContent(userInput, fieldType, userLang, userLangName, context = {}) {
    const systemPrompts = {
        name: `You are a German CV expert. Format this person's name properly with correct capitalization. Just return the properly formatted name, nothing else. Return JSON: {"german": "The properly capitalized name", "explanation": "Brief explanation in ${userLangName}"}`,
        title: `You are a German CV expert. Format this job title properly in German. Just return the job title, nothing else. For example: "bauingenieur" becomes "Bauingenieur", "software entwickler" becomes "Softwareentwickler". Return JSON: {"german": "The properly formatted job title", "explanation": "Brief explanation in ${userLangName}"}`,
        summary: `You are a German CV writing expert. Transform the user's casual description into a professional German CV summary (Profil/Zusammenfassung). Write 2-3 sentences in first person. Use professional German business language. Return JSON: {"german": "The German text", "explanation": "Brief explanation in ${userLangName} of what you wrote"}`,
        description: `You are a German CV writing expert. Transform the user's job description into professional German CV bullet points. Keep it concise - maximum 2-3 short bullet points. Use action verbs, quantify achievements where possible. Return JSON: {"german": "The German text with bullet points", "explanation": "Brief explanation in ${userLangName}"}`,
        company: `You are a German CV expert. Format this company name properly. Just return the company name, nothing else. Return JSON: {"german": "The properly formatted company name", "explanation": "Brief explanation in ${userLangName}"}`,
        degree: `You are a German CV expert. Format this degree/qualification properly in German. Just return the degree name, nothing else. For example: "bachelor informatik" becomes "Bachelor in Informatik". Do NOT add any labels like "Bildung:" or extra text. Return JSON: {"german": "The properly formatted degree", "explanation": "Brief explanation in ${userLangName}"}`,
        school: `You are a German CV expert. Format this school/university name properly. Just return the institution name, nothing else. Do NOT add any labels or extra text. Return JSON: {"german": "The properly formatted school name", "explanation": "Brief explanation in ${userLangName}"}`,
        skills: `You are a German CV expert. Format these skills professionally for a German CV. Translate to German if needed. Return JSON: {"german": "Comma-separated skills in German", "explanation": "Brief explanation in ${userLangName}"}`,
        hobbies: `You are a German CV expert. Translate and format these hobbies/interests professionally for a German CV. For example: "basketboll" becomes "Basketball", "muzike" becomes "Musik". Capitalize properly, use proper German terms. Return as comma-separated list. Return JSON: {"german": "Comma-separated hobbies in German", "explanation": "Brief explanation in ${userLangName}"}`,
        languages: `You are a German CV expert. Translate these language names to German. For example: "english" becomes "Englisch", "albanian" becomes "Albanisch", "shqip" becomes "Albanisch". Keep any proficiency levels if provided. Return JSON: {"german": "Comma-separated languages in German", "explanation": "Brief explanation in ${userLangName}"}`,
        certification: `You are a German CV expert. Format this certification/certificate name properly in German. Just return the certificate name, nothing else. Translate if needed. Return JSON: {"german": "The properly formatted certificate name", "explanation": "Brief explanation in ${userLangName}"}`,
        issuer: `You are a German CV expert. Format this issuing organization/institution name properly. Just return the organization name, nothing else. Capitalize properly. Return JSON: {"german": "The properly formatted issuer name", "explanation": "Brief explanation in ${userLangName}"}`,
        technologies: `You are a German CV expert. Format these technologies/tools professionally for a CV. Capitalize properly (e.g., "react" becomes "React", "javascript" becomes "JavaScript"). Return as comma-separated list. Return JSON: {"german": "Comma-separated technologies properly formatted", "explanation": "Brief explanation in ${userLangName}"}`,
        location: `You are a German CV expert. Format this location/city properly for a German CV. Add ", Deutschland" if it's a German city. For example: "nagold" becomes "Nagold, Deutschland", "berlin" becomes "Berlin, Deutschland". Return JSON: {"german": "The properly formatted location with country", "explanation": "Brief explanation in ${userLangName}"}`,
        default: `You are a German CV expert. Format this text properly for a German CV. Keep it simple and concise - just return the formatted text, no labels or extra content. Return JSON: {"german": "The formatted text", "explanation": "Brief explanation in ${userLangName}"}`
    };

    const systemPrompt = systemPrompts[fieldType] || systemPrompts.default;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context: Job title is "${context.jobTitle || 'Professional'}"\n\nUser input: ${userInput}` }
    ];

    const response = await callOpenAI(messages, {
        temperature: 0.7,
        response_format: { type: 'json_object' }
    });

    const content = JSON.parse(response.choices[0].message.content);
    return content;
}

/**
 * Generate skill suggestions based on job title
 * @param {string} jobTitle - The user's job title
 * @returns {Promise<string[]>} Array of suggested skills
 */
export async function getSkillSuggestions(jobTitle) {
    const messages = [
        {
            role: 'system',
            content: 'You are a German CV expert. Suggest 8-10 relevant professional skills for the given job title. Return JSON: {"skills": ["skill1", "skill2", ...]}'
        },
        { role: 'user', content: `Job title: ${jobTitle}` }
    ];

    const response = await callOpenAI(messages, {
        temperature: 0.7,
        response_format: { type: 'json_object' }
    });

    const content = JSON.parse(response.choices[0].message.content);
    return content.skills || [];
}

/**
 * Generate a professional summary
 * @param {string} jobTitle - User's job title
 * @param {string} userLangName - User's language name for explanation
 * @returns {Promise<{german: string, explanation: string}>}
 */
export async function generateSummary(jobTitle, userLangName) {
    const messages = [
        {
            role: 'system',
            content: `You are a German CV writing expert. Generate a professional German CV summary (2-3 sentences) for the given job title. Use first person, professional tone. Return JSON: {"german": "The German summary", "explanation": "Brief explanation in ${userLangName}"}`
        },
        { role: 'user', content: `Job title: ${jobTitle}` }
    ];

    const response = await callOpenAI(messages, {
        temperature: 0.7,
        response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
}

/**
 * Generate a job description
 * @param {string} jobTitle - Job title
 * @param {string} company - Company name
 * @param {string} userLangName - User's language name
 * @returns {Promise<{german: string, explanation: string}>}
 */
export async function generateJobDescription(jobTitle, company, userLangName) {
    const messages = [
        {
            role: 'system',
            content: `You are a German CV writing expert. Generate a concise German job description (2-3 SHORT bullet points, each max 15 words) for the given position. Use action verbs, be specific but brief. Return JSON: {"german": "The German description with bullet points", "explanation": "Brief explanation in ${userLangName}"}`
        },
        { role: 'user', content: `Job title: ${jobTitle}\nCompany: ${company || 'a company'}` }
    ];

    const response = await callOpenAI(messages, {
        temperature: 0.7,
        response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
}

/**
 * Generate a project description
 * @param {string} projectName - Project name
 * @param {string} jobTitle - User's job title for context
 * @param {string} userLangName - User's language name
 * @returns {Promise<{german: string, explanation: string}>}
 */
export async function generateProjectDescription(projectName, jobTitle, userLangName) {
    const messages = [
        {
            role: 'system',
            content: `You are a German CV writing expert. Generate a professional project description in German for a CV. Write 2-3 sentences describing what the project does, the person's role, and key achievements. Use action verbs and be specific. Return JSON: {"german": "The German project description", "explanation": "Brief explanation in ${userLangName}"}`
        },
        { role: 'user', content: `Project name: ${projectName}\nProfession: ${jobTitle || 'Professional'}` }
    ];

    const response = await callOpenAI(messages, {
        temperature: 0.7,
        response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
}

/**
 * AI Edit - modify existing content based on user request
 * @param {string} currentContent - Current text content
 * @param {string} userRequest - What the user wants to change
 * @param {string} sectionType - Type of section (summary, experience, etc.)
 * @returns {Promise<string>} Modified content
 */
export async function aiEdit(currentContent, userRequest, sectionType = 'general') {
    const messages = [
        {
            role: 'system',
            content: `You are a German CV writing expert. Modify the given CV content based on the user's request. Keep it professional and in German. Return only the modified text, no explanations.`
        },
        { role: 'user', content: `Current content:\n${currentContent}\n\nUser request: ${userRequest}` }
    ];

    const response = await callOpenAI(messages, {
        temperature: 0.7,
    });

    return response.choices[0].message.content;
}

/**
 * Generate a professional German cover letter (Bewerbungsschreiben)
 * @param {Object} params - Parameters for letter generation
 * @param {Object} params.cvData - Full CV data object
 * @param {string} params.jobTitle - Target job title
 * @param {string} params.company - Target company name
 * @param {string} params.jobUrl - Optional job posting URL
 * @param {string} params.additionalInfo - Optional additional notes
 * @returns {Promise<string>} Generated letter text
 */
export async function generateCoverLetter({ cvData, jobTitle, company, jobUrl, additionalInfo }) {
    // Debug: log what we received
    console.log('generateCoverLetter received cvData:', JSON.stringify(cvData, null, 2));
    
    // Handle case where cvData might be empty or malformed
    if (!cvData || Object.keys(cvData).length === 0) {
        throw new Error('No CV data provided. Please select a CV first.');
    }
    
    const personal = cvData.personal || {};
    const fullName = [personal.firstName, personal.lastName].filter(Boolean).join(' ');
    
    // Build detailed CV context
    const cvContext = `
APPLICANT INFORMATION:
- Full Name: ${fullName || '[Name not provided]'}
- Professional Title: ${personal.title || '[Title not provided]'}
- Email: ${personal.email || '[Email not provided]'}
- Phone: ${personal.phone || '[Phone not provided]'}
- Address/Location: ${personal.location || '[Location not provided]'}

PROFESSIONAL SUMMARY:
${cvData.summary || '[No summary provided]'}

WORK EXPERIENCE:
${(cvData.experience || []).map(exp => `- ${exp.title} at ${exp.company} (${exp.date || 'Date not specified'})\n  ${exp.description || ''}`).join('\n\n') || '[No experience listed]'}

EDUCATION:
${(cvData.education || []).map(edu => `- ${edu.degree} at ${edu.school} (${edu.date || 'Date not specified'})`).join('\n') || '[No education listed]'}

SKILLS:
${(cvData.skills || []).join(', ') || '[No skills listed]'}

LANGUAGES:
${(cvData.languages || []).map(lang => `${lang.name}: ${lang.level}`).join(', ') || '[No languages listed]'}

CERTIFICATIONS:
${(cvData.certifications || []).map(c => c.name).join(', ') || '[None]'}
    `.trim();

    const systemPrompt = `You are an expert German job application letter writer.
You write professional, compelling Bewerbungsschreiben (motivational letters) in German.

CRITICAL RULES:
- Write in formal German (Sie-Form)
- Use the ACTUAL applicant data provided - DO NOT use placeholders like [Ihr Name] or [Ihre Adresse]
- Insert the real name, address, email, phone from the CV data
- Properly capitalize and format the company name and job title professionally
- Follow standard German application letter structure:
  1. Header with applicant's real contact info and today's date
  2. Company address (use placeholder only for company address since we don't have it)
  3. Subject line (Betreff) with properly formatted job title
  4. Salutation (Sehr geehrte Damen und Herren, or specific if known)
  5. Opening paragraph
  6. Main body highlighting relevant experience
  7. Closing paragraph
  8. Mit freundlichen Grüßen + applicant's real name
- Be concise - about 300-400 words
- Make it compelling and personalized based on the CV`;

    const userPrompt = `Write a professional German cover letter (Bewerbungsschreiben) for:

TARGET POSITION: ${jobTitle}
TARGET COMPANY: ${company}
${jobUrl ? `JOB POSTING: ${jobUrl}` : ''}

${cvContext}

${additionalInfo ? `ADDITIONAL NOTES FROM APPLICANT:\n${additionalInfo}` : ''}

IMPORTANT: Use the applicant's REAL information from the CV - their actual name, email, phone, location. Do NOT use placeholder text for applicant info. Only use [Firmenadresse] placeholder for the company address since we don't have it.

Also, properly capitalize and format the job title "${jobTitle}" and company name "${company}" in the letter.`;

    const response = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], {
        temperature: 0.7,
    });

    return response.choices[0].message.content;
}

export default {
    callOpenAI,
    enhanceContent,
    getSkillSuggestions,
    generateSummary,
    generateJobDescription,
    generateProjectDescription,
    aiEdit,
    generateCoverLetter,
};
