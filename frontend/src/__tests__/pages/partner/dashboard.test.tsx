import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PartnerDashboardPage from '../../../pages/partner/dashboard';

const pushMock = jest.fn();
const replaceMock = jest.fn();
const fetchWithTokenRefreshMock = jest.fn();

let routerState: any = {
  pathname: '/partner/dashboard',
  query: {},
  isReady: true,
  push: pushMock,
  replace: replaceMock,
};

jest.mock('next/router', () => ({
  useRouter: () => routerState,
}));

jest.mock('@/utils/tokenRefresh', () => ({
  clearAuth: jest.fn(),
  fetchWithTokenRefresh: (...args: any[]) => fetchWithTokenRefreshMock(...args),
}));

describe('PartnerDashboardPage role guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    routerState = {
      pathname: '/partner/dashboard',
      query: {},
      isReady: true,
      push: pushMock,
      replace: replaceMock,
    };
  });

  it('redirects unauthenticated users to login', async () => {
    render(<PartnerDashboardPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('redirects admin users to admin dashboard', async () => {
    window.localStorage.setItem('access_token', 'token');
    fetchWithTokenRefreshMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { user_type: 'admin', first_name: 'A', last_name: 'B', email: 'a@b.com' } }),
    });

    render(<PartnerDashboardPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('shows restriction tab content for government users', async () => {
    window.localStorage.setItem('access_token', 'token');
    fetchWithTokenRefreshMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { user_type: 'government', first_name: 'Gov', last_name: 'User', email: 'gov@example.com' } }),
    });

    render(<PartnerDashboardPage />);

    const restrictedTab = await screen.findByRole('button', { name: /Properties \(Restricted\)/i });
    fireEvent.click(restrictedTab);

    expect(await screen.findByText(/Add Property is not available for government\/partner accounts/i)).toBeInTheDocument();
  });

  it('uses query tab to set active partner section', async () => {
    routerState.query = { tab: 'properties' };
    window.localStorage.setItem('access_token', 'token');
    fetchWithTokenRefreshMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { user_type: 'government', first_name: 'Gov', last_name: 'User', email: 'gov@example.com' } }),
    });

    render(<PartnerDashboardPage />);

    expect(await screen.findByText(/Add Property is not available for government\/partner accounts/i)).toBeInTheDocument();
    expect(screen.getByTestId('partner-nav-properties')).toHaveAttribute('aria-current', 'page');
  });

  it('updates URL query when selecting partner nav tab', async () => {
    window.localStorage.setItem('access_token', 'token');
    fetchWithTokenRefreshMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { user_type: 'government', first_name: 'Gov', last_name: 'User', email: 'gov@example.com' } }),
    });

    render(<PartnerDashboardPage />);

    const accessTab = await screen.findByTestId('partner-nav-access');
    fireEvent.click(accessTab);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });

    const replaceArgs = replaceMock.mock.calls[0][0];
    expect(replaceArgs.pathname).toBe('/partner/dashboard');
    expect(replaceArgs.query.tab).toBe('access');
  });
});
