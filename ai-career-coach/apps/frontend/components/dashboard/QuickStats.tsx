import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Briefcase, Target, BookOpen, TrendingUp } from "lucide-react";
import { staggerContainer, staggerItem } from "@/library/motion";
import { cn } from "@/library/utils";

interface QuickStatsProps {
  matchCount?: number;
  skillsToLearn?: number;
  inProgressSkills?: number;
  activeApplications?: number;
  responseRate?: number;
  isLoading: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  numericValue?: number;
  suffix?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  isLoading?: boolean;
}

function StatCard({ title, value, numericValue, suffix = '', change, changeType = "neutral", icon: Icon, isLoading }: StatCardProps) {
  return (
    <motion.div variants={staggerItem}>
      <Card className="border-border bg-card shadow-card transition-all hover:shadow-glow hover:scale-[1.01]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{title}</p>
              {isLoading ? (
                <div className="mt-1 h-8 w-16 bg-muted/50 rounded animate-pulse" />
              ) : numericValue !== undefined ? (
                <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                  <CountUp value={numericValue} suffix={suffix} duration={1} />
                </p>
              ) : (
                <p className="mt-1 font-mono text-2xl font-bold text-foreground">{value}</p>
              )}
              {change && !isLoading && (
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
    </motion.div>
  );
}

export function QuickStats({ matchCount, skillsToLearn, inProgressSkills, activeApplications, responseRate, isLoading }: QuickStatsProps) {
  return (
    <motion.div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <StatCard
        title="Job Matches"
        value={matchCount ?? "--"}
        numericValue={matchCount}
        change={matchCount !== undefined ? "Above 55% match" : undefined}
        changeType="positive"
        icon={Target}
        isLoading={isLoading}
      />
      <StatCard
        title="Skills to Learn"
        value={skillsToLearn ?? "--"}
        numericValue={skillsToLearn}
        change={inProgressSkills !== undefined ? `${inProgressSkills} in progress` : undefined}
        changeType="neutral"
        icon={BookOpen}
        isLoading={isLoading}
      />
      <StatCard
        title="Active Applications"
        value={activeApplications ?? "--"}
        numericValue={activeApplications}
        change={activeApplications !== undefined ? "Excludes rejected" : undefined}
        changeType="neutral"
        icon={Briefcase}
        isLoading={isLoading}
      />
      <StatCard
        title="Response Rate"
        value={responseRate !== undefined ? `${responseRate}%` : "--"}
        numericValue={responseRate}
        suffix="%"
        change={responseRate !== undefined ? "Interview or offer" : undefined}
        changeType={responseRate !== undefined && responseRate > 0 ? "positive" : "neutral"}
        icon={TrendingUp}
        isLoading={isLoading}
      />
    </motion.div>
  );
}
