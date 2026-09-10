import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardNavbar from '@/components/DashboardNavbar';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/dashboard', push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('next-auth/react', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
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
        'dashboard.addProperty': 'Add Property',
      };
      return translations[key] ?? key;
    },
  }),
}));

const PUBLIC_MENU_LABELS = ['How It Works', 'Benefits', 'Marketplace', 'Contact'];

describe('DashboardNavbar', () => {
  it('shows the in-dashboard destinations', () => {
    render(<DashboardNavbar />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Properties')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('never exposes the public marketing menus', () => {
    render(<DashboardNavbar />);

    PUBLIC_MENU_LABELS.forEach((label) => {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });

    // Guard by destination too, so a renamed label cannot sneak the page back in.
    const publicHrefs = ['/', '/how-it-works', '/benefits', '/marketplace', '/contact'];
    Array.from(document.querySelectorAll('a')).forEach((anchor) => {
      expect(publicHrefs).not.toContain(anchor.getAttribute('href'));
    });
  });

  it('only shows Add Property when the account is allowed to list', () => {
    const { unmount } = render(<DashboardNavbar />);
    expect(screen.queryByText('Add Property')).not.toBeInTheDocument();
    unmount();

    render(<DashboardNavbar showAddProperty />);
    expect(screen.getByText('Add Property')).toBeInTheDocument();
  });
});
