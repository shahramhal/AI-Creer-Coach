'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/authContext';
import { skillGapService } from '../../services/skillGap.service';
import { settingsService } from '../../services/settings.service';
import dynamic from 'next/dynamic';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Switch } from '../../components/ui/switch';
import { GraduationCap, Loader2, Search, RefreshCw, Settings } from 'lucide-react';
import type {
  SkillGapAnalysis,
  LearningPathRecord,
  ProgressSummary,
} from '../../types/skillGap.types';

import SkillGapCard from '../../components/learning/SkillGapCard';
import LearningPathTimeline from '../../components/learning/LearningPathTimeline';
import CourseCard from '../../components/learning/CourseCard';
import ProgressTracker from '../../components/learning/ProgressTracker';

const SkillCoverageChart = dynamic(() => import('../../components/learning/SkillCoverageChart'), { ssr: false });

export default function LearningPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('analysis');
  const [settingsTargetRole, setSettingsTargetRole] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SkillGapAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  const [learningPaths, setLearningPaths] = useState<LearningPathRecord[]>([]);
  const [pathsLoading, setPathsLoading] = useState(false);
  const [expandedPathId, setExpandedPathId] = useState<string | null>(null);
  const [expandedPathDetails, setExpandedPathDetails] = useState<LearningPathRecord | null>(null);

  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [pathsError, setPathsError] = useState('');
  const [progressError, setProgressError] = useState('');
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  // Fetch target role from Settings on mount so the user cannot override it here
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchTargetRole = async () => {
      try {
        const preferences = await settingsService.getCareerPreferences();
        setSettingsTargetRole(preferences.targetRole ?? null);
      } catch {
        setSettingsTargetRole(null);
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchTargetRole();
  }, [authLoading, user]);

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push('/auth/login');
    return null;
  }

  const runAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      const response = await skillGapService.analyze(settingsTargetRole || undefined);
      setAnalysisResult(response.data);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to analyze skills. Make sure you have uploaded a CV.';
      setAnalysisError(message);
    } finally {
      setAnalysisLoading(false);
    }
  }, [settingsTargetRole]);

  const loadLearningPaths = useCallback(async () => {
    setPathsLoading(true);
    setPathsError('');
    try {
      const response = await skillGapService.getLearningPaths();
      setLearningPaths(response.data);
    } catch (error: any) {
      setPathsError(error.response?.data?.message || 'Failed to load learning paths.');
    } finally {
      setPathsLoading(false);
    }
  }, []);

  const loadPathDetails = useCallback(async (pathId: string) => {
    if (expandedPathId === pathId) {
      setExpandedPathId(null);
      setExpandedPathDetails(null);
      return;
    }
    setExpandedPathId(pathId);
    try {
      const response = await skillGapService.getLearningPathDetails(pathId);
      setExpandedPathDetails(response.data);
    } catch {
      setExpandedPathDetails(null);
    }
  }, [expandedPathId]);

  const loadProgressSummary = useCallback(async () => {
    setProgressLoading(true);
    setProgressError('');
    try {
      const response = await skillGapService.getProgressSummary();
      setProgressSummary(response.data);
    } catch (error: any) {
      setProgressError(error.response?.data?.message || 'Failed to load progress data.');
    } finally {
      setProgressLoading(false);
    }
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    if (value === 'paths') {
      loadLearningPaths();
    }
    if (value === 'progress') {
      loadProgressSummary();
    }
  }, [loadLearningPaths, loadProgressSummary]);

  const handleStartCourse = useCallback(async (courseId: string) => {
    try {
      await skillGapService.updateCourseProgress(courseId, 10, 'in_progress');
      if (expandedPathId) {
        const response = await skillGapService.getLearningPathDetails(expandedPathId);
        setExpandedPathDetails(response.data);
      }
    } catch {
      // silently handle
    }
  }, [expandedPathId]);

  const handleCompleteCourse = useCallback(async (courseId: string) => {
    try {
      await skillGapService.updateCourseProgress(courseId, 100, 'completed');
      if (expandedPathId) {
        const response = await skillGapService.getLearningPathDetails(expandedPathId);
        setExpandedPathDetails(response.data);
      }
    } catch {
      // silently handle
    }
  }, [expandedPathId]);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Learning Paths</h1>
            <p className="text-sm text-muted-foreground">
              Identify skill gaps and follow personalized learning paths
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">Skill Analysis</TabsTrigger>
            <TabsTrigger value="paths">Learning Paths</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          {/* Skill Analysis Tab */}
          <TabsContent value="analysis">
            <div className="space-y-6">
              {/* Controls */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Target Role
                      </label>
                      {/* Read-only display - the target role comes from Settings and can only be changed there */}
                      <div className="flex items-center gap-3 h-10 px-3 rounded-md border border-input bg-muted/30">
                        {settingsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : settingsTargetRole ? (
                          <>
                            <span className="text-sm font-medium text-foreground flex-1">
                              {settingsTargetRole}
                            </span>
                            <Link
                              href="/settings"
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
                            >
                              <Settings className="h-3 w-3" />
                              Change in Settings
                            </Link>
                          </>
                        ) : (
                          <Link
                            href="/settings"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            No target role set — configure in Settings →
                          </Link>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={runAnalysis}
                      disabled={analysisLoading || settingsLoading || !settingsTargetRole}
                    >
                      {analysisLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      {analysisLoading ? 'Analyzing...' : 'Analyze My Skills'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Error */}
              {analysisError && (
                <Card className="border-destructive">
                  <CardContent className="p-4 text-destructive text-sm">
                    {analysisError}
                  </CardContent>
                </Card>
              )}

              {/* Results */}
              {analysisResult && (
                <div className="space-y-6">
                  {/* Summary */}
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-foreground">{analysisResult.summary}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {analysisResult.target_role.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="secondary">
                          {analysisResult.total_estimated_hours}h total learning
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Coverage chart */}
                  <SkillCoverageChart
                    categoryBreakdown={analysisResult.category_breakdown}
                    skillCoverage={analysisResult.skill_coverage}
                    matchedCount={analysisResult.matched_count}
                    totalTargetSkills={analysisResult.total_target_skills}
                  />

                  {/* Missing skills */}
                  {analysisResult.missing_skills.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">
                        Missing Skills ({analysisResult.missing_skills.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {analysisResult.missing_skills.map((skill) => (
                          <SkillGapCard key={skill.name} skill={skill} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Learning path timeline */}
                  {analysisResult.recommended_learning_path.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">
                        Recommended Learning Path
                      </h3>
                      <LearningPathTimeline phases={analysisResult.recommended_learning_path} />
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {!analysisResult && !analysisLoading && !analysisError && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Discover Your Skill Gaps
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {settingsTargetRole
                        ? `Click "Analyze My Skills" to compare your CV against requirements for ${settingsTargetRole} and get a personalized learning path.`
                        : 'Set your target role in Settings first, then come back to analyze your skill gaps and get a personalized learning path.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Learning Paths Tab */}
          <TabsContent value="paths">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Your Learning Paths</h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch checked={showFreeOnly} onCheckedChange={setShowFreeOnly} />
                    Free courses only
                  </label>
                  <Button variant="outline" size="sm" onClick={loadLearningPaths} disabled={pathsLoading}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${pathsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              {pathsError && (
                <Card className="border-destructive">
                  <CardContent className="p-4 text-destructive text-sm">{pathsError}</CardContent>
                </Card>
              )}

              {pathsLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {!pathsLoading && learningPaths.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      No learning paths yet. Run a skill analysis to generate your paths.
                    </p>
                  </CardContent>
                </Card>
              )}

              {learningPaths.map((path) => (
                <Card key={path.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => loadPathDetails(path.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-foreground capitalize">{path.skill.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {path.skill.category.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant={path.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {path.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        {path.estimatedHours && (
                          <span className="text-xs text-muted-foreground">{path.estimatedHours}h</span>
                        )}
                        <span className="text-sm font-bold">{path.progressPercentage}%</span>
                      </div>
                    </div>
                    <Progress value={path.progressPercentage} className="h-2 mt-2" />

                    {/* Expanded courses */}
                    {expandedPathId === path.id && expandedPathDetails?.skill?.courses && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-foreground mb-3">Recommended Courses</h4>
                        {(() => {
                          const filteredCourses = expandedPathDetails.skill.courses.filter(
                            (course) => !showFreeOnly || course.price === 0
                          );
                          return (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {filteredCourses.map((course) => (
                                  <CourseCard
                                    key={course.id}
                                    course={course}
                                    userCourse={course.userCourses?.[0]}
                                    onStart={handleStartCourse}
                                    onComplete={handleCompleteCourse}
                                  />
                                ))}
                              </div>
                              {filteredCourses.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  {showFreeOnly
                                    ? 'No free courses available for this skill. Try disabling the free filter.'
                                    : 'No courses available for this skill yet.'}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress">
            {progressError && (
              <Card className="border-destructive mb-4">
                <CardContent className="p-4 text-destructive text-sm">{progressError}</CardContent>
              </Card>
            )}

            {progressLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {!progressLoading && progressSummary && (
              <ProgressTracker summary={progressSummary} />
            )}

            {!progressLoading && !progressSummary && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No progress data yet. Start learning to track your progress.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
