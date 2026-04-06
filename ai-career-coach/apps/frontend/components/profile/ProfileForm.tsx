'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Profile } from '../../types/profile';
import api from '../../library/api';
import { extractErrorMessage } from '../../utils/error.util';

const profileSchema = z.object({
  phoneNumber: z.string(),
  location: z.string(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').or(z.literal('')),
  githubUrl: z.string().url('Invalid GitHub URL').or(z.literal('')),
  portfolioUrl: z.string().url('Invalid portfolio URL').or(z.literal('')),
  bio: z.string().max(500, 'Bio must be under 500 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  profile: Profile | null;
  onUpdate: () => void;
}

export default function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const [message, setMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phoneNumber: profile?.phoneNumber || '',
      location: profile?.location || '',
      linkedinUrl: profile?.linkedinUrl || '',
      githubUrl: profile?.githubUrl || '',
      portfolioUrl: profile?.portfolioUrl || '',
      bio: profile?.bio || '',
    },
  });

  const onSubmit = async (formData: ProfileFormData) => {
    setMessage('');
    try {
      await api.put('/api/v1/profile', formData);
      setMessage('Profile updated successfully!');
      onUpdate();
    } catch (error: unknown) {
      setMessage(extractErrorMessage(error, 'Error updating profile'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-card">
      {message && (
        <div className={`p-4 rounded-lg border ${message.includes('success') ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Phone Number</label>
          <input
            type="tel"
            {...register('phoneNumber')}
            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="+1 234 567 8900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Location</label>
          <input
            type="text"
            {...register('location')}
            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="San Francisco, CA"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">LinkedIn URL</label>
          <input
            type="url"
            {...register('linkedinUrl')}
            className={`w-full px-4 py-2 bg-muted/50 border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${errors.linkedinUrl ? 'border-destructive' : 'border-border'}`}
            placeholder="https://linkedin.com/in/yourprofile"
          />
          {errors.linkedinUrl && (
            <p className="mt-1 text-sm text-destructive">{errors.linkedinUrl.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">GitHub URL</label>
          <input
            type="url"
            {...register('githubUrl')}
            className={`w-full px-4 py-2 bg-muted/50 border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${errors.githubUrl ? 'border-destructive' : 'border-border'}`}
            placeholder="https://github.com/yourusername"
          />
          {errors.githubUrl && (
            <p className="mt-1 text-sm text-destructive">{errors.githubUrl.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Portfolio URL</label>
          <input
            type="url"
            {...register('portfolioUrl')}
            className={`w-full px-4 py-2 bg-muted/50 border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${errors.portfolioUrl ? 'border-destructive' : 'border-border'}`}
            placeholder="https://yourportfolio.com"
          />
          {errors.portfolioUrl && (
            <p className="mt-1 text-sm text-destructive">{errors.portfolioUrl.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Bio</label>
          <textarea
            {...register('bio')}
            rows={4}
            className={`w-full px-4 py-3 bg-muted/50 border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${errors.bio ? 'border-destructive' : 'border-border'}`}
            placeholder="Tell us about yourself..."
          />
          {errors.bio && (
            <p className="mt-1 text-sm text-destructive">{errors.bio.message}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}
