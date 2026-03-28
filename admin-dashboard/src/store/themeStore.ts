import { create } from 'zustand'

const getInitialTheme = () => {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem('theme')
  if (stored) {
    return stored === 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const initializeTheme = () => {
  const isDark = getInitialTheme()
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  return isDark
}

interface ThemeState {
  isDark: boolean
  toggle: () => void
  initialized: boolean
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: initializeTheme(),
  initialized: true,
  toggle: () => set((state) => {
    const newTheme = !state.isDark
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    if (newTheme) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    return { isDark: newTheme }
  }),
}))
