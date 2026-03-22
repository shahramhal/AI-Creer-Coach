import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Link from "next/link";
import type { CareerPreferences } from "@/types/settings.types";
import type { SalaryInsightsData } from "@/types/salary.types";

interface MarketInsightsProps {
  preferences?: CareerPreferences | null;
  salaryData?: SalaryInsightsData | null;
  isLoading: boolean;
}

export function MarketInsights({ preferences, salaryData, isLoading }: MarketInsightsProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Market Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[200px] bg-muted/50 rounded animate-pulse" />
            <div className="space-y-3">
              <div className="h-12 bg-muted/50 rounded animate-pulse" />
              <div className="h-12 bg-muted/50 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences?.targetRole) {
    return (
      <Card className="border-border bg-card shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Market Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Settings className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-foreground">Set your target role to see market insights</p>
              <p className="text-xs text-muted-foreground">We&apos;ll show salary data and skill demand for your target role</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!salaryData) {
    return (
      <Card className="border-border bg-card shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Market Insights: {preferences.targetRole}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">Unable to load market insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const skillDemandData = salaryData.skillROI
    .slice(0, 6)
    .map(entry => ({
      skill: entry.skill,
      demand: entry.demandTrend,
    }));

  const currencySymbol = salaryData.prediction.currency || '$';
  const formattedSalary = `${currencySymbol}${Math.round(salaryData.prediction.predictedSalary).toLocaleString()}`;
  const formattedMin = `${currencySymbol}${Math.round(salaryData.prediction.salaryMin).toLocaleString()}`;
  const formattedMax = `${currencySymbol}${Math.round(salaryData.prediction.salaryMax).toLocaleString()}`;

  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Market Insights: {preferences.targetRole}
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {salaryData.prediction.dataSource === 'ml' ? 'ML Prediction' : 'Market Data'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {skillDemandData.length > 0 && (
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
          )}

          <div className="space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground">Key Metrics</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <span className="text-sm text-muted-foreground">Predicted Salary</span>
                <span className="font-mono text-lg font-semibold text-foreground">
                  {formattedSalary}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <span className="text-sm text-muted-foreground">Salary Range</span>
                <span className="font-mono text-sm font-medium text-foreground">
                  {formattedMin} - {formattedMax}
                </span>
              </div>
              {salaryData.prediction.vsMarketAvg !== 0 && (
                <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                  <span className="text-sm text-muted-foreground">vs Market Average</span>
                  <Badge
                    className={`border-0 text-xs ${
                      salaryData.prediction.vsMarketAvg > 0
                        ? "bg-metric-excellent/10 text-metric-excellent"
                        : "bg-metric-poor/10 text-metric-poor"
                    }`}
                  >
                    {salaryData.prediction.vsMarketAvg > 0 ? '+' : ''}{salaryData.prediction.vsMarketAvg}%
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
