import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Kanban } from "lucide-react";
import type { Application, ApplicationStatus } from "@/types/application.types";

interface ApplicationKanbanProps {
  applications?: Application[];
  isLoading?: boolean;
}

const COLUMNS: { key: ApplicationStatus; label: string; color: string }[] = [
  { key: 'applied', label: 'Applied', color: 'bg-blue-500' },
  { key: 'interview', label: 'Interview', color: 'bg-yellow-500' },
  { key: 'offer', label: 'Offer', color: 'bg-green-500' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-500' },
];

const MAX_VISIBLE = 3;

export function ApplicationKanban({ applications, isLoading }: ApplicationKanbanProps) {
  const hasData = applications && applications.length > 0;

  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: (applications ?? []).filter((a) => a.status === col.key),
  }));

  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Application Pipeline
          </CardTitle>
          {hasData && (
            <Link
              href="/applications"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Kanban className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No applications yet</p>
            <p className="text-xs text-muted-foreground">Manage your applications with a visual pipeline</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {grouped.map((col) => (
              <div key={col.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                  <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                    {col.items.length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {col.items.slice(0, MAX_VISIBLE).map((app) => (
                    <div
                      key={app.id}
                      className="rounded-md border border-border bg-background p-2 text-xs"
                    >
                      <p className="font-medium truncate">{app.jobTitle}</p>
                      <p className="text-muted-foreground truncate">{app.company}</p>
                    </div>
                  ))}
                  {col.items.length > MAX_VISIBLE && (
                    <Link
                      href="/applications"
                      className="block text-center text-[11px] text-primary hover:underline py-1"
                    >
                      +{col.items.length - MAX_VISIBLE} more
                    </Link>
                  )}
                  {col.items.length === 0 && (
                    <div className="rounded-md border border-dashed border-border p-2 text-center">
                      <p className="text-[11px] text-muted-foreground/50">None</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
