import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { ArrowLeft, Video, Calendar, Clock, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'

export const LiveSession: React.FC = () => {
  const { courseId, sessionNumber } = useParams<{ courseId: string; sessionNumber: string }>()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState<string>('')

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => api.getCourseById(courseId!),
    enabled: !!courseId
  })

  const { data: registrations } = useQuery({
    queryKey: ['userRegistrations'],
    queryFn: api.getUserRegistrations,
  })

  const sessionNum = parseInt(sessionNumber || '0')
  const session = course?.session_schedules?.find((s: any) => s.session_number === sessionNum)
  
  const myRegistration = registrations?.find((reg: any) => reg.course_id === courseId)
  const isEnrolled = myRegistration?.status === 'approved'

  useEffect(() => {
    if (!course || !session?.date || !session?.time) return

    const updateCountdown = () => {
      const sessionDateTime = new Date(`${session.date}T${session.time}`)
      const now = new Date()
      const diff = sessionDateTime.getTime() - now.getTime()

      if (diff <= 0) {
        setCountdown('Session starting...')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setCountdown(`${minutes}m ${seconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [session])

  const getSessionStatus = () => {
    if (!session?.date || !session?.time) {
      return { status: 'unknown', label: 'Time TBD', className: 'text-gray-500' }
    }

    const sessionDateTime = new Date(`${session.date}T${session.time}`)
    const sessionEndTime = new Date(sessionDateTime.getTime() + (course?.duration || 0) * 60 * 60 * 1000)
    const now = new Date()

    if (now > sessionEndTime) {
      return { status: 'ended', label: 'Session Ended', className: 'text-gray-500' }
    }

    if (now >= sessionDateTime) {
      return { status: 'live', label: 'Live Now', className: 'text-green-500' }
    }

    return { status: 'upcoming', label: countdown || 'Starting soon', className: 'text-yellow-500' }
  }

  const formatSessionDateTime = () => {
    if (!session?.date) return 'Date TBD'
    const date = new Date(session.date)
    const formattedDate = date.toLocaleDateString('en-IN', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    })
    const formattedTime = session.time 
      ? new Date(`2000-01-01T${session.time}`).toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      : 'Time TBD'
    return `${formattedDate} at ${formattedTime}`
  }

  const handleJoinClass = () => {
    if (session?.meeting_link) {
      window.open(session.meeting_link, '_blank', 'noopener,noreferrer')
    }
  }

  if (courseLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl dark:text-white mb-4">Course not found</h2>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl dark:text-white mb-4">Session not found</h2>
          <button onClick={() => navigate(`/course/${courseId}`)} className="btn-primary">
            Back to Course
          </button>
        </div>
      </div>
    )
  }

  if (!isEnrolled) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You need to be enrolled in this course to access live sessions.
          </p>
          <button onClick={() => navigate(`/course/${courseId}`)} className="btn-primary">
            View Course
          </button>
        </div>
      </div>
    )
  }

  const sessionStatus = getSessionStatus()
  const hasLink = !!session.meeting_link
  const isEnded = sessionStatus.status === 'ended'

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <button
          onClick={() => navigate(`/course/${courseId}`)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Course</span>
        </button>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="relative h-32 bg-gradient-to-r from-red-500 to-red-600">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <Video className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-full">
                Live Session
              </span>
              <span className={`text-sm font-medium ${sessionStatus.className}`}>
                {sessionStatus.status === 'ended' && <CheckCircle className="w-4 h-4 inline mr-1" />}
                {sessionStatus.label}
              </span>
            </div>

            <h1 className="text-2xl font-bold dark:text-white mb-2">{course.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Session {sessionNum}</p>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-black dark:text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                  <p className="font-medium dark:text-white">{formatSessionDateTime()}</p>
                </div>
              </div>

              {course.duration && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-black dark:text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                    <p className="font-medium dark:text-white">
                      {course.duration} {course.duration === 1 ? 'hour' : 'hours'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isEnded ? (
              <div className="text-center p-6 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400">This session has ended.</p>
              </div>
            ) : hasLink ? (
              <button
                onClick={handleJoinClass}
                className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Join Class
              </button>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-center">
                <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <p className="text-yellow-700 dark:text-yellow-300 font-medium">
                  Link will be added 1 hour before the class begins
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  Please check back later
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
