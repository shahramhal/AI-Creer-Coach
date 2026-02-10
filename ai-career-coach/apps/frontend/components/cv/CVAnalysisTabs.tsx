'use client';

import type { AnalysisData } from '../../types/cv.types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';
import OverviewTab from './OverviewTab';
import ATSTab from './ATSTab';
import KeywordsTab from './KeywordsTab';
import RecommendationsTab from './RecommendationsTab';

interface CVAnalysisTabsProps {
  analysisData: AnalysisData | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export default function CVAnalysisTabs({
  analysisData,
  isAnalyzing,
  onAnalyze,
}: CVAnalysisTabsProps) {
  // No analysis yet — show CTA
  if (!analysisData) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">Analyze Your CV</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Get AI-powered insights on ATS compatibility, keyword optimization, and personalized recommendations to improve your CV.
        </p>
        <Button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="mt-6 gap-2"
        >
          {isAnalyzing ? (
            <>
              <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analyze CV
            </>
          )}
        </Button>
      </div>
    );
  }

  // Show analysis tabs
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-1 rounded-lg">
        <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-4">
          Overview
        </TabsTrigger>
        <TabsTrigger value="ats" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-4">
          ATS Compatibility
        </TabsTrigger>
        <TabsTrigger value="keywords" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-4">
          Keywords
        </TabsTrigger>
        <TabsTrigger value="recommendations" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-4">
          Recommendations
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <OverviewTab data={analysisData} />
      </TabsContent>

      <TabsContent value="ats" className="mt-4">
        <ATSTab checks={analysisData.atsAnalysis} />
      </TabsContent>

      <TabsContent value="keywords" className="mt-4">
        <KeywordsTab keywords={analysisData.missingKeywords} />
      </TabsContent>

      <TabsContent value="recommendations" className="mt-4">
        <RecommendationsTab recommendations={analysisData.recommendations} />
      </TabsContent>
    </Tabs>
  );
}
