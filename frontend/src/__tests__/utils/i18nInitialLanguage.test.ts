/**
 * Hydration safety.
 *
 * The server paints the language it finds in the `preferred_language` cookie
 * (`_app.getInitialProps`), so the i18n instance on the client must start from
 * that same cookie. If it starts from anything else, React reports
 * "Text content does not match server-rendered HTML" (#425).
 */
const setCookie = (value: string) => {
  document.cookie = `preferred_language=${value}; path=/`;
};

const clearCookie = () => {
  document.cookie = 'preferred_language=; path=/; max-age=0';
};

/** Re-evaluates src/utils/i18n.ts, i.e. what happens when the client bundle loads. */
const loadI18n = async () => {
  jest.resetModules();
  const mod = await import('../../utils/i18n');
  return mod.default;
};

describe('i18n initial language on the client', () => {
  afterEach(() => {
    clearCookie();
  });

  it('starts in the language stored in the cookie', async () => {
    setCookie('fr');
    const i18n = await loadI18n();

    expect(i18n.language).toBe('fr');
  });

  it('starts in English when that is the stored language', async () => {
    setCookie('en');
    const i18n = await loadI18n();

    expect(i18n.language).toBe('en');
  });

  it('already translates in the stored language on the first render', async () => {
    setCookie('fr');
    const i18n = await loadI18n();

    // If this returns the raw key or Kinyarwanda while the server rendered
    // French, hydration fails.
    expect(i18n.t('common.back')).toBe('Retour');
  });

  it('falls back to Kinyarwanda without a cookie', async () => {
    const i18n = await loadI18n();

    expect(i18n.language).toBe('rw');
  });

  it('ignores an unsupported language in the cookie', async () => {
    setCookie('de');
    const i18n = await loadI18n();

    expect(i18n.language).toBe('rw');
  });
});
