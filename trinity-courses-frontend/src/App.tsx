import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Courses } from './pages/Courses'
import { Registrations } from './pages/Registrations'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { UserDashboard } from './pages/UserDashboard'
import { VideoPlayer } from './pages/VideoPlayer'
import { CourseDetail } from './pages/CourseDetail'
import { MyRegistrations } from './pages/MyRegistrations'
import { Recommendations } from './pages/Recommendations'
import { Inbox } from './pages/Inbox'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useThemeStore } from './store/themeStore'
import { ToastContainer } from './components/Toast'
import { Menu } from 'lucide-react'

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
        <Route path="/signup" element={<Signup />} />
        <Route path="/course/:courseId" element={<CourseDetail />} />
        <Route path="/watch/:courseId" element={<VideoPlayer />} />
        <Route path="/my-registrations" element={<MyRegistrations />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </div>
  )
}

const MainLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isDark } = useThemeStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black dark:border-white"></div>
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
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 z-30 glass border-b border-gray-200 dark:border-gray-800 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="w-6 h-6 dark:text-white" />
            </button>
            <img 
              src={isDark ? '/trinity-logo-dark.png' : '/trinity-logo-light.png'} 
              alt="Trinity" 
              className="h-8" 
            />
            <div className="w-10" />
          </div>
        </header>

        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 bg-gray-50 dark:bg-gray-950 overflow-auto min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/registrations" element={<Registrations />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/inbox" element={<Inbox />} />
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
        <ToastContainer />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App