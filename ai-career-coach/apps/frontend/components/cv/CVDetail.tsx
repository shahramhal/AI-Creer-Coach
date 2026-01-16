// apps/frontend/components/cv/CVDetail.tsx (UPDATED)

'use client';

import { useState } from 'react';
import type { CV } from '../../types/cv.types';
import CVEditModal from './CVEditModal';

interface CVDetailProps {
  cv: CV;
  onClose: () => void;
  onUpdate: (updatedCV: CV) => void;
}

/**
 * CVDetail - Display detailed CV information (read-only view)
 * Opens CVEditModal for editing
 */
export default function CVDetail({ cv, onClose, onUpdate }: CVDetailProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  /**
   * Format date to readable string
   */
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    
    // Handle "Present" or similar text
    if (dateString.toLowerCase() === 'present') return 'Present';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric'
    });
  };

  /**
   * Handle successful edit
   */
  const handleEditSave = (updatedCV: CV) => {
    onUpdate(updatedCV);
    setIsEditModalOpen(false);
  };

  const parsedData = cv.parsedData;

  return (
    <>
      {/* Main Detail Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{cv.filename}</h2>
                <p className="text-sm text-gray-500">
                  {cv.isPrimary && <span className="text-indigo-600 font-medium">Primary CV • </span>}
                  Uploaded {new Date(cv.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Edit CV
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-8">
              
              {/* Personal Information */}
              {parsedData?.personal && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    {parsedData.personal.name && <InfoItem label="Name" value={parsedData.personal.name} />}
                    {parsedData.personal.email && <InfoItem label="Email" value={parsedData.personal.email} />}
                    {parsedData.personal.phone && <InfoItem label="Phone" value={parsedData.personal.phone} />}
                    {parsedData.personal.location && <InfoItem label="Location" value={parsedData.personal.location} />}
                    {parsedData.personal.linkedin && <InfoItem label="LinkedIn" value={parsedData.personal.linkedin} link />}
                    {parsedData.personal.github && <InfoItem label="GitHub" value={parsedData.personal.github} link />}
                  </div>
                </section>
              )}

              {/* Professional Summary */}
              {parsedData?.summary && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Professional Summary
                  </h3>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                    {parsedData.summary}
                  </p>
                </section>
              )}

              {/* Experience */}
              {parsedData?.experience && parsedData.experience.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Experience
                  </h3>
                  <div className="space-y-6">
                    {parsedData.experience.map((exp, index) => (
                      <div key={index} className="border-l-4 border-indigo-600 pl-4 py-2">
                        <h4 className="text-lg font-medium text-gray-900">{exp.title}</h4>
                        <p className="text-indigo-600 font-medium">{exp.company}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                          {exp.duration && <span className="ml-2">({exp.duration})</span>}
                        </p>
                        {exp.responsibilities && exp.responsibilities.length > 0 && (
                          <ul className="mt-3 space-y-2">
                            {exp.responsibilities.map((resp, i) => (
                              <li key={i} className="text-gray-700 flex items-start">
                                <span className="text-indigo-600 mr-2">•</span>
                                <span>{resp}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Education */}
              {parsedData?.education && parsedData.education.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                    Education
                  </h3>
                  <div className="space-y-4">
                    {parsedData.education.map((edu, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-lg font-medium text-gray-900">{edu.degree}</h4>
                        <p className="text-indigo-600 font-medium">{edu.institution}</p>
                        {edu.field && <p className="text-gray-600 mt-1">{edu.field}</p>}
                        {edu.endDate && (
                          <p className="text-sm text-gray-500 mt-1">
                            Graduated: {formatDate(edu.endDate)}
                          </p>
                        )}
                        {edu.gpa && <p className="text-sm text-gray-600 mt-1">GPA: {edu.gpa}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Skills */}
              {parsedData?.skills && parsedData.skills.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Certifications */}
              {parsedData?.certifications && parsedData.certifications.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
                  <div className="space-y-3">
                    {parsedData.certifications.map((cert, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-900">{cert.name}</p>
                        <p className="text-sm text-gray-600">{cert.issuer}</p>
                        {cert.date && <p className="text-sm text-gray-500">Issued: {formatDate(cert.date)}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <CVEditModal
        cv={cv}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
      />
    </>
  );
}

/**
 * Reusable info display component
 */
interface InfoItemProps {
  label: string;
  value: string;
  link?: boolean;
}

function InfoItem({ label, value, link }: InfoItemProps) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {link ? (
        <a
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-700 underline"
        >
          {value}
        </a>
      ) : (
        <p className="text-gray-900">{value}</p>
      )}
    </div>
  );
}