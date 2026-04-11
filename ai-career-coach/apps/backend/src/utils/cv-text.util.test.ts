import { describe, it, expect } from 'vitest';
import { buildCVText } from './cv-text.util.js';

describe('buildCVText', () => {
  it('returns raw_text directly when present', () => {
    const cv = { raw_text: 'raw content here', skills: ['python'] };
    expect(buildCVText(cv)).toBe('raw content here');
  });

  it('returns metadata.raw_text when raw_text is absent', () => {
    const cv = { metadata: { raw_text: 'meta raw content' }, skills: [] };
    expect(buildCVText(cv)).toBe('meta raw content');
  });

  it('builds text from summary, skills, experience, and education when no raw_text', () => {
    const cv = {
      summary: 'Experienced developer',
      skills: ['python', 'typescript'],
      experience: [
        { title: 'Engineer', company: 'Acme', description: 'Built things', responsibilities: ['Led team'] },
      ],
      education: [
        { degree: 'BSc', institution: 'Oxford', field: 'Computer Science' },
      ],
    };

    const result = buildCVText(cv);
    expect(result).toContain('Experienced developer');
    expect(result).toContain('Skills: python, typescript');
    expect(result).toContain('Engineer - Acme - Built things - Led team');
    expect(result).toContain('BSc - Oxford - Computer Science');
  });

  it('returns empty string when cv has no usable fields', () => {
    expect(buildCVText({})).toBe('');
  });

  it('skips experience entries that have no non-empty fields', () => {
    const cv = {
      experience: [{ title: '', company: '', description: '' }],
    };
    const result = buildCVText(cv);
    expect(result).toBe('');
  });

  it('skips education entries that have no non-empty fields', () => {
    const cv = {
      education: [{ degree: '', institution: '', field: '' }],
    };
    const result = buildCVText(cv);
    expect(result).toBe('');
  });

  it('handles experience without responsibilities field', () => {
    const cv = {
      experience: [{ title: 'Dev', company: 'Corp', description: 'Worked hard' }],
    };
    const result = buildCVText(cv);
    expect(result).toContain('Dev - Corp - Worked hard');
  });
});
