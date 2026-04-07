import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { GlassCard } from '../components/GlassCard'
import { BookOpen, Clock, CheckCircle, XCircle, AlertCircle, FileText, Play } from 'lucide-react'

export const MyRegistrations: React.FC = () => {
  const { data: registrations, isLoading, error } = useQuery({
    queryKey: ['userRegistrations'],
    queryFn: () => api.getUserRegistrations(),
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <FileText className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">My Registrations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View your course registrations</p>
        </div>
        <Link to="/courses" className="btn-primary">
          Browse Courses
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          Failed to load registrations. Please try again.
        </div>
      )}

      {!isLoading && registrations && registrations.length === 0 && (
        <GlassCard className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold dark:text-white mb-2">No Registrations Yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start by browsing our courses and registering for one.
          </p>
          <Link to="/courses" className="btn-primary">
            Browse Courses
          </Link>
        </GlassCard>
      )}

      {!isLoading && registrations && registrations.length > 0 && (
        <div className="space-y-4">
          {registrations.map((reg: any) => (
            <GlassCard key={reg.id} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-semibold dark:text-white text-lg">{reg.course_title}</h3>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full flex items-center gap-1 ${getStatusBadge(reg.status)}`}>
                    {getStatusIcon(reg.status)}
                    {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {reg.created_at ? new Date(reg.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Amount: ₹{reg.amount}
                  </span>
                </div>

                {reg.status === 'rejected' && reg.rejection_reason && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    <strong>Reason:</strong> {reg.rejection_reason}
                  </div>
                )}

                {reg.status === 'approved' && (
                  <Link
                    to={`/watch/${reg.course_id}`}
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <Play className="w-4 h-4" />
                    Access Course
                  </Link>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
