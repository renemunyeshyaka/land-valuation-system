import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardBackButton from '@/components/DashboardBackButton';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'common.back' ? 'Back' : key),
  }),
}));

const setHistoryLength = (length: number) => {
  Object.defineProperty(window.history, 'length', { configurable: true, value: length });
};

describe('DashboardBackButton', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    setHistoryLength(1);
  });

  it('renders a labelled back control', () => {
    render(<DashboardBackButton />);

    const button = screen.getByTestId('dashboard-back');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Back');
  });

  it('returns to the previous page when the user navigated there', () => {
    setHistoryLength(3);
    render(<DashboardBackButton />);

    fireEvent.click(screen.getByTestId('dashboard-back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('falls back to the dashboard when the page was opened directly', () => {
    render(<DashboardBackButton />);

    fireEvent.click(screen.getByTestId('dashboard-back'));

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('honours a custom fallback destination', () => {
    render(<DashboardBackButton fallbackHref="/dashboard/properties" />);

    fireEvent.click(screen.getByTestId('dashboard-back'));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/properties');
  });
});
