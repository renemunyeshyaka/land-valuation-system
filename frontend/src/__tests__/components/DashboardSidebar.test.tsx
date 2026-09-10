import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DashboardSidebar from '@/components/DashboardSidebar';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/reports', query: {}, push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dashboard.title': 'Dashboard',
        'dashboard.overview': 'Overview',
        'dashboard.profile': 'Profile',
        'dashboard.estimate': 'Estimate Search',
        'dashboard.properties': 'Properties',
        'dashboard.billing': 'Billing',
        'dashboard.refunds': 'Refunds',
        'dashboard.subscription': 'Subscription',
        'dashboard.notifications': 'Notifications',
        'userNav.analytics': 'Analytics',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('DashboardSidebar', () => {
  it('links every dashboard destination when used outside the dashboard home', () => {
    render(<DashboardSidebar />);

    const hrefs = Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href'));

    expect(hrefs).toEqual([
      '/dashboard',
      '/dashboard/profile',
      '/dashboard?tab=estimate',
      '/dashboard/properties',
      '/payments',
      '/dashboard?tab=refunds',
      '/dashboard/subscription',
      '/notifications',
      '/analytics',
    ]);
  });

  it('shows all eight tabs', () => {
    render(<DashboardSidebar />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Estimate Search')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Refunds')).toBeInTheDocument();
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('switches tabs in-page instead of navigating when onSelect is provided', () => {
    const onSelect = jest.fn();
    render(<DashboardSidebar activeTab="properties" onSelect={onSelect} />);

    // All eight tabs are buttons in this mode, not links.
    expect(screen.getAllByTestId(/^user-dashboard-tab-/)).toHaveLength(8);

    fireEvent.click(screen.getByTestId('user-dashboard-tab-refunds'));
    expect(onSelect).toHaveBeenCalledWith('refunds');

    // Analytics is still a real destination, even on the dashboard home.
    expect(screen.getByTestId('user-dashboard-link-analytics')).toHaveAttribute('href', '/analytics');
  });
});
