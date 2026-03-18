import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Target, BookOpen, TrendingUp } from "lucide-react";
import { cn } from "@/library/utils";

interface QuickStatsProps {
  matchCount?: number;
  skillsToLearn?: number;
  inProgressSkills?: number;
  isLoading: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  isLoading?: boolean;
}

function StatCard({ title, value, change, changeType = "neutral", icon: Icon, isLoading }: StatCardProps) {
  return (
    <Card className="border-border bg-card shadow-card transition-all hover:shadow-glow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <div className="mt-1 h-8 w-16 bg-muted/50 rounded animate-pulse" />
            ) : (
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">{value}</p>
            )}
            {change && !isLoading && (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  changeType === "positive" && "text-metric-excellent",
                  changeType === "negative" && "text-metric-poor",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickStats({ matchCount, skillsToLearn, inProgressSkills, isLoading }: QuickStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Job Matches"
        value={matchCount ?? "--"}
        change={matchCount !== undefined ? `Top ${matchCount} matches` : undefined}
        changeType="positive"
        icon={Target}
        isLoading={isLoading}
      />
      <StatCard
        title="Skills to Learn"
        value={skillsToLearn ?? "--"}
        change={inProgressSkills !== undefined ? `${inProgressSkills} in progress` : undefined}
        changeType="neutral"
        icon={BookOpen}
        isLoading={isLoading}
      />
      <StatCard
        title="Active Applications"
        value="--"
        change="Coming soon"
        changeType="neutral"
        icon={Briefcase}
      />
      <StatCard
        title="Response Rate"
        value="--"
        change="Coming soon"
        changeType="neutral"
        icon={TrendingUp}
      />
    </div>
  );
}
