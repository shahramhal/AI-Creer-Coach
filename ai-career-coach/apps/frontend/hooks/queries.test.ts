import { describe, it, expect } from 'vitest';
import { queryKeys } from './queries';

describe('queryKeys', () => {
  it('should have a static cvs key as a tuple', () => {
    expect(queryKeys.cvs).toEqual(['cvs']);
  });

  it('should have a static progressSummary key', () => {
    expect(queryKeys.progressSummary).toEqual(['progressSummary']);
  });

  it('should have a static preferences key', () => {
    expect(queryKeys.preferences).toEqual(['preferences']);
  });

  it('should have a static recentActivity key', () => {
    expect(queryKeys.recentActivity).toEqual(['recentActivity']);
  });

  it('should have a static applicationStats key', () => {
    expect(queryKeys.applicationStats).toEqual(['applicationStats']);
  });

  describe('jobMatches', () => {
    it('should include the topK value in the key', () => {
      expect(queryKeys.jobMatches(10)).toEqual(['jobMatches', 10]);
    });

    it('should produce distinct keys for different topK values', () => {
      const keyA = queryKeys.jobMatches(3);
      const keyB = queryKeys.jobMatches(50);
      expect(keyA).not.toEqual(keyB);
    });
  });

  describe('salaryInsights', () => {
    it('should include role, region, and country in the key', () => {
      expect(queryKeys.salaryInsights('Engineer', 'London', 'gb')).toEqual([
        'salaryInsights',
        'Engineer',
        'London',
        'gb',
      ]);
    });

    it('should produce distinct keys for different roles', () => {
      const keyA = queryKeys.salaryInsights('Engineer', 'London', 'gb');
      const keyB = queryKeys.salaryInsights('Manager', 'London', 'gb');
      expect(keyA).not.toEqual(keyB);
    });
  });

  describe('applications', () => {
    it('should include the status when provided', () => {
      expect(queryKeys.applications('interview')).toEqual(['applications', 'interview']);
    });

    it('should include undefined when no status is provided', () => {
      expect(queryKeys.applications(undefined)).toEqual(['applications', undefined]);
    });

    it('should produce distinct keys for different statuses', () => {
      const appliedKey = queryKeys.applications('applied');
      const interviewKey = queryKeys.applications('interview');
      expect(appliedKey).not.toEqual(interviewKey);
    });
  });
});
