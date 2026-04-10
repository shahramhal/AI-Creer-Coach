'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import type { MatchFilters } from '@/types/matching.types';
import {
  JOB_TYPE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  WORK_ARRANGEMENT_OPTIONS,
} from '@/constants/options';

interface CountryOption {
  value: string;
  label: string;
}

interface JobFiltersProps {
  filters: MatchFilters;
  onChange: (filters: MatchFilters) => void;
  onApply: () => void;
  isLoading?: boolean;
  minScore: number;
  onMinScoreChange: (score: number) => void;
  countries: CountryOption[];
}

const EMPTY_FILTERS: MatchFilters = {};

export function JobFilters({ filters, onChange, onApply, isLoading, minScore, onMinScoreChange, countries }: JobFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = Object.values(filters).filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  const totalActiveCount = activeFilterCount + (minScore > 0 ? 1 : 0);
  const hasActiveFilters = totalActiveCount > 0;

  const handleReset = () => {
    onChange(EMPTY_FILTERS);
    onMinScoreChange(0);
  };

  const updateFilter = <K extends keyof MatchFilters>(key: K, value: MatchFilters[K]) => {
    const updatedFilters = { ...filters };
    if (value === '' || value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      delete updatedFilters[key];
    } else {
      updatedFilters[key] = value;
    }
    onChange(updatedFilters);
  };

  const toggleArrayFilter = (key: 'remote_type' | 'job_type', item: string) => {
    const currentValue = filters[key];
    const currentArray = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [];
    const updatedArray = currentArray.includes(item)
      ? currentArray.filter((existingItem) => existingItem !== item)
      : [...currentArray, item];
    updateFilter(key, updatedArray.length > 0 ? updatedArray : undefined);
  };

  const isArrayFilterChecked = (key: 'remote_type' | 'job_type', item: string): boolean => {
    const currentValue = filters[key];
    if (Array.isArray(currentValue)) return currentValue.includes(item);
    return currentValue === item;
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
                {totalActiveCount}
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
                disabled={countries.length === 0}
              >
                <SelectTrigger id="filter-country">
                  <SelectValue placeholder={countries.length === 0 ? 'Loading...' : 'All Countries'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Countries</SelectItem>
                  {countries.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
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

            {/* Job Type (multi-select checkboxes) */}
            <div className="space-y-1.5">
              <Label className="text-xs">Job Type</Label>
              <div className="flex flex-wrap gap-3 pt-1">
                {JOB_TYPE_OPTIONS.map((jobType) => (
                  <label key={jobType} htmlFor={`filter-job-type-${jobType}`} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      id={`filter-job-type-${jobType}`}
                      checked={isArrayFilterChecked('job_type', jobType)}
                      onCheckedChange={() => toggleArrayFilter('job_type', jobType)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs text-foreground">{jobType}</span>
                  </label>
                ))}
              </div>
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
                  <SelectItem value="_all">All Levels</SelectItem>
                  {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Work Type (multi-select checkboxes) */}
            <div className="space-y-1.5">
              <Label className="text-xs">Work Type</Label>
              <div className="flex flex-wrap gap-3 pt-1">
                {WORK_ARRANGEMENT_OPTIONS.map((arrangement) => (
                  <label key={arrangement} htmlFor={`filter-work-type-${arrangement}`} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      id={`filter-work-type-${arrangement}`}
                      checked={isArrayFilterChecked('remote_type', arrangement)}
                      onCheckedChange={() => toggleArrayFilter('remote_type', arrangement)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs text-foreground">{arrangement}</span>
                  </label>
                ))}
              </div>
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
