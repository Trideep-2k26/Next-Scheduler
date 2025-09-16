import { SessionProvider } from 'next-auth/react'
import '../styles/globals.css'
// Temporarily disable slot cleanup initialization due to client-side import issues
// import '../lib/slotCleanupInit' // Initialize slot cleanup service

export default function App({
  Component,
  pageProps: { session, ...pageProps }
}) {
  return (
    <SessionProvider session={session}>
      <div className="page-container">
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  )
}
