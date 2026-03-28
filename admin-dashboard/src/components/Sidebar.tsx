import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Users, Settings, LogOut } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../context/AuthContext'

export const Sidebar: React.FC = () => {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  
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

  return (
    <aside className="w-64 h-screen glass border-r border-primary/10 sticky top-0 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold dark:text-white">
          Admin<span className="text-primary">Panel</span>
        </h1>
        {user && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user.name}
          </p>
        )}
      </div>

      <nav className="flex-1 px-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-300 ${
                isActive
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-primary/10'
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
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
        <ThemeToggle />
      </div>
    </aside>
  )
}
