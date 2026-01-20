import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  Sparkles, 
  FileText, 
  Target,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Action {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  icon: React.ElementType;
  cta: string;
}

const actions: Action[] = [
  {
    id: "1",
    title: "Add Docker to your CV",
    description: "89% of your target jobs require this skill",
    impact: "high",
    icon: FileText,
    cta: "Update CV",
  },
  {
    id: "2",
    title: "Apply to 3 high-match jobs",
    description: "New matches above 90% compatibility",
    impact: "high",
    icon: Target,
    cta: "View Jobs",
  },
  {
    id: "3",
    title: "Complete AWS certification path",
    description: "Increase salary potential by $18k",
    impact: "medium",
    icon: TrendingUp,
    cta: "Start Learning",
  },
];

const impactColors = {
  high: "bg-metric-excellent/10 text-metric-excellent border-metric-excellent/20",
  medium: "bg-metric-average/10 text-metric-average border-metric-average/20",
  low: "bg-muted text-muted-foreground border-border",
};

export function RecommendedActions() {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recommended Actions
          </CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          View All
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action, index) => {
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
                    <p className="text-sm font-medium text-foreground">
                      {action.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn("text-xs capitalize", impactColors[action.impact])}
                  >
                    {action.impact}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    {action.cta}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
