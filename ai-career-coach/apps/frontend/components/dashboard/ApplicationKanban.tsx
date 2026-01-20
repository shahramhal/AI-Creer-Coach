import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanColumn {
  id: string;
  title: string;
  count: number;
  color: string;
  items: { company: string; role: string; date: string }[];
}

const columns: KanbanColumn[] = [
  {
    id: "saved",
    title: "Saved",
    count: 12,
    color: "bg-muted-foreground",
    items: [
      { company: "Google", role: "Senior SWE", date: "2d ago" },
      { company: "Apple", role: "Staff Engineer", date: "3d ago" },
    ],
  },
  {
    id: "applied",
    title: "Applied",
    count: 8,
    color: "bg-primary",
    items: [
      { company: "Stripe", role: "Frontend Lead", date: "1d ago" },
      { company: "Airbnb", role: "Senior FE", date: "4d ago" },
    ],
  },
  {
    id: "interview",
    title: "Interview",
    count: 3,
    color: "bg-chart-4",
    items: [
      { company: "Meta", role: "E6 Engineer", date: "Today" },
    ],
  },
  {
    id: "offer",
    title: "Offer",
    count: 1,
    color: "bg-metric-excellent",
    items: [
      { company: "Netflix", role: "Senior SWE", date: "5d ago" },
    ],
  },
];

export function ApplicationKanban() {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Application Pipeline
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          Full Board
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Column Headers */}
        <div className="mb-4 grid grid-cols-4 gap-3">
          {columns.map((column) => (
            <div key={column.id} className="flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full", column.color)} />
              <span className="text-xs font-medium text-muted-foreground">
                {column.title}
              </span>
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {column.count}
              </Badge>
            </div>
          ))}
        </div>

        {/* Kanban Cards */}
        <div className="grid grid-cols-4 gap-3">
          {columns.map((column) => (
            <div key={column.id} className="space-y-2">
              {column.items.map((item, index) => (
                <div
                  key={index}
                  className="group cursor-pointer rounded-lg border border-border bg-muted/30 p-3 transition-all hover:border-primary/30 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">
                        {item.company}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.role}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.date}
                  </p>
                </div>
              ))}
              {column.items.length < 2 && (
                <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border">
                  <span className="text-xs text-muted-foreground">
                    +{column.count - column.items.length} more
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
