// Worker-app 10.2 smoke test; the full component suite is task 10.5.
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JoinRequestPhoto, photoPath } from './JoinRequestPhoto';

const download = vi.hoisted(() => ({ downloadHrBlob: vi.fn() }));
vi.mock('../api/download', () => download);

afterEach(() => vi.clearAllMocks());

describe('JoinRequestPhoto (R4.2, R11.5)', () => {
  it('strips the API prefix the server puts on the photo URL', () => {
    expect(photoPath('/api/v1/users/u1/photo')).toBe('/users/u1/photo');
    expect(photoPath('/users/u1/photo')).toBe('/users/u1/photo');
  });

  it('shows the initials without a photo and never fetches', () => {
    render(<JoinRequestPhoto name="Priya Sharma" photoUrl={null} />);
    expect(screen.getByText('PS')).toBeInTheDocument();
    expect(download.downloadHrBlob).not.toHaveBeenCalled();
  });

  it('fetches the bytes through the session and shows them as an object URL', async () => {
    const createObjectURL = vi.fn(() => 'blob:photo');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    download.downloadHrBlob.mockResolvedValue({ blob: new Blob(['x']), filename: 'photo.jpg' });

    const { unmount } = render(
      <JoinRequestPhoto name="Priya Sharma" photoUrl="/api/v1/users/u1/photo" />,
    );
    expect(download.downloadHrBlob).toHaveBeenCalledWith('/users/u1/photo', undefined, 'photo.jpg');
    const img = await screen.findByTestId('join-request-photo');
    expect(img).toHaveAttribute('src', 'blob:photo');
    expect(screen.queryByText('PS')).not.toBeInTheDocument();

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:photo');
    vi.unstubAllGlobals();
  });

  it('falls back to the initials when the photo cannot be fetched', async () => {
    download.downloadHrBlob.mockRejectedValue(new Error('403'));
    render(<JoinRequestPhoto name="Priya Sharma" photoUrl="/api/v1/users/u1/photo" />);
    await waitFor(() => expect(download.downloadHrBlob).toHaveBeenCalledTimes(1));
    expect(screen.getByText('PS')).toBeInTheDocument();
  });
});
