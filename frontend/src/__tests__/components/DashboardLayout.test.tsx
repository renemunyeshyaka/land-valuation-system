import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardLayout from '@/components/DashboardLayout';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/reports', query: {}, push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('next-auth/react', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/tokenRefresh', () => ({
  clearAuth: jest.fn(),
}));

jest.mock('@/components/LanguageSwitcher', () => function MockLanguageSwitcher() {
  return <div data-testid="language-switcher" />;
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'userNav.dashboard': 'Dashboard',
        'userNav.properties': 'My Properties',
        'userNav.payments': 'Payments',
        'userNav.notifications': 'Notifications',
        'userNav.reports': 'Reports',
        'userNav.profile': 'Profile',
        'userNav.settings': 'Settings',
        'userNav.logout': 'Logout',
        'userNav.subtitle': 'User Dashboard',
        'userNav.menu': 'Dashboard menu',
        'userNav.analytics': 'Analytics',
        'dashboard.title': 'Dashboard',
        'dashboard.addProperty': 'Add Property',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('DashboardLayout', () => {
  it('renders the top navigation, the left menu, the content and the footer', () => {
    render(
      <DashboardLayout footer={<div data-testid="app-footer">footer</div>}>
        <div data-testid="page-content">page</div>
      </DashboardLayout>,
    );

    // Top navigation (dashboard destinations only).
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('My Properties')).toBeInTheDocument();

    // Left menu.
    expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument();

    // Page content and footer keep their place inside the shell.
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.getByTestId('app-footer')).toBeInTheDocument();

    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });

  it('does not expose the public marketing menus', () => {
    render(
      <DashboardLayout>
        <div>page</div>
      </DashboardLayout>,
    );

    ['How It Works', 'Benefits', 'Marketplace', 'Contact'].forEach((label) => {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });

    const publicHrefs = ['/', '/how-it-works', '/benefits', '/marketplace', '/contact'];
    Array.from(document.querySelectorAll('a')).forEach((anchor) => {
      expect(publicHrefs).not.toContain(anchor.getAttribute('href'));
    });
  });
});
