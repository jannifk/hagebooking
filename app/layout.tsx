import type { Metadata } from 'next'
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import './globals.css'

// Kjører før hydration for å unngå flash av feil tema
const THEME_INIT = `(function(){try{var s=localStorage.getItem('boligverdi-theme');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t;}catch(e){}})();`

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700'],
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Boligverdi — Uavhengig boligestimator',
  description:
    'Få et datadrevet estimat av boligens markedsverdi, basert på faktiske tinglyste salgspriser i nabolaget.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <div className="shell">
          <header className="topbar">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden />
              <span>Boligverdi</span>
              <span className="beta">Beta</span>
            </Link>
            <nav className="topbar-nav" aria-label="Hovednavigasjon">
              <Link href="/">Hjem</Link>
              <Link href="/metodikk">Metodikk</Link>
              <Link href="/metodikk#datakilder">Datakilder</Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer noopener"
              >
                API
              </a>
              <ThemeToggle />
            </nav>
          </header>
          <main style={{ flex: 1 }}>{children}</main>
        </div>
      </body>
    </html>
  )
}
