'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ExternalLink } from 'lucide-react';
import type { MissingSkillEntry } from '../../types/salary.types';

interface MissingSkillsTableProps {
  skills: MissingSkillEntry[];
}

function getImportanceColor(importance: 'High' | 'Medium' | 'Low'): string {
  switch (importance) {
    case 'High': return 'text-metric-poor bg-metric-poor/15 border-metric-poor/30';
    case 'Medium': return 'text-yellow-400 bg-yellow-400/15 border-yellow-400/30';
    case 'Low': return 'text-muted-foreground bg-muted/50 border-border';
  }
}

function LearnDropdown({ skill }: { skill: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const encodedSkill = encodeURIComponent(skill);
  const links = [
    { label: 'Udemy', url: `https://www.udemy.com/courses/search/?q=${encodedSkill}` },
    { label: 'Coursera', url: `https://www.coursera.org/search?query=${encodedSkill}` },
    { label: 'YouTube', url: `https://www.youtube.com/results?search_query=${encodedSkill}+tutorial` },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
      >
        <BookOpen className="h-3 w-3" />
        Learn
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-40 rounded-lg bg-popover border border-border shadow-lg z-20 py-1">
            {links.map(link => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                {link.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function MissingSkillsTable({ skills }: MissingSkillsTableProps) {
  if (skills.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-4">Skills You're Missing</h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          Upload a CV to see which skills you're missing
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card">
      <h3 className="text-base font-semibold text-foreground mb-4">Skills You're Missing</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-sm font-medium text-muted-foreground pb-3 pr-4">Skill</th>
              <th className="text-left text-sm font-medium text-muted-foreground pb-3 pr-4">Importance</th>
              <th className="text-right text-sm font-medium text-muted-foreground pb-3">Resources</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((entry, index) => (
              <tr key={index} className="border-b border-border/50 last:border-0">
                <td className="py-4 pr-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium border border-border bg-muted/30 text-foreground">
                    {entry.skill}
                  </span>
                </td>
                <td className="py-4 pr-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getImportanceColor(entry.importance)}`}>
                    {entry.importance}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <LearnDropdown skill={entry.skill} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
