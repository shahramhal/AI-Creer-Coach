import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvatarUpload from './AvatarUpload';

vi.mock('../../context/authContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    refreshUser: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../library/api', () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../library/config', () => ({
  API_BASE_URL: 'http://localhost:4000/api',
}));

import api from '../../library/api';

describe('AvatarUpload - initial rendering', () => {
  it('should show "No avatar" placeholder when currentAvatar is not provided', () => {
    render(<AvatarUpload onUpload={vi.fn()} />);
    expect(screen.getByText('No avatar')).toBeInTheDocument();
  });

  it('should show an avatar image when currentAvatar is a full URL', () => {
    render(
      <AvatarUpload
        currentAvatar="https://cdn.example.com/avatar.jpg"
        onUpload={vi.fn()}
      />
    );
    const img = screen.getByRole('img', { name: 'Avatar' });
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/avatar.jpg');
  });

  it('should prefix API base URL to a relative avatar path', () => {
    render(
      <AvatarUpload currentAvatar="/uploads/avatar.jpg" onUpload={vi.fn()} />
    );
    const img = screen.getByRole('img', { name: 'Avatar' });
    expect(img.getAttribute('src')).toContain('/uploads/avatar.jpg');
  });

  it('should render the "Change Avatar" label', () => {
    render(<AvatarUpload onUpload={vi.fn()} />);
    expect(screen.getByText('Change Avatar')).toBeInTheDocument();
  });

  it('should not show the Delete button when there is no avatar', () => {
    render(<AvatarUpload onUpload={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('should show the Delete button when there is an existing avatar', () => {
    render(
      <AvatarUpload
        currentAvatar="https://cdn.example.com/avatar.jpg"
        onUpload={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });
});

describe('AvatarUpload - file validation', () => {
  it('should show an error when a file exceeding 5MB is selected', async () => {
    render(<AvatarUpload onUpload={vi.fn()} />);

    const oversizedFile = new File(['x'.repeat(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, oversizedFile);

    expect(screen.getByText(/File size too large/)).toBeInTheDocument();
  });

  it('should show an error when an unsupported file type is selected', async () => {
    render(<AvatarUpload onUpload={vi.fn()} />);

    const gifFile = new File(['gif-content'], 'animation.gif', { type: 'image/gif' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, gifFile);

    expect(screen.getByText(/Invalid file type/)).toBeInTheDocument();
  });
});

describe('AvatarUpload - successful upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call api.post and then onUpload with the returned URL', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { avatarUrl: 'https://cdn.example.com/new-avatar.jpg' } },
    });
    const onUpload = vi.fn();
    render(<AvatarUpload onUpload={onUpload} />);

    const validFile = new File(['image-data'], 'avatar.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, validFile);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/v1/profile/avatar',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
      );
      expect(onUpload).toHaveBeenCalledWith('https://cdn.example.com/new-avatar.jpg');
    });
  });

  it('should show "Uploading..." while the upload is in progress', async () => {
    vi.mocked(api.post).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    render(<AvatarUpload onUpload={vi.fn()} />);

    const validFile = new File(['img'], 'photo.jpg', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, validFile);

    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('should show an error message when the upload request fails', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { data: { message: 'Upload failed on server' } } });
    render(<AvatarUpload onUpload={vi.fn()} />);

    const validFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, validFile);

    await waitFor(() => {
      expect(screen.getByText('Upload failed on server')).toBeInTheDocument();
    });
  });
});

describe('AvatarUpload - delete avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should call api.delete and clear the preview when deletion is confirmed', async () => {
    vi.mocked(api.delete).mockResolvedValue({});
    const onUpload = vi.fn();
    render(
      <AvatarUpload
        currentAvatar="https://cdn.example.com/avatar.jpg"
        onUpload={onUpload}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/v1/profile/avatar');
      expect(onUpload).toHaveBeenCalledWith('');
    });
  });

  it('should not call api.delete when confirmation is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    render(
      <AvatarUpload
        currentAvatar="https://cdn.example.com/avatar.jpg"
        onUpload={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('should show an error message when deletion fails', async () => {
    vi.mocked(api.delete).mockRejectedValue({ response: { data: { message: 'Delete failed' } } });
    render(
      <AvatarUpload
        currentAvatar="https://cdn.example.com/avatar.jpg"
        onUpload={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument();
    });
  });
});
