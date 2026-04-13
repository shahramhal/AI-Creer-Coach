import { describe, it, expect } from 'vitest';
import { LOCATION_OPTIONS, JOB_TITLE_OPTIONS } from './locationData';
import { COUNTRY_OPTIONS } from '@/constants/options';

describe('LOCATION_OPTIONS', () => {
  it('should export an object keyed by country code', () => {
    expect(typeof LOCATION_OPTIONS).toBe('object');
    expect(LOCATION_OPTIONS).not.toBeNull();
  });

  it('should contain a gb key with region entries', () => {
    expect(Array.isArray(LOCATION_OPTIONS.gb)).toBe(true);
    expect(LOCATION_OPTIONS.gb.length).toBeGreaterThan(0);
  });

  it('should have label and value on every gb region entry', () => {
    for (const entry of LOCATION_OPTIONS.gb) {
      expect(entry).toHaveProperty('label');
      expect(entry).toHaveProperty('value');
      expect(typeof entry.label).toBe('string');
      expect(typeof entry.value).toBe('string');
    }
  });

  it('should include London in the gb region list', () => {
    const londonEntry = LOCATION_OPTIONS.gb.find((entry) => entry.value === 'London');
    expect(londonEntry).toBeDefined();
    expect(londonEntry?.label).toBe('London');
  });

  it('should contain a us key with state entries', () => {
    expect(Array.isArray(LOCATION_OPTIONS.us)).toBe(true);
    expect(LOCATION_OPTIONS.us.length).toBeGreaterThan(0);
  });

  it('should include New York in the us region list', () => {
    const nyEntry = LOCATION_OPTIONS.us.find((entry) => entry.value === 'New York');
    expect(nyEntry).toBeDefined();
  });

  it('should contain a de key with German region entries', () => {
    expect(Array.isArray(LOCATION_OPTIONS.de)).toBe(true);
    expect(LOCATION_OPTIONS.de.length).toBeGreaterThan(0);
  });

  it('should allow empty arrays for country codes without region data', () => {
    expect(Array.isArray(LOCATION_OPTIONS.in)).toBe(true);
    expect(LOCATION_OPTIONS.in).toHaveLength(0);
  });
});

describe('JOB_TITLE_OPTIONS', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(JOB_TITLE_OPTIONS)).toBe(true);
    expect(JOB_TITLE_OPTIONS.length).toBeGreaterThan(0);
  });

  it('should contain common tech job titles', () => {
    expect(JOB_TITLE_OPTIONS).toContain('Software Engineer');
    expect(JOB_TITLE_OPTIONS).toContain('Data Scientist');
    expect(JOB_TITLE_OPTIONS).toContain('Frontend Developer');
  });

  it('should only contain string values', () => {
    for (const title of JOB_TITLE_OPTIONS) {
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    }
  });
});

describe('COUNTRY_OPTIONS (re-exported from constants)', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(COUNTRY_OPTIONS)).toBe(true);
    expect(COUNTRY_OPTIONS.length).toBeGreaterThan(0);
  });

  it('should include United Kingdom', () => {
    const gb = COUNTRY_OPTIONS.find((option) => option.value === 'gb');
    expect(gb).toBeDefined();
    expect(gb?.label).toBe('United Kingdom');
  });

  it('should include United States', () => {
    const us = COUNTRY_OPTIONS.find((option) => option.value === 'us');
    expect(us).toBeDefined();
    expect(us?.label).toBe('United States');
  });

  it('should have label and value on every entry', () => {
    for (const option of COUNTRY_OPTIONS) {
      expect(typeof option.label).toBe('string');
      expect(typeof option.value).toBe('string');
    }
  });
});
