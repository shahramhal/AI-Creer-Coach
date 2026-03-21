import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const data = [
  { month: "Jan", applications: 12, responses: 3, interviews: 1 },
  { month: "Feb", applications: 18, responses: 5, interviews: 2 },
  { month: "Mar", applications: 24, responses: 8, interviews: 3 },
  { month: "Apr", applications: 32, responses: 12, interviews: 5 },
  { month: "May", applications: 28, responses: 10, interviews: 4 },
  { month: "Jun", applications: 38, responses: 15, interviews: 7 },
];

export function ApplicationChart() {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Application Funnel
        </CardTitle>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Applications</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-chart-2" />
            <span className="text-muted-foreground">Responses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-chart-4" />
            <span className="text-muted-foreground">Interviews</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 15%)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 10%)",
                  border: "1px solid hsl(217, 33%, 15%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(210, 40%, 98%)" }}
              />
              <Area
                type="monotone"
                dataKey="applications"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorApplications)"
              />
              <Area
                type="monotone"
                dataKey="responses"
                stroke="hsl(142, 76%, 46%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorResponses)"
              />
              <Area
                type="monotone"
                dataKey="interviews"
                stroke="hsl(280, 65%, 60%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorInterviews)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
