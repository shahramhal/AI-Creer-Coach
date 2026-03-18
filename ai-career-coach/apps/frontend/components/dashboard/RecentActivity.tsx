import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Briefcase,
  BookOpen,
  CheckCircle,
  Bookmark,
  Clock,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/library/utils";
import type { DashboardActivity } from "@/types/dashboard.types";

interface RecentActivityProps {
  activities?: DashboardActivity[];
  isLoading: boolean;
}

const activityConfig = {
  cv_upload: {
    icon: FileText,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  cv_update: {
    icon: FileText,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  application: {
    icon: Briefcase,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  job_saved: {
    icon: Bookmark,
    color: "text-metric-good",
    bgColor: "bg-metric-good/10",
  },
  learning_started: {
    icon: BookOpen,
    color: "text-metric-average",
    bgColor: "bg-metric-average/10",
  },
  learning_completed: {
    icon: CheckCircle,
    color: "text-metric-excellent",
    bgColor: "bg-metric-excellent/10",
  },
};

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent Activity
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          Latest
        </Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted/50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !activities || activities.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No recent activity yet</p>
            <p className="text-xs text-muted-foreground">Your actions will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={cn("rounded-lg p-2", config.bgColor)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(activity.timestamp)}
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
