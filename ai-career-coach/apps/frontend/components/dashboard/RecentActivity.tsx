import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Briefcase, 
  CheckCircle, 
  XCircle, 
  Clock,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "application" | "cv_update" | "interview" | "rejection" | "response";
  title: string;
  description: string;
  time: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "interview",
    title: "Interview Scheduled",
    description: "Senior Frontend Engineer at Stripe",
    time: "2 hours ago",
  },
  {
    id: "2",
    type: "response",
    title: "Recruiter Response",
    description: "Netflix - Interested in your profile",
    time: "5 hours ago",
  },
  {
    id: "3",
    type: "application",
    title: "Application Sent",
    description: "Staff Engineer at Vercel",
    time: "1 day ago",
  },
  {
    id: "4",
    type: "cv_update",
    title: "CV Updated",
    description: "Score improved from 72 to 85",
    time: "2 days ago",
  },
  {
    id: "5",
    type: "rejection",
    title: "Application Closed",
    description: "Meta - Position filled",
    time: "3 days ago",
  },
];

const activityConfig = {
  application: {
    icon: Briefcase,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  cv_update: {
    icon: FileText,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  interview: {
    icon: CheckCircle,
    color: "text-metric-excellent",
    bgColor: "bg-metric-excellent/10",
  },
  rejection: {
    icon: XCircle,
    color: "text-metric-poor",
    bgColor: "bg-metric-poor/10",
  },
  response: {
    icon: MessageSquare,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
};

export function RecentActivity() {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent Activity
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          Today
        </Badge>
      </CardHeader>
      <CardContent>
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
                  {activity.time}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
