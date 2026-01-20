import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Target, BookOpen, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
}

function StatCard({ title, value, change, changeType = "neutral", icon: Icon }: StatCardProps) {
  return (
    <Card className="border-border bg-card shadow-card transition-all hover:shadow-glow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-foreground">{value}</p>
            {change && (
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

export function QuickStats() {
  const stats: StatCardProps[] = [
    {
      title: "Active Applications",
      value: 24,
      change: "+3 this week",
      changeType: "positive",
      icon: Briefcase,
    },
    {
      title: "Job Matches",
      value: 156,
      change: "12 new today",
      changeType: "positive",
      icon: Target,
    },
    {
      title: "Skills to Learn",
      value: 5,
      change: "2 in progress",
      changeType: "neutral",
      icon: BookOpen,
    },
    {
      title: "Response Rate",
      value: "32%",
      change: "+5% vs avg",
      changeType: "positive",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
