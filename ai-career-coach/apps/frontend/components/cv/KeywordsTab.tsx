'use client';

import type { MissingKeyword } from '../../types/cv.types';

interface KeywordsTabProps {
  keywords: MissingKeyword[];
}

export default function KeywordsTab({ keywords }: KeywordsTabProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-base font-semibold text-muted-foreground mb-5">
        Missing Keywords for Target Role
      </h3>

      {keywords.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Your CV covers all major keywords for your target role. Great job!
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Keyword
                </th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Job Frequency
                </th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Add to Section
                </th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Impact
                </th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw, index) => (
                <tr
                  key={index}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-4">
                    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      {kw.keyword}
                    </span>
                  </td>
                  <td className="py-4 text-sm font-medium text-foreground">
                    {kw.jobFrequency}
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {kw.section}
                  </td>
                  <td className="py-4">
                    <span className="inline-flex items-center rounded-full border border-metric-excellent/30 bg-metric-excellent/10 px-2.5 py-0.5 text-xs font-semibold text-metric-excellent">
                      {kw.impact}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
