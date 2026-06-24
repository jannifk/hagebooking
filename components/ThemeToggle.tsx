'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  const stored = document.documentElement.dataset.theme
  if (stored === 'light' || stored === 'dark') return stored
  return getSystemTheme()
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(getInitialTheme())
    setMounted(true)
  }, [])

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('boligverdi-theme', next)
    } catch {
      // localStorage kan være blokkert — ignorer
    }
  }

  // Unngå hydration-mismatch: render nøytralt før mount
  if (!mounted) {
    return (
      <button
        className="theme-toggle"
        aria-label="Bytt tema"
        aria-pressed={false}
        type="button"
      >
        <span className="theme-toggle-icon" aria-hidden />
      </button>
    )
  }

  const isLight = theme === 'light'
  return (
    <button
      className="theme-toggle"
      aria-label={isLight ? 'Bytt til mørkt tema' : 'Bytt til lyst tema'}
      aria-pressed={isLight}
      onClick={toggle}
      type="button"
      title={isLight ? 'Lys · klikk for mørk' : 'Mørk · klikk for lys'}
    >
      {isLight ? (
        // Sol-ikon
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Måne-ikon
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
