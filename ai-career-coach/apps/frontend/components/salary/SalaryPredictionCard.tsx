'use client';

import type { SalaryPrediction } from '../../types/salary.types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SalaryPredictionCardProps {
  prediction: SalaryPrediction;
}

function formatSalary(amount: number, currency: string): string {
  if (amount >= 1000) {
    return `${currency}${Math.round(amount / 1000)}k`;
  }
  return `${currency}${amount.toLocaleString()}`;
}

export default function SalaryPredictionCard({ prediction }: SalaryPredictionCardProps) {
  const isPositive = prediction.vsMarketAvg >= 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card">
      <div className="flex items-start justify-between">
        {/* Left: Salary info */}
        <div>
          <p className="text-sm text-muted-foreground">
            Predicted Salary for {prediction.jobTitle}
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-bold text-foreground">
              {formatSalary(prediction.predictedSalary, prediction.currency)}
            </span>
            <span className="text-lg text-muted-foreground">/year</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-muted-foreground">
              Range: <span className="font-medium text-foreground">{formatSalary(prediction.salaryMin, prediction.currency)}</span>
              {' '}-{' '}
              <span className="font-medium text-foreground">{formatSalary(prediction.salaryMax, prediction.currency)}</span>
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-metric-excellent/15 text-metric-excellent border border-metric-excellent/30">
              {prediction.confidence}% confidence
            </span>
          </div>
        </div>

        {/* Right: Market comparison */}
        <div className="text-right">
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
        </div>
      </div>
    </div>
  );
}
