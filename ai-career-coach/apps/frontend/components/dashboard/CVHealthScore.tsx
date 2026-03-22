import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Upload } from "lucide-react";
import Link from "next/link";

interface CVHealthScoreProps {
  score: number | null;
  issues: number;
  hasCv: boolean;
  hasAnalysis: boolean;
  isLoading: boolean;
}

export function CVHealthScore({ score, issues, hasCv, hasAnalysis, isLoading }: CVHealthScoreProps) {
  const getScoreColor = (scoreValue: number) => {
    if (scoreValue >= 80) return "text-metric-excellent";
    if (scoreValue >= 60) return "text-metric-good";
    if (scoreValue >= 40) return "text-metric-average";
    return "text-metric-poor";
  };

  const getScoreGradient = (scoreValue: number) => {
    if (scoreValue >= 80) return "from-metric-excellent/20 to-metric-excellent/5";
    if (scoreValue >= 60) return "from-metric-good/20 to-metric-good/5";
    if (scoreValue >= 40) return "from-metric-average/20 to-metric-average/5";
    return "from-metric-poor/20 to-metric-poor/5";
  };

  const circumference = 2 * Math.PI * 45;
  const displayScore = score ?? 0;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden border-border bg-card shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">CV Health Score</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="h-28 w-28 rounded-full bg-muted/50 animate-pulse" />
            <div className="flex flex-col gap-3">
              <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
              <div className="h-8 w-28 bg-muted/50 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasCv) {
    return (
      <Card className="relative overflow-hidden border-border bg-card shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">CV Health Score</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Upload className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-foreground">Upload your CV</p>
              <p className="text-xs text-muted-foreground">Get your CV health score and improvement tips</p>
            </div>
            <Button size="sm" asChild>
              <Link href="/cvs">Upload CV</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasAnalysis) {
    return (
      <Card className="relative overflow-hidden border-border bg-card shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">CV Health Score</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative h-28 w-28">
              <svg className="h-28 w-28 -rotate-90 transform">
                <circle cx="56" cy="56" r="45" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/50" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-3xl font-bold text-muted-foreground">--</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Analyze your CV to get a score</p>
              <Button size="sm" asChild>
                <Link href="/cvs">Analyze CV</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-border bg-card shadow-card">
      <div className={`absolute inset-0 bg-gradient-to-br ${getScoreGradient(displayScore)} opacity-50`} />
      <CardHeader className="relative flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">CV Health Score</CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-center gap-6">
          <div className="relative h-28 w-28">
            <svg className="h-28 w-28 -rotate-90 transform">
              <circle cx="56" cy="56" r="45" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/50" />
              <circle
                cx="56" cy="56" r="45" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round"
                className={getScoreColor(displayScore)}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                  transition: "stroke-dashoffset 1s ease-in-out",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-mono text-3xl font-bold ${getScoreColor(displayScore)}`}>
                {displayScore}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {issues > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-metric-average" />
                <span className="text-sm">
                  <span className="font-medium text-metric-average">{issues}</span>
                  <span className="text-muted-foreground"> issues to fix</span>
                </span>
              </div>
            )}
            <Button size="sm" className="mt-1 h-8" asChild>
              <Link href="/cvs">Improve Score</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
