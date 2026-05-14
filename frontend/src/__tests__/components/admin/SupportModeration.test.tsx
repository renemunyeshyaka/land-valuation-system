import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import SupportModeration from '@/components/admin/SupportModeration';

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
}));

jest.mock('@/utils/tokenRefresh', () => ({
  refreshAccessToken: jest.fn().mockResolvedValue(true),
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SupportModeration audit action labels', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('access_token', 'token');

    mockedAxios.get.mockResolvedValue({
      data: {
        data: {
          data: [
            { id: 1, user_id: 9, action: 'admin_user_role_updated', timestamp: '2026-05-14T18:00:00Z' },
            { id: 2, user_id: 9, action: 'admin_user_access_updated', timestamp: '2026-05-14T18:01:00Z' },
            { id: 3, user_id: 9, action: 'admin_user_profile_updated', timestamp: '2026-05-14T18:02:00Z' },
            { id: 4, user_id: 9, action: 'legacy_custom_action', timestamp: '2026-05-14T18:03:00Z' },
          ],
          page: 1,
          total: 4,
        },
      },
    } as any);
  });

  it('renders readable action labels and category badges', async () => {
    render(<SupportModeration />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    expect(await screen.findByText('User Role Updated')).toBeInTheDocument();
    expect(screen.getByText('User Access Updated')).toBeInTheDocument();
    expect(screen.getByText('User Profile Updated')).toBeInTheDocument();
    expect(screen.getByText('Legacy Custom Action')).toBeInTheDocument();

    expect(screen.getByTestId('audit-category-badge-1')).toHaveTextContent('Role');
    expect(screen.getByTestId('audit-category-badge-2')).toHaveTextContent('Access');
    expect(screen.getByTestId('audit-category-badge-3')).toHaveTextContent('Profile');
    expect(screen.getByTestId('audit-category-badge-4')).toHaveTextContent('Other');
  });
});