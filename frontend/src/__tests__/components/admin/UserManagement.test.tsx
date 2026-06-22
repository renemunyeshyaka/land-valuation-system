import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserManagement from '@/components/admin/UserManagement';
import axios from 'axios';

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
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UserManagement sensitive account controls', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('access_token', 'token');

    mockedAxios.get.mockResolvedValue({
      data: {
        data: {
          data: [
            {
              id: 'user-1',
              first_name: 'Amina',
              last_name: 'Mukasa',
              email: 'amina@example.com',
              phone: '+250700000001',
              national_id: '1199988877766655',
              full_name: 'Amina Mukasa',
              user_type: 'admin',
              company_name: 'Land Insights',
              business_license: 'LIC-42',
              preferred_language: 'en',
              language_preference: 'rw',
              city: 'Kigali',
              country: 'Rwanda',
              bio: 'Platform administrator',
              profile_image: 'https://example.com/avatar.png',
              kyc_status: 'approved',
              subscription_tier: 'ultimate',
              subscription_status: 'active',
              is_active: true,
              is_diaspora: false,
              notification_email: true,
              notification_sms: false,
              email_verified: true,
              is_verified: true,
              two_factor_enabled: true,
              two_fa_enabled: true,
              is_ultimate_no_expiry: true,
            },
          ],
          page: 1,
          total: 1,
        },
      },
    } as any);
    mockedAxios.put.mockResolvedValue({ data: { success: true } } as any);
  });

  it('keeps sensitive fields out of the profile edit payload', async () => {
    render(<UserManagement />);

    expect(await screen.findByText('Amina')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('View'));

    expect(await screen.findByText('User Details')).toBeInTheDocument();
    expect(screen.getAllByText('admin')[0]).toBeInTheDocument();
    expect(screen.getAllByText('ultimate')[0]).toBeInTheDocument();

    fireEvent.click(screen.getByText('Edit User'));

    expect(await screen.findByText('Edit User')).toBeInTheDocument();
    expect(screen.getByTestId('sensitive-account-controls-heading')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalled();
    });

    const payload = mockedAxios.put.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.first_name).toBe('Amina');
    expect(payload.kyc_status).toBe('approved');
    expect(payload.user_type).toBeUndefined();
    expect(payload.subscription_tier).toBeUndefined();
    expect(payload.subscription_status).toBeUndefined();
    expect(payload.email_verified).toBeUndefined();
    expect(payload.is_verified).toBeUndefined();
    expect(payload.two_factor_enabled).toBeUndefined();
    expect(payload.is_ultimate_no_expiry).toBeUndefined();
  });

  it('sends role changes only through the dedicated role workflow', async () => {
    render(<UserManagement />);

    expect(await screen.findByText('Amina')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('View'));
    fireEvent.click(await screen.findByText('Manage Role'));

    expect(await screen.findByText('Manage Role')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Role user type'), { target: { value: 'partner' } });
    fireEvent.click(screen.getByLabelText('I confirm this role change is intentional and approved.'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Role Change' }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalled();
    });

    const payload = mockedAxios.put.mock.calls[mockedAxios.put.mock.calls.length - 1][1] as Record<string, unknown>;
    expect(payload.first_name).toBe('Amina');
    expect(payload.user_type).toBe('partner');
    expect(payload.subscription_tier).toBeUndefined();
    expect(payload.subscription_status).toBeUndefined();
    expect(payload.is_verified).toBeUndefined();
    expect(payload.email_verified).toBeUndefined();
    expect(payload.two_factor_enabled).toBeUndefined();
  });

  it('sends access overrides only through the dedicated access workflow', async () => {
    render(<UserManagement />);

    expect(await screen.findByText('Amina')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('View'));
    fireEvent.click(await screen.findByText('Manage Access'));

    expect(await screen.findByText('Manage Access Overrides')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Access subscription tier'), { target: { value: 'professional' } });
    fireEvent.change(screen.getByLabelText('Access subscription status'), { target: { value: 'past_due' } });
    fireEvent.click(screen.getByLabelText('Verified'));
    fireEvent.click(screen.getByLabelText('I confirm this access override is intentional and approved.'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Access Overrides' }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalled();
    });

    const payload = mockedAxios.put.mock.calls[mockedAxios.put.mock.calls.length - 1][1] as Record<string, unknown>;
    expect(payload.first_name).toBe('Amina');
    expect(payload.user_type).toBeUndefined();
    expect(payload.subscription_tier).toBe('professional');
    expect(payload.subscription_status).toBe('past_due');
    expect(payload.is_verified).toBe(false);
    expect(payload.email_verified).toBe(true);
    expect(payload.two_factor_enabled).toBe(true);
    expect(payload.is_ultimate_no_expiry).toBe(true);
    expect(payload.phone).toBeUndefined();
    expect(payload.kyc_status).toBeUndefined();
  });
});