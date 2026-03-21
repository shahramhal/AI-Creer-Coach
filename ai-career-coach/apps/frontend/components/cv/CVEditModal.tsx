'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CV, ParsedCVData } from '../../types/cv.types';
import { cvService } from '../../services/cv.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const experienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  responsibilities: z.string(),
});

const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  endDate: z.string().optional(),
});

const cvEditSchema = z.object({
  personal: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
  }),
  summary: z.string().optional(),
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  skills: z.string(),
});

type CVEditFormData = z.infer<typeof cvEditSchema>;

interface CVEditModalProps {
  cv: CV;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCV: CV) => void;
}

function parsedDataToFormValues(parsedData: ParsedCVData): CVEditFormData {
  return {
    personal: {
      name: parsedData.personal?.name || '',
      email: parsedData.personal?.email || '',
      phone: parsedData.personal?.phone || '',
      location: parsedData.personal?.location || '',
      linkedin: parsedData.personal?.linkedin || '',
      github: parsedData.personal?.github || '',
    },
    summary: parsedData.summary || '',
    experience: (parsedData.experience || []).map((experienceItem) => ({
      company: experienceItem.company || '',
      title: experienceItem.title || '',
      startDate: experienceItem.startDate || '',
      endDate: experienceItem.endDate || '',
      responsibilities: experienceItem.responsibilities?.join('\n') || '',
    })),
    education: (parsedData.education || []).map((educationItem) => ({
      institution: educationItem.institution || '',
      degree: educationItem.degree || '',
      field: educationItem.field || '',
      endDate: educationItem.endDate || '',
    })),
    skills: (parsedData.skills || []).join(', '),
  };
}

function formValuesToPayload(formValues: CVEditFormData): ParsedCVData {
  return {
    personal: formValues.personal,
    summary: formValues.summary,
    experience: formValues.experience.map((experienceItem) => ({
      ...experienceItem,
      responsibilities: experienceItem.responsibilities
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    })),
    education: formValues.education,
    skills: formValues.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0),
  };
}

export default function CVEditModal({ cv, isOpen, onClose, onSave }: CVEditModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultParsedData: ParsedCVData = cv.parsedData || {
    personal: {},
    experience: [],
    education: [],
    skills: [],
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = useForm<CVEditFormData>({
    resolver: zodResolver(cvEditSchema),
    defaultValues: parsedDataToFormValues(defaultParsedData),
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
  } = useFieldArray({ control, name: 'experience' });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({ control, name: 'education' });

  const onSubmit = async (formValues: CVEditFormData) => {
    setServerError(null);
    try {
      const parsedPayload = formValuesToPayload(formValues);
      const response = await cvService.updateCV(cv.id, { parsedData: parsedPayload });
      onSave(response.data);
      onClose();
    } catch (submitError) {
      const errorMessage = submitError instanceof Error ? submitError.message : 'Failed to save changes';
      setServerError(errorMessage);
    }
  };

  const handleCancel = () => {
    reset(parsedDataToFormValues(defaultParsedData));
    setServerError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" hideCloseButton>
        <DialogHeader>
          <DialogTitle>Edit CV</DialogTitle>
          <DialogDescription>{cv.filename}</DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1 py-4 space-y-8">
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="cv-personal-name">Full Name</Label>
                  <Input id="cv-personal-name" {...register('personal.name')} placeholder="John Doe" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cv-personal-email">Email</Label>
                  <Input id="cv-personal-email" {...register('personal.email')} placeholder="john.doe@example.com" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cv-personal-phone">Phone</Label>
                  <Input id="cv-personal-phone" {...register('personal.phone')} placeholder="+44 7XXX XXXXXX" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cv-personal-location">Location</Label>
                  <Input id="cv-personal-location" {...register('personal.location')} placeholder="London, UK" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cv-personal-linkedin">LinkedIn</Label>
                  <Input id="cv-personal-linkedin" {...register('personal.linkedin')} placeholder="linkedin.com/in/johndoe" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cv-personal-github">GitHub</Label>
                  <Input id="cv-personal-github" {...register('personal.github')} placeholder="github.com/johndoe" />
                </div>
              </div>
            </section>

            <section>
              <Label htmlFor="cv-summary" className="text-lg font-semibold text-foreground mb-4 block">Professional Summary</Label>
              <textarea
                id="cv-summary"
                {...register('summary')}
                rows={4}
                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="Brief professional summary..."
              />
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Experience</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => appendExperience({ company: '', title: '', startDate: '', endDate: '', responsibilities: '' })}
                >
                  + Add Experience
                </Button>
              </div>
              <div className="space-y-6">
                {experienceFields.map((field, index) => (
                  <div key={field.id} className="p-4 border border-border rounded-lg space-y-3 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Job Title</Label>
                        <Input {...register(`experience.${index}.title`)} placeholder="Software Engineer" />
                      </div>
                      <div className="space-y-1">
                        <Label>Company</Label>
                        <Input {...register(`experience.${index}.company`)} placeholder="Tech Corp" />
                      </div>
                      <div className="space-y-1">
                        <Label>Start Date</Label>
                        <Input {...register(`experience.${index}.startDate`)} placeholder="2020-01" />
                      </div>
                      <div className="space-y-1">
                        <Label>End Date</Label>
                        <Input {...register(`experience.${index}.endDate`)} placeholder="2023-12 or Present" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Responsibilities (one per line)</Label>
                      <textarea
                        {...register(`experience.${index}.responsibilities`)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary transition-colors"
                        placeholder={"Led development of X\nImplemented Y\nImproved Z by 50%"}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExperience(index)}
                      className="text-sm text-destructive hover:text-destructive/80 transition-colors"
                    >
                      Remove Experience
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Education</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => appendEducation({ institution: '', degree: '', field: '', endDate: '' })}
                >
                  + Add Education
                </Button>
              </div>
              <div className="space-y-4">
                {educationFields.map((field, index) => (
                  <div key={field.id} className="p-4 border border-border rounded-lg space-y-3 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Institution</Label>
                        <Input {...register(`education.${index}.institution`)} placeholder="University of Westminster" />
                      </div>
                      <div className="space-y-1">
                        <Label>Degree</Label>
                        <Input {...register(`education.${index}.degree`)} placeholder="BSc Computer Science" />
                      </div>
                      <div className="space-y-1">
                        <Label>Field of Study</Label>
                        <Input {...register(`education.${index}.field`)} placeholder="Computer Science" />
                      </div>
                      <div className="space-y-1">
                        <Label>Graduation Year</Label>
                        <Input {...register(`education.${index}.endDate`)} placeholder="2025" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="text-sm text-destructive hover:text-destructive/80 transition-colors"
                    >
                      Remove Education
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <Label htmlFor="cv-skills" className="text-lg font-semibold text-foreground mb-4 block">Skills</Label>
              <textarea
                id="cv-skills"
                {...register('skills')}
                rows={3}
                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary transition-colors"
                placeholder="JavaScript, React, Node.js, Python, Docker"
              />
              <p className="mt-2 text-sm text-muted-foreground">Separate skills with commas</p>
            </section>
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
