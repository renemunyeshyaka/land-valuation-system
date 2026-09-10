import NextApp, { type AppContext, type AppProps } from 'next/app'
import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { store } from '../src/store'
import '../src/styles/globals.css'
import i18n, { applySavedLanguage, readLanguageFromCookieHeader, syncLanguageFromBackend } from '../src/utils/i18n'
import ChatWidget from '../src/components/ChatWidget'

function LandValApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  // After hydration, apply the user's saved language preference.
  useEffect(() => {
    applySavedLanguage();
    syncLanguageFromBackend();
  }, [])

  return (
    <SessionProvider session={session}>
      <Provider store={store}>
        <Component {...pageProps} />
        <ChatWidget />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </Provider>
    </SessionProvider>
  )
}

/**
 * Render the user's saved language on the server.
 *
 * The preference lives in a cookie as well as localStorage; the cookie is the
 * only one visible to the server, so reading it here means the first paint is
 * already in the right language instead of flashing Kinyarwanda (the bundled
 * fallback) until hydration completes.
 */
LandValApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await NextApp.getInitialProps(appContext);
  const lang = readLanguageFromCookieHeader(appContext.ctx.req?.headers?.cookie);

  if (lang && i18n.language !== lang) {
    await i18n.changeLanguage(lang);
  }

  return { ...appProps };
};

export default LandValApp;
