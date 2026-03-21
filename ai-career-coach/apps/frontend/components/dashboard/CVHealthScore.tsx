import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, AlertCircle } from "lucide-react";

interface CVHealthScoreProps {
  score: number;
  change: number;
  issues: number;
}

export function CVHealthScore({ score, change, issues }: CVHealthScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-metric-excellent";
    if (score >= 60) return "text-metric-good";
    if (score >= 40) return "text-metric-average";
    return "text-metric-poor";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-metric-excellent/20 to-metric-excellent/5";
    if (score >= 60) return "from-metric-good/20 to-metric-good/5";
    if (score >= 40) return "from-metric-average/20 to-metric-average/5";
    return "from-metric-poor/20 to-metric-poor/5";
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className="relative overflow-hidden border-border bg-card shadow-card">
      <div className={`absolute inset-0 bg-gradient-to-br ${getScoreGradient(score)} opacity-50`} />
      <CardHeader className="relative flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          CV Health Score
        </CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-center gap-6">
          {/* Circular Progress */}
          <div className="relative h-28 w-28">
            <svg className="h-28 w-28 -rotate-90 transform">
              {/* Background circle */}
              <circle
                cx="56"
                cy="56"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/50"
              />
              {/* Progress circle */}
              <circle
                cx="56"
                cy="56"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={getScoreColor(score)}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                  transition: "stroke-dashoffset 1s ease-in-out",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-mono text-3xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-metric-excellent" />
              <span className="text-sm">
                <span className="font-medium text-metric-excellent">+{change}%</span>
                <span className="text-muted-foreground"> vs last week</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-metric-average" />
              <span className="text-sm">
                <span className="font-medium text-metric-average">{issues}</span>
                <span className="text-muted-foreground"> issues to fix</span>
              </span>
            </div>
            <Button size="sm" className="mt-1 h-8">
              Improve Score
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
