import React from 'react'
import { useThemeStore } from '../store/themeStore'
import { Moon, Sun } from 'lucide-react'

export const ThemeToggle: React.FC = () => {
  const { isDark, toggle } = useThemeStore()

  return (
    <button
      onClick={toggle}
      className="p-3 rounded-full glass glass-hover transition-all duration-300"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-white" />
      ) : (
        <Moon className="w-5 h-5 text-black" />
      )}
    </button>
  )
}