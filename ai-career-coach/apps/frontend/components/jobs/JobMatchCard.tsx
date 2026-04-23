import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Briefcase,
  Loader2,
} from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import axios from 'axios';
import { applicationService } from '@/services/application.service';
import { queryKeys } from '@/hooks/queries';
import type { MatchedJob } from '@/types/matching.types';

interface JobMatchCardProps {
  job: MatchedJob;
  alreadyApplied?: boolean;
}

function DescriptionBlock({ description }: { description?: string }) {
  const [expanded, setExpanded] = useState(false);
  const text = description ?? '';
  const isLong = text.length > 200;
  return (
    <>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {expanded ? text : text.slice(0, 200)}
        {!expanded && isLong && '...'}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-primary hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
}

export function JobMatchCard({ job, alreadyApplied = false }: JobMatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isApplied, setIsApplied] = useState(alreadyApplied);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleApplyClick = () => {
    if (/^https?:\/\//i.test(job.source_url)) {
      window.open(job.source_url, '_blank', 'noopener,noreferrer');
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmApplication = async () => {
    setIsSubmitting(true);
    try {
      await applicationService.createApplication({
        company: job.company,
        jobTitle: job.title,
        sourceUrl: job.source_url,
        location: job.location,
      });
      setIsApplied(true);
      queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.applicationStats });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setIsApplied(true);
      }
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-metric-excellent";
    if (score >= 60) return "text-metric-good";
    if (score >= 30) return "text-metric-average";
    return "text-metric-poor";
  };

  const getProgressColor = (_score: number) => "";

  const breakdown = job.match_breakdown;

  return (
    <Card className="group transition-all hover:shadow-md border-border">
      <CardHeader className="p-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start">

          {/* Left: Job Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between md:justify-start gap-3">
              <h3 className="font-semibold text-lg text-foreground line-clamp-2">
                {job.title}
              </h3>
              {/* Mobile Score View */}
              <div className="md:hidden flex items-center gap-1.5">
                <span className={`font-bold ${getScoreColor(job.match_score)}`}>
                  {Math.round(job.match_score)}%
                </span>
                {job.match_label && (
                  <span className={`text-xs ${getScoreColor(job.match_score)}`}>
                    {job.match_label}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {job.company}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
              {job.salary_min && (
                <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                  <Briefcase className="h-4 w-4" />
                  £{job.salary_min.toLocaleString()}
                  {job.salary_max ? ` - £${job.salary_max.toLocaleString()}` : '+'}
                </span>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Badge variant="outline" className="text-xs uppercase tracking-wider opacity-70">
                {job.source}
              </Badge>
              {job.posted_date && (
                <span className="flex items-center text-xs text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  {new Date(job.posted_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Right: Match Score (Desktop) */}
          <div className="hidden md:flex flex-col items-end min-w-[120px]">
            <div className="text-right mb-2">
              <span className="text-sm text-muted-foreground block">Match Score</span>
              <span className={`text-3xl font-bold ${getScoreColor(job.match_score)}`}>
                {Math.round(job.match_score)}%
              </span>
              {job.match_label && (
                <span className={`text-xs font-medium block mt-0.5 ${getScoreColor(job.match_score)}`}>
                  {job.match_label}
                </span>
              )}
            </div>
            <Progress
              value={job.match_score}
              className={`h-2 w-full ${getProgressColor(job.match_score)}`}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-0">
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Primary Actions */}
          {isApplied ? (
            <Button variant="outline" size="sm" className="gap-2 text-green-600 border-green-200 dark:text-green-400 dark:border-green-800" disabled>
              <CheckCircle2 className="h-3 w-3" /> Applied
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleApplyClick}
              className="gap-2"
            >
              Apply Now <ExternalLink className="h-3 w-3" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2"
          >
            {isExpanded ? 'Hide Analysis' : 'Why this matches?'}
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Expanded Analysis Section */}
        {isExpanded && (
          <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <Separator className="mb-4" />

            {/* Summary Sentence */}
            {breakdown.summary && (
              <p className="text-sm text-muted-foreground italic mb-5 leading-relaxed">
                {breakdown.summary}
              </p>
            )}

            {/* Score Breakdown Bars */}
            <div className="space-y-3 mb-6">
              <ScoreBar
                label="Overall Match"
                value={job.match_score}
                colorClass={getProgressColor(job.match_score)}
              />
              <ScoreBar
                label="Skill Coverage"
                value={breakdown.skill_coverage}
                colorClass={getProgressColor(breakdown.skill_coverage)}
              />
              {breakdown.title_relevance !== undefined && (
                <ScoreBar
                  label="Title Relevance"
                  value={breakdown.title_relevance}
                  colorClass={getProgressColor(breakdown.title_relevance)}
                />
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Matched Skills */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Matched Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {breakdown.matched_skills.length > 0 ? (
                    breakdown.matched_skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-transparent"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No direct skill matches found</span>
                  )}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <XCircle className="h-4 w-4" />
                  Skills to Develop
                </h4>
                <div className="flex flex-wrap gap-2">
                  {breakdown.missing_skills.length > 0 ? (
                    breakdown.missing_skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Great match! No major missing skills.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50">
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <DescriptionBlock description={job.description} />
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Did you apply for this job?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{job.title}</span> at{' '}
              <span className="font-medium text-foreground">{job.company}</span>
              <br />
              <span className="mt-2 block">
                If you submitted your application, we&apos;ll track it for you.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>No, not yet</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApplication} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Yes, I applied"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Small labelled progress bar used in the breakdown section. */
function ScoreBar({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  const roundedValue = Math.round(value);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <Progress value={roundedValue} className={`h-2 flex-1 ${colorClass}`} />
      <span className="text-xs font-medium w-10 text-right">{roundedValue}%</span>
    </div>
  );
}
