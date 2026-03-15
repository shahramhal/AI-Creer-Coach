'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import type { MatchFilters } from '@/types/matching.types';

interface JobFiltersProps {
  filters: MatchFilters;
  onChange: (filters: MatchFilters) => void;
  onApply: () => void;
  isLoading?: boolean;
  minScore: number;
  onMinScoreChange: (score: number) => void;
}

const COUNTRY_OPTIONS = [
  { value: '', label: 'All Countries' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'au', label: 'Australia' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'in', label: 'India' },
  { value: 'sg', label: 'Singapore' },
  { value: 'at', label: 'Austria' },
  { value: 'be', label: 'Belgium' },
  { value: 'br', label: 'Brazil' },
  { value: 'it', label: 'Italy' },
  { value: 'pl', label: 'Poland' },
  { value: 'za', label: 'South Africa' },
];

const JOB_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Temporary', label: 'Temporary' },
];

const EXPERIENCE_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: 'Junior', label: 'Junior' },
  { value: 'Mid', label: 'Mid' },
  { value: 'Senior', label: 'Senior' },
];

const REMOTE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Remote', label: 'Remote' },
  { value: 'On-site', label: 'On-site' },
  { value: 'Hybrid', label: 'Hybrid' },
];

const EMPTY_FILTERS: MatchFilters = {};

export function JobFilters({ filters, onChange, onApply, isLoading, minScore, onMinScoreChange }: JobFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== '' && value !== null,
  ) || minScore > 0;

  const handleReset = () => {
    onChange(EMPTY_FILTERS);
    onMinScoreChange(0);
  };

  const updateFilter = <K extends keyof MatchFilters>(key: K, value: MatchFilters[K]) => {
    const updatedFilters = { ...filters };
    if (value === '' || value === undefined || value === null) {
      delete updatedFilters[key];
    } else {
      updatedFilters[key] = value;
    }
    onChange(updatedFilters);
  };

  return (
    <Card className="border-border">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            Filters
            {hasActiveFilters && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {Object.values(filters).filter((v) => v !== undefined && v !== '' && v !== null).length}
              </span>
            )}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Filter Fields */}
      {isExpanded && (
        <CardContent className="border-t px-5 pb-5 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Country */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-country" className="text-xs">Country</Label>
              <Select
                value={filters.country ?? ''}
                onValueChange={(value) => updateFilter('country', value === '_all' ? '' : value)}
              >
                <SelectTrigger id="filter-country">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value || '_all'}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-city" className="text-xs">City</Label>
              <Input
                id="filter-city"
                placeholder="e.g. London, Manchester"
                value={filters.city ?? ''}
                onChange={(e) => updateFilter('city', e.target.value)}
              />
            </div>

            {/* Title Keywords */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-title" className="text-xs">Title Keywords</Label>
              <Input
                id="filter-title"
                placeholder="e.g. Software Engineer"
                value={filters.title_keywords ?? ''}
                onChange={(e) => updateFilter('title_keywords', e.target.value)}
              />
            </div>

            {/* Job Type */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-job-type" className="text-xs">Job Type</Label>
              <Select
                value={filters.job_type ?? ''}
                onValueChange={(value) => updateFilter('job_type', value === '_all' ? '' : value)}
              >
                <SelectTrigger id="filter-job-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value || '_all'}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Experience Level */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-experience" className="text-xs">Experience Level</Label>
              <Select
                value={filters.experience_level ?? ''}
                onValueChange={(value) => updateFilter('experience_level', value === '_all' ? '' : value)}
              >
                <SelectTrigger id="filter-experience">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value || '_all'}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Remote Type */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-remote" className="text-xs">Work Type</Label>
              <Select
                value={filters.remote_type ?? ''}
                onValueChange={(value) => updateFilter('remote_type', value === '_all' ? '' : value)}
              >
                <SelectTrigger id="filter-remote">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {REMOTE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value || '_all'}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min Salary */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-salary" className="text-xs">Min Salary</Label>
              <Input
                id="filter-salary"
                type="number"
                placeholder="e.g. 30000"
                value={filters.min_salary ?? ''}
                onChange={(e) => {
                  const parsedValue = e.target.value ? Number(e.target.value) : undefined;
                  updateFilter('min_salary', parsedValue);
                }}
              />
            </div>

            {/* Min Match Score */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-score" className="text-xs">
                Min Match Score: {minScore}%
              </Label>
              <input
                id="filter-score"
                type="range"
                min={0}
                max={100}
                step={5}
                value={minScore}
                onChange={(e) => onMinScoreChange(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={onApply} disabled={isLoading} size="sm">
              Apply Filters
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-muted-foreground"
              >
                <RotateCcw className="mr-1.5 h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
