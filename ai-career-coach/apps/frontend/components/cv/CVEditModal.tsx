// apps/frontend/components/cv/CVEditModal.tsx

'use client';

import { useState } from 'react';
import type { CV, ParsedCVData, Experience, Education } from '../../types/cv.types';
import { cvService } from '../../services/cv.service';

interface CVEditModalProps {
  cv: CV;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCV: CV) => void;
}

/**
 * CVEditModal - Modal for editing parsed CV data
 * Allows editing of personal info, experience, education, and skills
 */
export default function CVEditModal({ cv, isOpen, onClose, onSave }: CVEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local state for edited data
  const [editedData, setEditedData] = useState<ParsedCVData>(
    cv.parsedData || {
      personal: {},
      experience: [],
      education: [],
      skills: [],
    }
  );

  // Don't render if modal is closed
  if (!isOpen) return null;

  /**
   * Save edited CV data to backend
   */
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await cvService.updateCV(cv.id, {
        parsedData: editedData,
      });
      
      onSave(response.data);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Cancel editing and reset data
   */
  const handleCancel = () => {
    setEditedData(cv.parsedData || {
      personal: {},
      experience: [],
      education: [],
      skills: [],
    });
    setError(null);
    onClose();
  };

  /**
   * Update personal information field
   */
  const updatePersonal = (field: string, value: string) => {
    setEditedData({
      ...editedData,
      personal: {
        ...editedData.personal,
        [field]: value,
      },
    });
  };

  /**
   * Update experience entry
   */
  const updateExperience = (index: number, field: keyof Experience, value: any) => {
    const updatedExperience = [...editedData.experience];
    updatedExperience[index] = {
      ...updatedExperience[index],
      [field]: value,
    };
    setEditedData({ ...editedData, experience: updatedExperience });
  };

  /**
   * Add new experience entry
   */
  const addExperience = () => {
    setEditedData({
      ...editedData,
      experience: [
        ...editedData.experience,
        {
          company: '',
          title: '',
          startDate: '',
          endDate: '',
          responsibilities: [],
        },
      ],
    });
  };

  /**
   * Remove experience entry
   */
  const removeExperience = (index: number) => {
    setEditedData({
      ...editedData,
      experience: editedData.experience.filter((_, i) => i !== index),
    });
  };

  /**
   * Update education entry
   */
  const updateEducation = (index: number, field: keyof Education, value: any) => {
    const updatedEducation = [...editedData.education];
    updatedEducation[index] = {
      ...updatedEducation[index],
      [field]: value,
    };
    setEditedData({ ...editedData, education: updatedEducation });
  };

  /**
   * Add new education entry
   */
  const addEducation = () => {
    setEditedData({
      ...editedData,
      education: [
        ...editedData.education,
        {
          institution: '',
          degree: '',
          field: '',
        },
      ],
    });
  };

  /**
   * Remove education entry
   */
  const removeEducation = (index: number) => {
    setEditedData({
      ...editedData,
      education: editedData.education.filter((_, i) => i !== index),
    });
  };

  /**
   * Update skills list from comma-separated string
   */
  const updateSkills = (skillsString: string) => {
    const skills = skillsString
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    setEditedData({ ...editedData, skills });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Modal Header - Fixed */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit CV</h2>
              <p className="text-sm text-gray-500">{cv.filename}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-8">
              
              {/* Personal Information Section */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Full Name"
                    value={editedData.personal?.name || ''}
                    onChange={(v) => updatePersonal('name', v)}
                    placeholder="John Doe"
                  />
                  <InputField
                    label="Email"
                    value={editedData.personal?.email || ''}
                    onChange={(v) => updatePersonal('email', v)}
                    placeholder="john.doe@example.com"
                  />
                  <InputField
                    label="Phone"
                    value={editedData.personal?.phone || ''}
                    onChange={(v) => updatePersonal('phone', v)}
                    placeholder="+44 7XXX XXXXXX"
                  />
                  <InputField
                    label="Location"
                    value={editedData.personal?.location || ''}
                    onChange={(v) => updatePersonal('location', v)}
                    placeholder="London, UK"
                  />
                  <InputField
                    label="LinkedIn"
                    value={editedData.personal?.linkedin || ''}
                    onChange={(v) => updatePersonal('linkedin', v)}
                    placeholder="linkedin.com/in/johndoe"
                  />
                  <InputField
                    label="GitHub"
                    value={editedData.personal?.github || ''}
                    onChange={(v) => updatePersonal('github', v)}
                    placeholder="github.com/johndoe"
                  />
                </div>
              </section>

              {/* Professional Summary Section */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Summary</h3>
                <textarea
                  value={editedData.summary || ''}
                  onChange={(e) => setEditedData({ ...editedData, summary: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Brief professional summary..."
                />
              </section>

              {/* Experience Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Experience</h3>
                  <button
                    onClick={addExperience}
                    className="px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                  >
                    + Add Experience
                  </button>
                </div>
                <div className="space-y-6">
                  {editedData.experience.map((exp, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InputField
                          label="Job Title"
                          value={exp.title}
                          onChange={(v) => updateExperience(index, 'title', v)}
                          placeholder="Software Engineer"
                        />
                        <InputField
                          label="Company"
                          value={exp.company}
                          onChange={(v) => updateExperience(index, 'company', v)}
                          placeholder="Tech Corp"
                        />
                        <InputField
                          label="Start Date"
                          value={exp.startDate}
                          onChange={(v) => updateExperience(index, 'startDate', v)}
                          placeholder="2020-01"
                        />
                        <InputField
                          label="End Date"
                          value={exp.endDate || ''}
                          onChange={(v) => updateExperience(index, 'endDate', v)}
                          placeholder="2023-12 or Present"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Responsibilities (one per line)
                        </label>
                        <textarea
                          value={exp.responsibilities?.join('\n') || ''}
                          onChange={(e) => updateExperience(index, 'responsibilities', e.target.value.split('\n'))}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Led development of X&#10;Implemented Y&#10;Improved Z by 50%"
                        />
                      </div>
                      <button
                        onClick={() => removeExperience(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove Experience
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Education Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Education</h3>
                  <button
                    onClick={addEducation}
                    className="px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                  >
                    + Add Education
                  </button>
                </div>
                <div className="space-y-4">
                  {editedData.education.map((edu, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InputField
                          label="Institution"
                          value={edu.institution}
                          onChange={(v) => updateEducation(index, 'institution', v)}
                          placeholder="University of Westminster"
                        />
                        <InputField
                          label="Degree"
                          value={edu.degree}
                          onChange={(v) => updateEducation(index, 'degree', v)}
                          placeholder="BSc Computer Science"
                        />
                        <InputField
                          label="Field of Study"
                          value={edu.field || ''}
                          onChange={(v) => updateEducation(index, 'field', v)}
                          placeholder="Computer Science"
                        />
                        <InputField
                          label="Graduation Year"
                          value={edu.endDate || ''}
                          onChange={(v) => updateEducation(index, 'endDate', v)}
                          placeholder="2025"
                        />
                      </div>
                      <button
                        onClick={() => removeEducation(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove Education
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Skills Section */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills</h3>
                <textarea
                  value={editedData.skills.join(', ')}
                  onChange={(e) => updateSkills(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="JavaScript, React, Node.js, Python, Docker"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Separate skills with commas
                </p>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable Input Field Component
 */
interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function InputField({ label, value, onChange, placeholder }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );
}