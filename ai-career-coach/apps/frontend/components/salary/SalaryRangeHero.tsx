'use client';

import { useState } from 'react';
import type { SalaryPrediction } from '../../types/salary.types';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface SalaryRangeHeroProps {
  prediction: SalaryPrediction;
  location?: string;
}

function formatSalaryFull(amount: number, currency: string): string {
  return `${currency}${amount.toLocaleString()}`;
}

export default function SalaryRangeHero({ prediction, location }: SalaryRangeHeroProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isPositive = prediction.vsMarketAvg >= 0;
  const isMLSource = prediction.dataSource === 'ml';

  const locationLabel = location || 'National';
  const countryLabel = prediction.currency === '$' ? 'US' : prediction.currency === '£' ? 'UK' : '';
  const subtitle = `${prediction.jobTitle}${locationLabel !== 'National' ? ` in ${locationLabel}` : ''}${countryLabel ? `, ${countryLabel}` : ''}`;

  return (
    <div className="bg-card border border-border rounded-xl p-8 shadow-card">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        {/* Left: Salary range */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isMLSource
                ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
            }`}>
              {isMLSource ? 'ML Predicted' : 'Market Estimate'}
            </span>
            <div className="relative">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-metric-excellent/15 text-metric-excellent border border-metric-excellent/30 cursor-help"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                {prediction.confidence}% confidence
                <Info className="h-3 w-3" />
              </span>
              {showTooltip && (
                <div className="absolute left-0 top-full mt-2 w-72 p-3 rounded-lg bg-popover border border-border shadow-lg z-10 text-xs text-muted-foreground">
                  {isMLSource
                    ? 'Confidence is based on how well the ML model recognizes this job title, location, and skill set. Higher confidence means more training data matched your profile.'
                    : 'Confidence is based on the number of job listings found and how tightly salary data clusters. More listings with consistent pay = higher confidence.'}
                </div>
              )}
            </div>
          </div>

          <div className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            {formatSalaryFull(prediction.salaryMin, prediction.currency)}
            <span className="text-muted-foreground mx-2">-</span>
            {formatSalaryFull(prediction.salaryMax, prediction.currency)}
            <span className="text-lg font-normal text-muted-foreground ml-2">/year</span>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Right: Market comparison */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1.5 justify-end">
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-metric-excellent" />
            ) : (
              <TrendingDown className="h-5 w-5 text-metric-poor" />
            )}
            <span className={`text-2xl font-bold ${isPositive ? 'text-metric-excellent' : 'text-metric-poor'}`}>
              {isPositive ? '+' : ''}{prediction.vsMarketAvg}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">vs. market avg</p>
          <p className="text-xs text-muted-foreground mt-1">
            Predicted: {formatSalaryFull(prediction.predictedSalary, prediction.currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
