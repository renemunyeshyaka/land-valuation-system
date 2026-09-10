import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import i18n from '@/utils/i18n';

/**
 * Selecting a language must:
 *  - switch the UI immediately (no reload)
 *  - persist to localStorage AND to the `preferred_language` cookie, because the
 *    cookie is what the server reads to render the right language
 *  - update <html lang>
 */
describe('LanguageSwitcher selection', () => {
  beforeEach(async () => {
    document.cookie = 'preferred_language=; path=/; max-age=0';
    localStorage.clear();
    await i18n.changeLanguage('rw');
    document.documentElement.lang = 'rw';
  });

  const chooseLanguage = (nativeLabel: string) => {
    // The trigger is labelled with the translated "language" label.
    fireEvent.click(screen.getByRole('button', { name: 'Ururimi' }));
    fireEvent.click(screen.getByText(nativeLabel));
  };

  it('switches language, persists it and updates <html lang>', () => {
    render(<LanguageSwitcher />);

    chooseLanguage('Français');

    expect(i18n.language).toBe('fr');
    expect(localStorage.getItem('preferred_language')).toBe('fr');
    expect(document.cookie).toContain('preferred_language=fr');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('translates the UI immediately, without a reload', () => {
    render(<LanguageSwitcher />);

    // Trigger label is Kinyarwanda before the change...
    expect(screen.getByRole('button', { name: 'Ururimi' })).toBeInTheDocument();

    chooseLanguage('Français');

    // ...and French straight after it.
    expect(screen.getByRole('button', { name: 'Langue' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ururimi' })).not.toBeInTheDocument();
  });

  it('supports switching to English and back to Kinyarwanda', () => {
    render(<LanguageSwitcher />);

    chooseLanguage('English');
    expect(i18n.language).toBe('en');
    expect(document.cookie).toContain('preferred_language=en');
    expect(screen.getByRole('button', { name: 'Language' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    fireEvent.click(screen.getByText('Kinyarwanda'));
    expect(i18n.language).toBe('rw');
    expect(document.cookie).toContain('preferred_language=rw');
    expect(screen.getByRole('button', { name: 'Ururimi' })).toBeInTheDocument();
  });

  it('keeps the chosen language after a reload (fresh module load)', async () => {
    render(<LanguageSwitcher />);
    chooseLanguage('Français');

    // Simulates the browser loading the app again: the client instance must be
    // built from the cookie the selection just wrote.
    jest.resetModules();
    const reloaded = await import('../../utils/i18n');

    expect(reloaded.default.language).toBe('fr');
    expect(reloaded.default.t('nav.language')).toBe('Langue');
  });
});
