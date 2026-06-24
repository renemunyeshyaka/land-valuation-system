import type { AppProps } from 'next/app'
import { useEffect } from 'react'
//import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { store } from '../store'
import { applySavedLanguage, syncLanguageFromBackend } from '../utils/i18n'




export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  useEffect(() => {
    // Apply saved language preference from localStorage
    applySavedLanguage();
    // Sync language from backend (if logged in)
    syncLanguageFromBackend();
  }, []);

  return (
    <SessionProvider session={session}>
      <Provider store={store}>
        <Component {...pageProps} />
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