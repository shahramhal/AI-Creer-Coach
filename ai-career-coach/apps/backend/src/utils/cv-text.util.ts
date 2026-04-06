// apps/backend/src/utils/cv-text.util.ts

/**
 * Extracts usable text from a parsed CV document.
 * Returns raw_text if available, otherwise builds a representation
 * from the structured fields (summary, skills, experience, education).
 *
 * Accepts any object with CV-shaped fields - works with both typed IParsedCV
 * and raw MongoDB documents.
 */
export function buildCVText(cv: Record<string, any>): string {
  const rawText = cv.raw_text || cv.metadata?.raw_text || '';
  if (rawText) return rawText;

  const parts: string[] = [];

  if (cv.summary) parts.push(cv.summary);

  if (cv.skills?.length) parts.push(`Skills: ${cv.skills.join(', ')}`);

  if (cv.experience?.length) {
    for (const exp of cv.experience) {
      const expParts = [exp.title, exp.company, exp.description, ...(exp.responsibilities ?? [])].filter(Boolean);
      if (expParts.length) parts.push(expParts.join(' - '));
    }
  }

  if (cv.education?.length) {
    for (const edu of cv.education) {
      const eduParts = [edu.degree, edu.institution, edu.field].filter(Boolean);
      if (eduParts.length) parts.push(eduParts.join(' - '));
    }
  }

  return parts.join('\n');
}
