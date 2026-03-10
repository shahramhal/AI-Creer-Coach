'use client';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import type { CourseRecord, UserCourseRecord } from '../../types/skillGap.types';
import { ExternalLink, Clock, Star, Play, CheckCircle } from 'lucide-react';

interface CourseCardProps {
  course: CourseRecord;
  userCourse?: UserCourseRecord;
  onStart?: (courseId: string) => void;
  onComplete?: (courseId: string) => void;
}

const difficultyStyles: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function CourseCard({ course, userCourse, onStart, onComplete }: CourseCardProps) {
  const progress = userCourse?.progress ?? 0;
  const status = userCourse?.status ?? 'not_started';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-foreground text-sm leading-tight flex-1 mr-2">{course.title}</h4>
          <a
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="secondary" className="text-xs">{course.platform}</Badge>
          {course.difficulty && (
            <Badge className={`text-xs ${difficultyStyles[course.difficulty] || ''}`}>
              {course.difficulty}
            </Badge>
          )}
          {course.price !== null && (
            <Badge variant="outline" className="text-xs">
              {course.price === 0 ? 'Free' : `$${course.price}`}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {course.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {course.duration}h
            </span>
          )}
          {course.rating && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {Number(course.rating).toFixed(1)}
            </span>
          )}
        </div>

        {status !== 'not_started' && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="flex gap-2">
          {status === 'not_started' && onStart && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => onStart(course.id)}>
              <Play className="h-3 w-3 mr-1" />
              Start
            </Button>
          )}
          {status === 'in_progress' && onComplete && (
            <Button size="sm" className="w-full" onClick={() => onComplete(course.id)}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Button>
          )}
          {status === 'completed' && (
            <Badge className="bg-green-500/20 text-green-400 w-full justify-center py-1">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
