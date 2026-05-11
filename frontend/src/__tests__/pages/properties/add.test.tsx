import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AddPropertyPage from './add';

const pushMock = jest.fn();
const replaceMock = jest.fn();
const fetchWithTokenRefreshMock = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));

jest.mock('../../src/utils/tokenRefresh', () => ({
  fetchWithTokenRefresh: (...args: any[]) => fetchWithTokenRefreshMock(...args),
}));

jest.mock('../../src/components/AddPropertyForm', () => function MockAddPropertyForm() {
  return <div data-testid="add-property-form">mock form</div>;
});

jest.mock('../../src/components/FourStepProcess', () => function MockFourStepProcess() {
  return <div data-testid="four-step-process">mock steps</div>;
});

describe('AddPropertyPage role guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('redirects unauthenticated users to login', async () => {
    render(<AddPropertyPage />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('redirects government users to partner dashboard', async () => {
    window.localStorage.setItem('access_token', 'token');
    fetchWithTokenRefreshMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { user_type: 'government' } }),
    });

    render(<AddPropertyPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/partner/dashboard');
    });
  });

  it('renders Add Property form for allowed users', async () => {
    window.localStorage.setItem('access_token', 'token');
    fetchWithTokenRefreshMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { user_type: 'individual' } }),
    });

    render(<AddPropertyPage />);

    expect(await screen.findByTestId('add-property-form')).toBeInTheDocument();
    expect(screen.getByTestId('four-step-process')).toBeInTheDocument();
  });
});
