import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Users, Settings, LogOut, X } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { useThemeStore } from '../store/themeStore'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const { isDark } = useThemeStore()
  
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/registrations', icon: Users, label: 'Registrations' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (onClose) onClose()
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - desktop static, mobile drawer */}
      <aside className={`
        fixed md:sticky z-50 top-0 left-0 h-screen
        w-64 glass border-r border-gray-200 dark:border-gray-800
        flex flex-col
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <img src={isDark ? '/trinity-logo-dark.png' : '/trinity-logo-light.png'} alt="Trinity" className="h-10" />
          <button 
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 dark:text-white" />
          </button>
        </div>
        
        {user && (
          <div className="px-6 pb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {user.name}
            </p>
          </div>
        )}

        <nav className="flex-1 px-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-300 ${
                  isActive
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 space-y-3">
          <button
            onClick={() => {
              handleLogout()
              if (onClose) onClose()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
          <ThemeToggle />
        </div>
      </aside>
    </>
  )
}