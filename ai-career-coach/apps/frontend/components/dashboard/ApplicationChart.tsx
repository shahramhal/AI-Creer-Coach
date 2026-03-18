import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export function ApplicationChart() {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Application Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Application tracking coming soon</p>
          <p className="text-xs text-muted-foreground">Track your applications and see conversion rates</p>
        </div>
      </CardContent>
    </Card>
  );
}
