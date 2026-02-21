/**
 * Content Enhancer — Takes raw user input and creates professional German CV text
 * 
 * Since this is a client-side app without an AI API, we use rule-based enhancement:
 * - Capitalizes and structures job titles properly (in German)
 * - Converts casual descriptions into professional German phrasing
 * - Formats dates consistently
 * - Creates proper German professional summaries
 */

// German job title mappings (common ones)
const JOB_TITLE_MAP = {
    // Construction & Trades
    'electrician': 'Elektriker',
    'elektricist': 'Elektriker',
    'elektrik': 'Elektriker',
    'elektriker': 'Elektriker',
    'plumber': 'Klempner',
    'hidraulik': 'Klempner',
    'carpenter': 'Schreiner',
    'painter': 'Maler',
    'welder': 'Schweißer',
    'mechanic': 'Mechaniker',
    'mekanik': 'Mechaniker',
    'driver': 'Fahrer',
    'shofer': 'Fahrer',
    'construction': 'Bauarbeiter',
    'builder': 'Bauarbeiter',
    'ndertimtar': 'Bauarbeiter',
    // Hospitality & Service
    'cook': 'Koch',
    'kuzhinier': 'Koch',
    'chef': 'Koch',
    'waiter': 'Kellner',
    'kamarier': 'Kellner',
    'cleaner': 'Reinigungskraft',
    'pastrues': 'Reinigungskraft',
    'barber': 'Friseur',
    'berber': 'Friseur',
    'hairdresser': 'Friseur',
    // Healthcare
    'nurse': 'Krankenpfleger/in',
    'infermier': 'Krankenpfleger/in',
    'caregiver': 'Pflegekraft',
    'pfleger': 'Pflegekraft',
    // Logistics
    'warehouse': 'Lagerist',
    'magazinier': 'Lagerist',
    'forklift': 'Gabelstaplerfahrer',
    'delivery': 'Lieferfahrer',
    // Office & Tech
    'accountant': 'Buchhalter/in',
    'kontabilist': 'Buchhalter/in',
    'developer': 'Softwareentwickler/in',
    'programmer': 'Programmierer/in',
    'programues': 'Programmierer/in',
    'engineer': 'Ingenieur/in',
    'inxhinier': 'Ingenieur/in',
    'designer': 'Designer/in',
    'teacher': 'Lehrer/in',
    'mesues': 'Lehrer/in',
    'sales': 'Verkäufer/in',
    'shites': 'Verkäufer/in',
};

// German professional action verbs for descriptions
const GERMAN_ACTION_VERBS = [
    'Verantwortlich für',
    'Zuständig für',
    'Durchführung von',
    'Betreuung von',
    'Mitarbeit bei',
    'Unterstützung bei',
    'Planung und Umsetzung von',
    'Sicherstellung der',
];

// German proficiency level mappings
const PROFICIENCY_MAP = {
    'native': 'Muttersprache',
    'amtare': 'Muttersprache',
    'ana dil': 'Muttersprache',
    'anadil': 'Muttersprache',
    'لغة أم': 'Muttersprache',
    'fluent': 'Fließend',
    'rrjedhshem': 'Fließend',
    'rrjedhshëm': 'Fließend',
    'akıcı': 'Fließend',
    'advanced': 'Fortgeschritten',
    'avancuar': 'Fortgeschritten',
    'ileri': 'Fortgeschritten',
    'intermediate': 'Mittelstufe',
    'mesatar': 'Mittelstufe',
    'orta': 'Mittelstufe',
    'basic': 'Grundkenntnisse',
    'fillestar': 'Grundkenntnisse',
    'başlangıç': 'Grundkenntnisse',
    'beginner': 'Grundkenntnisse',
    'conversational': 'Gute Kenntnisse',
    'b1': 'B1 - Mittelstufe',
    'b2': 'B2 - Gute Mittelstufe',
    'c1': 'C1 - Fortgeschritten',
    'c2': 'C2 - Annähernd muttersprachlich',
    'a1': 'A1 - Anfänger',
    'a2': 'A2 - Grundlegende Kenntnisse',
};

/**
 * Enhance a job title — try to produce a proper German title
 */
