// apps/frontend/components/profile/ProfileForm.tsx

'use client';
import { Profile } from '../../types/profile';
import api from '../../library/api';
import { extractErrorMessage } from '../../utils/error.util';

import { useState, ChangeEvent, FormEvent } from 'react';

interface ProfileFormProps {
  profile: Profile | null;
  onUpdate: () => void;
}

interface ProfileFormData {
  phoneNumber: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  bio: string;
}

export default function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    phoneNumber: profile?.phoneNumber || '',
    location: profile?.location || '',
    linkedinUrl: profile?.linkedinUrl || '',
    githubUrl: profile?.githubUrl || '',
    portfolioUrl: profile?.portfolioUrl || '',
    bio: profile?.bio || ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await api.put('/api/profile', formData);
      setMessage('Profile updated successfully!');
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error, 'Error updating profile');
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-card">
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
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="+1 234 567 8900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="San Francisco, CA"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">LinkedIn URL</label>
          <input
            type="url"
            name="linkedinUrl"
            value={formData.linkedinUrl}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="https://linkedin.com/in/yourprofile"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">GitHub URL</label>
          <input
            type="url"
            name="githubUrl"
            value={formData.githubUrl}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="https://github.com/yourusername"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Portfolio URL</label>
          <input
            type="url"
            name="portfolioUrl"
            value={formData.portfolioUrl}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="https://yourportfolio.com"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Bio</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="Tell us about yourself..."
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}
