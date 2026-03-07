'use client';

import { Trophy } from 'lucide-react';
import type { TopPayingRole } from '../../types/salary.types';

interface TopPayingRolesProps {
  roles: TopPayingRole[];
  currency: string;
}

function formatSalary(amount: number, currency: string): string {
  if (amount >= 1000) {
    return `${currency}${Math.round(amount / 1000)}k`;
  }
  return `${currency}${amount.toLocaleString()}`;
}

export default function TopPayingRoles({ roles, currency }: TopPayingRolesProps) {
  if (roles.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-4">Top-Paying Roles</h3>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          No role variant data available
        </div>
      </div>
    );
  }

  const highestSalary = roles[0]?.avgSalary ?? 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <h3 className="text-base font-semibold text-foreground">Top-Paying Roles</h3>
      </div>
      <ol className="space-y-3">
        {roles.map((role, index) => {
          const isHighest = role.avgSalary === highestSalary;
          return (
            <li
              key={index}
              className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                isHighest ? 'bg-yellow-400/10 border border-yellow-400/20' : 'border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-5">
                  {index + 1}.
                </span>
                <span className={`text-sm ${isHighest ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                  {role.role}
                </span>
              </div>
              <span className={`text-sm font-semibold ${isHighest ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                {formatSalary(role.avgSalary, currency)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
