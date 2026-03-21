import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Kanban } from "lucide-react";

export function ApplicationKanban() {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Application Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Kanban className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Application tracking coming soon</p>
          <p className="text-xs text-muted-foreground">Manage your applications with a visual pipeline</p>
        </div>
      </CardContent>
    </Card>
  );
}
