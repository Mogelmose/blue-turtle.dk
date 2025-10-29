'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    // Initialize from DOM or storage
    const root = document.documentElement
    const stored = localStorage.getItem('theme')
    const current = stored || (root.classList.contains('light') ? 'light' : 'dark')
    setTheme(current)
  }, [])

  const toggle = () => {
    const root = document.documentElement
    const next = theme === 'dark' ? 'light' : 'dark'
    root.classList.remove('light', 'dark')
    root.classList.add(next)
    localStorage.setItem('theme', next)
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-text hover:bg-bg-light"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className="h-3 w-3 rounded-full"
            style={{ backgroundColor: theme === 'dark' ? 'oklch(0.76 0.11 237)' : 'oklch(0.4 0.11 237)' }} />
      <span className="text-sm">{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
