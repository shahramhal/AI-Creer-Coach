import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const skillDemandData = [
  { skill: "React", demand: 92, trend: "up" },
  { skill: "TypeScript", demand: 88, trend: "up" },
  { skill: "AWS", demand: 85, trend: "up" },
  { skill: "Python", demand: 82, trend: "stable" },
  { skill: "Kubernetes", demand: 78, trend: "up" },
  { skill: "GraphQL", demand: 65, trend: "down" },
];

const trendIcons = {
  up: <TrendingUp className="h-3 w-3 text-metric-excellent" />,
  down: <TrendingDown className="h-3 w-3 text-metric-poor" />,
  stable: <Minus className="h-3 w-3 text-muted-foreground" />,
};

export function MarketInsights() {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Market Insights: Senior Frontend Engineer
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          Updated today
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Skill Demand Chart */}
          <div>
            <h4 className="mb-3 text-xs font-medium text-muted-foreground">
              Skill Demand Index
            </h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillDemandData} layout="vertical">
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
                  />
                  <YAxis
                    dataKey="skill"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222, 47%, 10%)",
                      border: "1px solid hsl(217, 33%, 15%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Demand"]}
                  />
                  <Bar dataKey="demand" radius={[0, 4, 4, 0]}>
                    {skillDemandData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.demand >= 80
                            ? "hsl(217, 91%, 60%)"
                            : entry.demand >= 60
                            ? "hsl(173, 80%, 40%)"
                            : "hsl(215, 20%, 45%)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground">
              Key Metrics
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <span className="text-sm text-muted-foreground">
                  Avg. Salary (Bay Area)
                </span>
                <span className="font-mono text-lg font-semibold text-foreground">
                  $195,000
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <span className="text-sm text-muted-foreground">
                  Open Positions
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-semibold text-foreground">
                    12,450
                  </span>
                  <Badge className="bg-metric-excellent/10 text-metric-excellent border-0 text-xs">
                    +8%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <span className="text-sm text-muted-foreground">
                  Competition Index
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-semibold text-foreground">
                    Medium
                  </span>
                  <Badge className="bg-metric-average/10 text-metric-average border-0 text-xs">
                    45:1
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
