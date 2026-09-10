import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfilePage from '../../../pages/dashboard/profile';

const pushMock = jest.fn();
const replaceMock = jest.fn();
const fetchWithTokenRefreshMock = jest.fn();
const toastSuccessMock = jest.fn();
const toastErrorMock = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'authenticated' }),
}));

jest.mock('../../../utils/tokenRefresh', () => ({
  fetchWithTokenRefresh: (...args: any[]) => fetchWithTokenRefreshMock(...args),
  startTokenRefreshInterval: jest.fn(),
  clearAuth: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: (...args: any[]) => toastSuccessMock(...args),
    error: (...args: any[]) => toastErrorMock(...args),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'toast.fillAllFields': 'Please fix the errors in the form',
        'toast.settingsUpdated': 'Profile updated successfully!',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('../../../components/Footer', () => function MockFooter() {
  return <div data-testid="footer">footer</div>;
});

// The shared dashboard navbar renders the language switcher, which pulls in the
// real i18n instance. react-i18next is mocked in this file, so stub it out.
jest.mock('../../../components/LanguageSwitcher', () => function MockLanguageSwitcher() {
  return <div data-testid="language-switcher" />;
});

describe('Dashboard Profile page flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    window.localStorage.clear();
    window.localStorage.setItem('access_token', 'token');
    window.localStorage.setItem('user', JSON.stringify({ user_type: 'individual' }));

    fetchWithTokenRefreshMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user_type: 'individual',
          first_name: 'Jean',
          last_name: 'Rene',
          email: 'jean@example.com',
          phone: '+250788123123',
          address: 'Kigali',
        },
      }),
    });
  });

  it('shows validation error and blocks submit when required fields are missing', async () => {
    render(<ProfilePage />);

    const firstNameInput = await screen.findByLabelText(/First Name/i);
    fireEvent.change(firstNameInput, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(await screen.findByText(/First name is required/i)).toBeInTheDocument();
    expect(toastErrorMock).toHaveBeenCalledWith('Please fix the errors in the form');
    expect(global.fetch).toBeUndefined();
  });

  it('submits profile updates and shows success state', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    global.fetch = fetchMock as any;

    render(<ProfilePage />);

    const firstNameInput = await screen.findByLabelText(/First Name/i);
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [, requestOptions] = fetchMock.mock.calls[0];
    const payload = JSON.parse(requestOptions.body);
    expect(payload.first_name).toBe('Updated');

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Profile updated successfully!');
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 2500 });
  });

  it('shows saving indicator while update request is in flight', async () => {
    let resolveFetch: (value: any) => void = () => {};
    const pendingFetch = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    const fetchMock = jest.fn().mockReturnValue(pendingFetch);
    global.fetch = fetchMock as any;

    render(<ProfilePage />);

    const firstNameInput = await screen.findByLabelText(/First Name/i);
    fireEvent.change(firstNameInput, { target: { value: 'Pending' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(await screen.findByText(/Saving\.\.\./i)).toBeInTheDocument();

    resolveFetch({ ok: true, status: 200, json: async () => ({}) });
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Profile updated successfully!');
    });
  });

  it('requires password and typed DELETE before deleting the account', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'Account deleted successfully' }),
    });
    global.fetch = fetchMock as any;

    render(<ProfilePage />);

    fireEvent.click(await screen.findByRole('button', { name: /Delete My Account/i }));

    // No password yet — nothing is sent.
    fireEvent.click(screen.getByRole('button', { name: /^Delete Account$/i }));
    expect(await screen.findByText(/Enter your password to confirm/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    // Password present but the typed confirmation is wrong — still nothing sent.
    fireEvent.change(screen.getByLabelText(/Confirm your password/i), { target: { value: 'secret' } });
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/i), { target: { value: 'NOPE' } });
    fireEvent.click(screen.getByRole('button', { name: /^Delete Account$/i }));
    expect(await screen.findByText(/Type DELETE to confirm/i, { selector: 'span' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    // Full confirmation deletes the account through the API.
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/i), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: /^Delete Account$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [url, requestOptions] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/users/account');
    expect(requestOptions.method).toBe('DELETE');
    expect(JSON.parse(requestOptions.body).password).toBe('secret');

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Your account has been deleted.');
    });
    expect(replaceMock).toHaveBeenCalledWith('/');
  });
});
