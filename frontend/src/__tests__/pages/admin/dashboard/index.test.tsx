import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminDashboard from './index';

const replaceMock = jest.fn();

let routerState: any = {
  pathname: '/admin/dashboard',
  query: {},
  isReady: true,
  replace: replaceMock,
  push: jest.fn(),
};

jest.mock('next/router', () => ({
  useRouter: () => routerState,
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
  signOut: jest.fn(),
}));

jest.mock('@/utils/tokenRefresh', () => ({
  refreshAccessToken: jest.fn().mockResolvedValue(true),
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { data: { total: 0, total_revenue: 0 } } }),
  },
}));

jest.mock('@/components/Footer', () => function MockFooter() {
  return <div data-testid="footer">footer</div>;
});

jest.mock('@/components/admin/UserManagement', () => function MockUserManagement() {
  return <div data-testid="admin-users-panel">users panel</div>;
});

jest.mock('@/components/admin/MarketplaceManagement', () => function MockMarketplaceManagement() {
  return <div data-testid="admin-marketplace-panel">marketplace panel</div>;
});

jest.mock('@/components/admin/PropertyListings', () => function MockPropertyListings() {
  return <div data-testid="admin-listings-panel">listings panel</div>;
});

jest.mock('@/components/admin/AnalyticsRevenue', () => function MockAnalyticsRevenue() {
  return <div data-testid="admin-analytics-panel">analytics panel</div>;
});

jest.mock('@/components/admin/SupportModeration', () => function MockSupportModeration() {
  return <div data-testid="admin-support-panel">support panel</div>;
});

jest.mock('@/components/admin/Payments', () => function MockPayments() {
  return <div data-testid="admin-payments-panel">payments panel</div>;
});

jest.mock('@/components/admin/SystemHealth', () => function MockSystemHealth() {
  return <div data-testid="admin-system-panel">system panel</div>;
});

jest.mock('@/components/admin/DataImportExport', () => function MockDataImportExport() {
  return <div data-testid="admin-data-panel">data panel</div>;
});

jest.mock('@/components/admin/NotificationManagement', () => function MockNotificationManagement() {
  return <div data-testid="admin-notifications-panel">notifications panel</div>;
});

describe('Admin dashboard navigation query sync', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    window.localStorage.clear();
    window.localStorage.setItem('access_token', 'token');
    routerState = {
      pathname: '/admin/dashboard',
      query: {},
      isReady: true,
      replace: replaceMock,
      push: jest.fn(),
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { first_name: 'Admin', last_name: 'User', email: 'admin@example.com' } }),
    } as any);
  });

  it('uses query tab to set active section', async () => {
    routerState.query = { tab: 'users' };

    render(<AdminDashboard />);

    expect(await screen.findByTestId('admin-users-panel')).toBeInTheDocument();
    expect(screen.getByTestId('admin-nav-users')).toHaveAttribute('aria-current', 'page');
  });

  it('updates URL query when selecting a nav tab', async () => {
    render(<AdminDashboard />);

    fireEvent.click(screen.getByTestId('admin-nav-listings'));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });

    const replaceArgs = replaceMock.mock.calls[0][0];
    expect(replaceArgs.pathname).toBe('/admin/dashboard');
    expect(replaceArgs.query.tab).toBe('listings');
  });
});
