import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useThemeStore } from '../store/themeStore'
import { api } from '../lib/api'
import { 
  Play, Clock, BookOpen, LogOut, Menu, X, Home, 
  User, CheckCircle, Clock3, XCircle, Search, Sun, Moon,
  Video, Settings
} from 'lucide-react'

type Tab = 'courses' | 'registrations'

export const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useThemeStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('courses')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['userCourses'],
    queryFn: api.getUserCourses,
  })

  const { data: registrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ['userRegistrations'],
    queryFn: api.getUserRegistrations,
  })

  const filteredCourses = courses?.filter((course: any) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCourseClick = (courseId: string) => {
    navigate(`/course/${courseId}`)
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock3 className="w-4 h-4 text-yellow-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {sidebarOpen ? <X className="w-6 h-6 dark:text-white" /> : <Menu className="w-6 h-6 dark:text-white" />}
            </button>
            <h1 className="text-xl font-bold text-red-600">CourseHub</h1>
          </div>

          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="w-full px-4 py-2 pl-10 rounded-full bg-gray-100 dark:bg-gray-800 dark:text-white border-none focus:ring-2 focus:ring-primary"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isDark ? <Sun className="w-5 h-5 dark:text-white" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              className="w-full px-4 py-2 pl-10 rounded-full bg-gray-100 dark:bg-gray-800 dark:text-white border-none"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 top-16 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:top-0 md:h-auto md:min-h-[calc(100vh-64px)] md:flex md:flex-col`}>
          <nav className="p-4 space-y-2 flex-1 flex flex-col">
            <button
              onClick={() => { setActiveTab('courses'); navigate('/'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'courses' ? 'bg-primary text-white' : 'dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>
            <button
              onClick={() => { setActiveTab('courses'); navigate('/'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'courses' ? 'bg-primary text-white' : 'dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <Video className="w-5 h-5" />
              <span>My Courses</span>
            </button>
            <button
              onClick={() => { setActiveTab('registrations'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'registrations' ? 'bg-primary text-white' : 'dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <User className="w-5 h-5" />
              <span>Registrations</span>
            </button>
            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-30 bg-black/50 md:hidden top-16"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto w-full bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
          {activeTab === 'courses' && (
            <>
              <h2 className="text-2xl font-bold mb-6 dark:text-white">My Courses</h2>
              
              {coursesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton h-48 rounded-xl" />
                  ))}
                </div>
              ) : filteredCourses && filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredCourses.map((course: any) => (
                    <div
                      key={course._id}
                      onClick={() => handleCourseClick(course._id)}
                      className="bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden border border-gray-200 dark:border-gray-800"
                    >
                      <div className="relative">
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="w-full h-32 object-cover"
                        />
                        {course.video_type === 'video' && course.videos?.length > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-10 h-10 text-white" />
                          </div>
                        )}
                        {course.videos?.length > 0 && (
                          <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                            {course.videos.length} videos
                          </span>
                        )}
                        <span className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${
                          course.course_type === 'live' 
                            ? 'bg-red-500 text-white' 
                            : 'bg-blue-500 text-white'
                        }`}>
                          {course.course_type === 'live' ? 'Live' : 'Recorded'}
                        </span>
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold dark:text-white text-sm line-clamp-2">{course.title}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-2">
                          {course.description}
                        </p>
                        {course.course_type === 'live' && course.start_date && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{course.start_date}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Video className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    No courses yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    Your approved courses will appear here
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'registrations' && (
            <>
              <h2 className="text-2xl font-bold mb-6 dark:text-white">My Registrations</h2>
              
              {registrationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-20 rounded-xl" />
                  ))}
                </div>
              ) : registrations && registrations.length > 0 ? (
                <div className="space-y-3">
                  {registrations.map((reg: any) => (
                    <div
                      key={reg._id}
                      className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold dark:text-white truncate">{reg.course_title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Amount: ₹{reg.amount}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(reg.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(reg.status)}`}>
                        {getStatusIcon(reg.status)}
                        <span className="capitalize">{reg.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <User className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    No registrations
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    Your registration history will appear here
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
