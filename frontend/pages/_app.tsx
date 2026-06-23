import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { store } from '../src/store'
import '../src/styles/globals.css'
import '../src/utils/i18n' // Initialize i18n (always with 'rw' to match SSR)
import { applySavedLanguage } from '../src/utils/i18n'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  // After hydration, apply the user's saved language preference
  // (not done during init to avoid hydration mismatch errors #418/#423/#425)
  useEffect(() => {
    applySavedLanguage()
  }, [])

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
