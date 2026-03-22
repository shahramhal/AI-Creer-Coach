import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Sparkles,
  FileText,
  Target,
  BookOpen,
  Settings,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/library/utils";
import Link from "next/link";
import type { CV } from "@/types/cv.types";
import type { ProgressSummary } from "@/types/skillGap.types";
import type { CareerPreferences } from "@/types/settings.types";

interface RecommendedActionsProps {
  cvData?: CV | null;
  skillData?: ProgressSummary | null;
  preferences?: CareerPreferences | null;
  matchCount?: number;
}

interface Action {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  icon: React.ElementType;
  cta: string;
  href: string;
}

const impactColors = {
  high: "bg-metric-excellent/10 text-metric-excellent border-metric-excellent/20",
  medium: "bg-metric-average/10 text-metric-average border-metric-average/20",
  low: "bg-muted text-muted-foreground border-border",
};

function buildActions(
  cvData?: CV | null,
  skillData?: ProgressSummary | null,
  preferences?: CareerPreferences | null,
  matchCount?: number,
): Action[] {
  const actions: Action[] = [];

  if (!cvData) {
    actions.push({
      id: "upload-cv",
      title: "Upload your CV",
      description: "Start by uploading your CV to unlock all features",
      impact: "high",
      icon: FileText,
      cta: "Upload CV",
      href: "/cvs",
    });
  } else if (!cvData.overviewData) {
    actions.push({
      id: "analyze-cv",
      title: "Analyze your CV",
      description: "Get a health score and improvement recommendations",
      impact: "high",
      icon: FileText,
      cta: "Analyze",
      href: "/cvs",
    });
  }

  if (!preferences?.targetRole) {
    actions.push({
      id: "set-role",
      title: "Set your target role",
      description: "Define your career goals for personalized insights",
      impact: "high",
      icon: Settings,
      cta: "Settings",
      href: "/settings",
    });
  }

  if (cvData?.overviewData && cvData.overviewData.overallScore < 70) {
    const issueCount = cvData.overviewData.priorityIssues?.length ?? 0;
    actions.push({
      id: "improve-cv",
      title: "Improve your CV",
      description: issueCount > 0 ? `${issueCount} priority issues to fix` : "Your CV score could be higher",
      impact: "high",
      icon: AlertCircle,
      cta: "Fix Issues",
      href: "/cvs",
    });
  }

  if (skillData && skillData.inProgressPaths > 0) {
    const inProgressPath = skillData.paths?.find(p => p.status === 'in_progress');
    actions.push({
      id: "continue-learning",
      title: inProgressPath ? `Continue learning ${inProgressPath.skillName}` : "Continue your learning",
      description: `${skillData.inProgressPaths} skill${skillData.inProgressPaths > 1 ? 's' : ''} in progress`,
      impact: "medium",
      icon: BookOpen,
      cta: "Learn",
      href: "/skills",
    });
  }

  if (matchCount && matchCount > 0) {
    actions.push({
      id: "review-matches",
      title: `Review ${matchCount} job matches`,
      description: "New jobs matching your profile are available",
      impact: "medium",
      icon: Target,
      cta: "View Jobs",
      href: "/jobs",
    });
  }

  return actions.slice(0, 3);
}

export function RecommendedActions({ cvData, skillData, preferences, matchCount }: RecommendedActionsProps) {
  const actions = buildActions(cvData, skillData, preferences, matchCount);

  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recommended Actions
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle className="h-8 w-8 text-metric-excellent" />
            <p className="text-sm font-medium text-foreground">You&apos;re all set!</p>
            <p className="text-xs text-muted-foreground">No pending actions right now</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  className="group flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn("text-xs capitalize", impactColors[action.impact])}>
                      {action.impact}
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-8 text-xs opacity-0 transition-opacity group-hover:opacity-100" asChild>
                      <Link href={action.href}>
                        {action.cta}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