export function enhanceJobTitle(rawTitle) {
    if (!rawTitle) return rawTitle;

    const lower = rawTitle.toLowerCase().trim();

    // Direct match
    for (const [key, german] of Object.entries(JOB_TITLE_MAP)) {
        if (lower.includes(key)) {
            return german;
        }
    }

    // If already looks like a proper German title (starts with capital), keep it
    if (/^[A-ZÄÖÜ]/.test(rawTitle.trim())) {
        return rawTitle.trim();
    }

    // Capitalize first letter
    return rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
}

/**
 * Enhance a job description — make it professional German CV language
 */
export function enhanceDescription(rawDesc) {
    if (!rawDesc) return rawDesc;

    let desc = rawDesc.trim();

    // If it's very short (just a few words), wrap it in a professional sentence
    const wordCount = desc.split(/\s+/).length;

    if (wordCount <= 4) {
        // Very short - create a professional sentence
        desc = `${GERMAN_ACTION_VERBS[Math.floor(Math.random() * 3)]} ${desc}`;
    }

    // Ensure it starts with a capital letter  
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);

    // Ensure it ends with proper punctuation
    if (!/[.!]$/.test(desc)) {
        desc += '.';
    }

    return desc;
}

/**
 * Enhance a professional summary — create proper German text
 */
export function enhanceSummary(rawSummary, jobTitle) {
    if (!rawSummary) return rawSummary;

    let summary = rawSummary.trim();

    // If summary is very short, try to expand it
    const wordCount = summary.split(/\s+/).length;

    if (wordCount <= 8) {
        const enhancedTitle = enhanceJobTitle(jobTitle) || 'Fachkraft';
        summary = `Erfahrene/r ${enhancedTitle} mit fundierter Berufserfahrung. ${summary.charAt(0).toUpperCase() + summary.slice(1)}. Motiviert, zuverlässig und teamorientiert.`;
    } else {
        // Just capitalize and punctuate
        summary = summary.charAt(0).toUpperCase() + summary.slice(1);
        if (!/[.!]$/.test(summary)) {
            summary += '.';
        }
    }

    return summary;
}

/**
 * Enhance a date range — normalize format
 */
export function enhanceDate(rawDate) {
    if (!rawDate) return rawDate;

    let date = rawDate.trim();

    // Map common words to German
    const monthMap = {
        'jan': 'Jan.', 'feb': 'Feb.', 'mar': 'März', 'apr': 'Apr.',
        'may': 'Mai', 'jun': 'Juni', 'jul': 'Juli', 'aug': 'Aug.',
        'sep': 'Sep.', 'oct': 'Okt.', 'nov': 'Nov.', 'dec': 'Dez.',
        'january': 'Jan.', 'february': 'Feb.', 'march': 'März', 'april': 'Apr.',
        'june': 'Juni', 'july': 'Juli', 'august': 'Aug.',
        'september': 'Sep.', 'october': 'Okt.', 'november': 'Nov.', 'december': 'Dez.',
        'present': 'Heute', 'now': 'Heute', 'current': 'Heute',
        'tani': 'Heute', 'aktuell': 'Heute', 'şu an': 'Heute', 'الحالي': 'Heute',
        'heute': 'Heute',
    };

    for (const [eng, de] of Object.entries(monthMap)) {
        const regex = new RegExp(`\\b${eng}\\b`, 'gi');
        date = date.replace(regex, de);
    }

    return date;
}

/**
 * Enhance a degree — translate common degrees to German
 */
export function enhanceDegree(rawDegree) {
    if (!rawDegree) return rawDegree;

    let degree = rawDegree.trim();
    // Capitalize first letter
    degree = degree.charAt(0).toUpperCase() + degree.slice(1);
    return degree;
}

/**
 * Enhance language proficiency to German standard
 */
export function enhanceProficiency(rawLevel) {
    if (!rawLevel) return 'Gute Kenntnisse';

    const lower = rawLevel.toLowerCase().trim();

    for (const [key, german] of Object.entries(PROFICIENCY_MAP)) {
        if (lower.includes(key) || lower === key) {
            return german;
        }
    }

    // If it already looks like a German level (contains uppercase), keep it
    if (/^[A-ZÄÖÜ]/.test(rawLevel.trim())) {
        return rawLevel.trim();
    }

    return rawLevel.charAt(0).toUpperCase() + rawLevel.slice(1);
}
