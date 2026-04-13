import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CourseCard from './CourseCard';
import type { CourseRecord, UserCourseRecord } from '../../types/skillGap.types';

function buildSampleCourse(overrides: Partial<CourseRecord> = {}): CourseRecord {
  return {
    id: 'course-uuid-001',
    skillId: 'skill-uuid-abc',
    title: 'Introduction to React',
    platform: 'Udemy',
    url: 'https://udemy.com/react-intro',
    price: 15,
    duration: 10,
    rating: 4.7,
    numStudents: 5000,
    difficulty: 'beginner',
    ...overrides,
  };
}

function buildUserCourse(overrides: Partial<UserCourseRecord> = {}): UserCourseRecord {
  return {
    id: 'uc-uuid-001',
    userId: 'user-uuid-xyz',
    courseId: 'course-uuid-001',
    status: 'not_started',
    progress: 0,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe('CourseCard - rendering', () => {
  it('should display the course title', () => {
    render(<CourseCard course={buildSampleCourse()} />);
    expect(screen.getByText('Introduction to React')).toBeInTheDocument();
  });

  it('should display the platform badge', () => {
    render(<CourseCard course={buildSampleCourse({ platform: 'Coursera' })} />);
    expect(screen.getByText('Coursera')).toBeInTheDocument();
  });

  it('should display the difficulty badge', () => {
    render(<CourseCard course={buildSampleCourse({ difficulty: 'intermediate' })} />);
    expect(screen.getByText('intermediate')).toBeInTheDocument();
  });

  it('should display "Free" when the price is 0', () => {
    render(<CourseCard course={buildSampleCourse({ price: 0 })} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('should display the price with a dollar sign when the course is paid', () => {
    render(<CourseCard course={buildSampleCourse({ price: 29 })} />);
    expect(screen.getByText('$29')).toBeInTheDocument();
  });

  it('should not display a price badge when price is null', () => {
    render(<CourseCard course={buildSampleCourse({ price: null })} />);
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Free')).not.toBeInTheDocument();
  });

  it('should display the course duration in hours', () => {
    render(<CourseCard course={buildSampleCourse({ duration: 12 })} />);
    expect(screen.getByText(/12h/)).toBeInTheDocument();
  });

  it('should display the course rating', () => {
    render(<CourseCard course={buildSampleCourse({ rating: 4.7 })} />);
    expect(screen.getByText('4.7')).toBeInTheDocument();
  });

  it('should render an external link to the course URL', () => {
    render(<CourseCard course={buildSampleCourse({ url: 'https://udemy.com/react-intro' })} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://udemy.com/react-intro');
    expect(link).toHaveAttribute('target', '_blank');
  });
});

describe('CourseCard - status states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show the "Start" button when course has not been started', () => {
    const handleStart = vi.fn();
    const userCourse = buildUserCourse({ status: 'not_started' });
    render(<CourseCard course={buildSampleCourse()} userCourse={userCourse} onStart={handleStart} />);
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('should not show "Start" button if onStart handler is not provided', () => {
    const userCourse = buildUserCourse({ status: 'not_started' });
    render(<CourseCard course={buildSampleCourse()} userCourse={userCourse} />);
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
  });

  it('should call onStart with the course id when "Start" is clicked', async () => {
    const handleStart = vi.fn();
    const userCourse = buildUserCourse({ status: 'not_started' });
    render(
      <CourseCard course={buildSampleCourse()} userCourse={userCourse} onStart={handleStart} />
    );
    await userEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(handleStart).toHaveBeenCalledWith('course-uuid-001');
  });

  it('should show the "Complete" button when the course is in progress', () => {
    const handleComplete = vi.fn();
    const userCourse = buildUserCourse({ status: 'in_progress', progress: 50 });
    render(
      <CourseCard course={buildSampleCourse()} userCourse={userCourse} onComplete={handleComplete} />
    );
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
  });

  it('should display the progress percentage when a course is in progress', () => {
    const userCourse = buildUserCourse({ status: 'in_progress', progress: 65 });
    render(<CourseCard course={buildSampleCourse()} userCourse={userCourse} />);
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('should show the "Completed" badge when the course is finished', () => {
    const userCourse = buildUserCourse({ status: 'completed', progress: 100 });
    render(<CourseCard course={buildSampleCourse()} userCourse={userCourse} />);
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it('should not show progress bar when the course has not been started', () => {
    const userCourse = buildUserCourse({ status: 'not_started' });
    render(<CourseCard course={buildSampleCourse()} userCourse={userCourse} />);
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
  });
});
