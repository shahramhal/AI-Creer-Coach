import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import CVUpload from './CVUpload';

vi.mock('../../services/cv.service', () => ({
  cvService: {
    uploadCV: vi.fn(),
  },
}));

import { cvService } from '../../services/cv.service';

const mockCvService = cvService as { uploadCV: ReturnType<typeof vi.fn> };

const buildPdfFile = (sizeBytes = 1024) =>
  new File(['x'.repeat(sizeBytes)], 'resume.pdf', { type: 'application/pdf' });

const buildDocxFile = () =>
  new File(['content'], 'resume.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

const buildOversizedFile = () =>
  new File(['x'.repeat(11 * 1024 * 1024)], 'huge.pdf', { type: 'application/pdf' });

const buildInvalidTypeFile = () =>
  new File(['content'], 'resume.txt', { type: 'text/plain' });

describe('CVUpload', () => {
  const onUploadSuccess = vi.fn();
  const onUploadError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the drop zone with upload instructions', () => {
    render(<CVUpload onUploadSuccess={onUploadSuccess} />);

    expect(screen.getByText(/Drop your CV here/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF or DOCX, up to 10MB/i)).toBeInTheDocument();
  });

  it('should show the selected file name after a valid PDF is chosen', async () => {
    render(<CVUpload onUploadSuccess={onUploadSuccess} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, buildPdfFile());

    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
  });

  it('should show "Upload & Parse" and "Remove" buttons after a file is selected', async () => {
    render(<CVUpload onUploadSuccess={onUploadSuccess} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, buildPdfFile());

    expect(screen.getByRole('button', { name: /upload & parse/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /remove/i }).length).toBeGreaterThan(0);
  });

  it('should show a validation error when a non-PDF/DOCX file is selected', async () => {
    render(<CVUpload onUploadSuccess={onUploadSuccess} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, buildInvalidTypeFile());

    expect(screen.getByText('Please upload a PDF or DOCX file')).toBeInTheDocument();
  });

  it('should show a size error when the file exceeds 10MB', async () => {
    render(<CVUpload onUploadSuccess={onUploadSuccess} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, buildOversizedFile());

    expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument();
  });

  it('should accept a valid DOCX file without showing an error', async () => {
    render(<CVUpload onUploadSuccess={onUploadSuccess} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, buildDocxFile());

    expect(screen.queryByText(/Please upload/i)).not.toBeInTheDocument();
    expect(screen.getByText('resume.docx')).toBeInTheDocument();
  });

  it('should call onUploadSuccess and reset the form after a successful upload', async () => {
    mockCvService.uploadCV.mockResolvedValue({
      data: { cvId: 'cv-123', parsedData: { name: 'Alice' } },
    });
    render(<CVUpload onUploadSuccess={onUploadSuccess} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, buildPdfFile());
    await userEvent.click(screen.getByRole('button', { name: /upload & parse/i }));

    await waitFor(() => {
      expect(onUploadSuccess).toHaveBeenCalledWith('cv-123', { name: 'Alice' });
    });

    expect(screen.getByText(/Drop your CV here/i)).toBeInTheDocument();
  });

  it('should show an error message when the upload fails', async () => {
    const axiosError = new axios.AxiosError(
      'Request failed',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      { data: { message: 'Upload failed on server' }, status: 500 } as any
    );
    mockCvService.uploadCV.mockRejectedValue(axiosError);
    render(<CVUpload onUploadSuccess={onUploadSuccess} onUploadError={onUploadError} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, buildPdfFile());
    await userEvent.click(screen.getByRole('button', { name: /upload & parse/i }));

    await waitFor(() => {
      expect(screen.getByText('Upload failed on server')).toBeInTheDocument();
    });
    expect(onUploadError).toHaveBeenCalledWith('Upload failed on server');
  });

  it('should clear the selected file when Remove is clicked', async () => {
    render(<CVUpload onUploadSuccess={onUploadSuccess} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, buildPdfFile());

    expect(screen.getByText('resume.pdf')).toBeInTheDocument();

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await userEvent.click(removeButtons[0]);

    expect(screen.getByText(/Drop your CV here/i)).toBeInTheDocument();
  });
});
