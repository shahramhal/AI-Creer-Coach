import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  MapPin,
  Building2,
  Clock,
  Check,
  X,
  Target,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatRelativeTime } from "@/library/utils";
import type { MatchedJob } from "@/types/matching.types";
import Link from "next/link";

interface JobMatchPreviewProps {
  jobs?: MatchedJob[];
  isLoading: boolean;
}

function formatSalary(salaryMin?: number, salaryMax?: number): string {
  if (!salaryMin && !salaryMax) return "Salary not listed";
  const formatNumber = (num: number) => {
    if (num >= 1000) return `$${Math.round(num / 1000)}k`;
    return `$${num}`;
  };
  if (salaryMin && salaryMax) return `${formatNumber(salaryMin)} - ${formatNumber(salaryMax)}`;
  if (salaryMin) return `From ${formatNumber(salaryMin)}`;
  return `Up to ${formatNumber(salaryMax!)}`;
}

function getMatchColor(score: number) {
  if (score >= 90) return "text-metric-excellent";
  if (score >= 70) return "text-metric-good";
  if (score >= 50) return "text-metric-average";
  return "text-metric-poor";
}

export function JobMatchPreview({ jobs, isLoading }: JobMatchPreviewProps) {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Top Job Matches
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
          <Link href="/jobs">
            View All Jobs
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-muted/50 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 w-1/3 bg-muted/50 rounded animate-pulse" />
                  </div>
                  <div className="h-10 w-16 bg-muted/50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !jobs || jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Target className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No job matches yet</p>
            <p className="text-xs text-muted-foreground">Run job matching to see results</p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/jobs">Find Jobs</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const matchScore = Math.round(job.match_score * 100);
              const isRemote = job.remote_type?.toLowerCase() === 'remote';
              const skills = [
                ...job.match_breakdown.matched_skills.map(name => ({ name, matched: true })),
                ...job.match_breakdown.missing_skills.map(name => ({ name, matched: false })),
              ].slice(0, 4);

              return (
                <div
                  key={job.job_id}
                  className="group rounded-lg border border-border p-4 transition-all hover:border-primary/30 hover:shadow-glow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{job.title}</h3>
                        {isRemote && (
                          <Badge variant="secondary" className="text-xs">Remote</Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {job.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location || 'Location not listed'}
                        </span>
                        {job.posted_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(job.posted_date)}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 font-mono text-sm font-medium text-foreground">
                        {formatSalary(job.salary_min, job.salary_max)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-mono text-2xl font-bold ${getMatchColor(matchScore)}`}>
                          {matchScore}%
                        </span>
                        <span className="text-xs text-muted-foreground">match</span>
                      </div>
                      <Progress value={matchScore} className="mt-2 h-1.5 w-20" />
                    </div>
                  </div>
                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge
                          key={skill.name}
                          variant="outline"
                          className={
                            skill.matched
                              ? "border-metric-excellent/30 bg-metric-excellent/10 text-metric-excellent"
                              : "border-metric-poor/30 bg-metric-poor/10 text-metric-poor"
                          }
                        >
                          {skill.matched ? <Check className="mr-1 h-3 w-3" /> : <X className="mr-1 h-3 w-3" />}
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
