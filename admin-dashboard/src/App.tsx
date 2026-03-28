import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Courses } from './pages/Courses'
import { Registrations } from './pages/Registrations'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { UserDashboard } from './pages/UserDashboard'
import { VideoPlayer } from './pages/VideoPlayer'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useThemeStore } from './store/themeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

const AppContent: React.FC = () => {
  const { isDark } = useThemeStore()

  return (
    <div className={isDark ? 'dark' : ''}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/course/:courseId" element={<VideoPlayer />} />
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </div>
  )
}

const MainLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { isDark } = useThemeStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const isAdmin = user?.is_admin

  if (isAdmin) {
    return (
      <div className="flex min-h-screen bg-white dark:bg-black transition-colors duration-300">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 bg-gradient-to-br from-white to-pink-50 dark:from-black dark:to-gray-900 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/registrations" element={<Registrations />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    )
  }

  return <UserDashboard />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
