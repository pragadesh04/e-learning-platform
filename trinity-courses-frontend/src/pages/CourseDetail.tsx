import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, BookOpen, Clock, Users, Play, CheckCircle, XCircle, Upload, BadgeCheck, AlertCircle, ArrowRight, Loader2, Video, ExternalLink } from 'lucide-react'

export const CourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerStep, setRegisterStep] = useState(1)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [registerError, setRegisterError] = useState('')
  const [registerSuccess, setRegisterSuccess] = useState(false)

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => api.getCourseById(courseId!),
    enabled: !!courseId
  })

  const { data: myRegistrations } = useQuery({
    queryKey: ['userRegistrations'],
    queryFn: () => api.getUserRegistrations(),
  })

  const myRegistration = myRegistrations?.find((reg: any) => reg.course_id === courseId)
  const isRegistered = myRegistration?.status === 'pending' || myRegistration?.status === 'approved'

  const { data: qrData } = useQuery({
    queryKey: ['qr', courseId],
    queryFn: () => api.getCourseQR(courseId!),
    enabled: !!courseId && showRegisterModal && !isRegistered
  })

  const registrationMutation = useMutation({
    mutationFn: () => {
      if (!screenshot) throw new Error('Please upload payment screenshot')
      if (!city || !city.trim()) throw new Error('Please enter your city name')
      return api.registerCourse(courseId!, name, city.trim(), screenshot)
    },
    onSuccess: () => {
      setRegisterSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['userRegistrations'] })
    },
    onError: (err: any) => {
      setRegisterError(err.message || 'Registration failed')
    }
  })

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setCity(user.city || '')
    }
  }, [user])

  useEffect(() => {
    if (showRegisterModal) {
      setRegisterStep(1)
      setRegisterError('')
    }
  }, [showRegisterModal])

  const formatDuration = (hours: number | null | undefined) => {
    if (!hours) return null
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0) return `${m} min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const isSessionPast = (session: any) => {
    if (!session.date) return false
    const sessionDateTime = new Date(`${session.date}T${session.time || '00:00'}`)
    const sessionEndTime = new Date(sessionDateTime.getTime() + (course.duration || 0) * 60 * 60 * 1000)
    return new Date() > sessionEndTime
  }

  const formatSessionDateTime = (session: any) => {
    if (!session.date) return 'Date TBD'
    const date = new Date(session.date)
    const formattedDate = date.toLocaleDateString('en-IN', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
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

  const handleNextStep = () => {
    if (registerStep === 1) {
      setRegisterStep(2)
    } else if (registerStep === 2) {
      if (!city || !city.trim()) {
        setRegisterError('Please enter your city name')
        return
      }
      setRegisterError('')
      setRegisterStep(3)
    }
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterError('')
    registrationMutation.mutate()
  }

  const handleCloseModal = () => {
    setShowRegisterModal(false)
    setRegisterSuccess(false)
    setRegisterError('')
    setScreenshot(null)
    setRegisterStep(1)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: <CheckCircle className="w-4 h-4" />, label: 'Approved' }
      case 'pending':
        return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: <AlertCircle className="w-4 h-4" />, label: 'Pending Approval' }
      case 'rejected':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: <XCircle className="w-4 h-4" />, label: 'Rejected' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: null, label: status }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Course not found</p>
          <button onClick={() => navigate(-1)} className="btn-primary mt-4">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <div className="relative h-72 md:h-96">
        <img
          src={course.image_url || 'https://placehold.co/1200x400/transparent/white?text=Course&font=Poppins'}
          alt={course.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              course.registration_open 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
              {course.registration_open ? 'Registration Open' : 'Registration Closed'}
            </span>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-black dark:bg-white text-white dark:text-black">
              {course.course_type === 'live' ? 'Live Course' : 'Recorded Course'}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{course.title}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold dark:text-white mb-4">About This Course</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{course.description}</p>
            </div>

            {/* Course Details */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold dark:text-white mb-4">Course Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <Clock className="w-5 h-5 text-black dark:text-white mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="font-semibold dark:text-white">
                    {course.course_type === 'live' 
                      ? `${course.sessions || 0} Sessions` 
                      : formatDuration(course.duration) || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <Users className="w-5 h-5 text-black dark:text-white mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enrolled</p>
                  <p className="font-semibold dark:text-white">{course.registration_count || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <Play className="w-5 h-5 text-black dark:text-white mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                  <p className="font-semibold dark:text-white capitalize">{course.course_type}</p>
                </div>
                {course.duration && course.course_type === 'live' && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Clock className="w-5 h-5 text-black dark:text-white mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Per Session</p>
                    <p className="font-semibold dark:text-white">{formatDuration(course.duration)}</p>
                  </div>
                )}
              </div>

              {/* Access Duration Options for Recorded Courses */}
              {course.course_type === 'recorded' && course.access_durations && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Available Access Options</h3>
                  <div className="flex flex-wrap gap-2">
                    {course.access_durations.three_months > 0 && (
                      <span className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
                        <span className="font-medium dark:text-white">3 Months</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">₹{course.access_durations.three_months}</span>
                      </span>
                    )}
                    {course.access_durations.six_months > 0 && (
                      <span className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
                        <span className="font-medium dark:text-white">6 Months</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">₹{course.access_durations.six_months}</span>
                      </span>
                    )}
                    {course.access_durations.lifetime > 0 && (
                      <span className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
                        <span className="font-medium dark:text-white">Lifetime</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">₹{course.access_durations.lifetime}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Session Schedule for Live Courses (Public View) */}
            {course.course_type === 'live' && course.session_schedules && course.session_schedules.length > 0 && !isRegistered && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="text-xl font-bold dark:text-white mb-4">Session Schedule</h2>
                <div className="space-y-3">
                  {course.session_schedules.map((session: any) => (
                    <div key={session.session_number} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center">
                          <span className="text-sm font-bold text-white dark:text-black">{session.session_number}</span>
                        </div>
                        <div>
                          <p className="font-medium dark:text-white">Session {session.session_number}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatSessionDateTime(session)}
                          </p>
                        </div>
                      </div>
                      {isSessionPast(session) ? (
                        <span className="text-sm text-gray-400">Ended</span>
                      ) : session.meeting_link ? (
                        <span className="text-sm text-gray-500 dark:text-gray-400">Link available after enrollment</span>
                      ) : (
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">Link coming soon</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sessions for Enrolled Users */}
            {course.course_type === 'live' && course.session_schedules && course.session_schedules.length > 0 && isRegistered && myRegistration?.status === 'approved' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="text-xl font-bold dark:text-white mb-4">Your Sessions</h2>
                <div className="space-y-3">
                  {course.session_schedules.map((session: any) => {
                    const past = isSessionPast(session)
                    const hasLink = !!session.meeting_link
                    return (
                      <div 
                        key={session.session_number} 
                        className={`flex items-center justify-between p-4 rounded-xl ${
                          past 
                            ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60' 
                            : 'bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            past 
                              ? 'bg-gray-300 dark:bg-gray-700' 
                              : 'bg-black dark:bg-white'
                          }`}>
                            <span className={`text-lg font-bold ${
                              past 
                                ? 'text-gray-500 dark:text-gray-400' 
                                : 'text-white dark:text-black'
                            }`}>
                              {session.session_number}
                            </span>
                          </div>
                          <div>
                            <p className={`font-medium ${past ? 'text-gray-500 dark:text-gray-400' : 'dark:text-white'}`}>
                              Session {session.session_number}
                            </p>
                            <p className={`text-sm ${past ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {formatSessionDateTime(session)}
                            </p>
                          </div>
                        </div>
                        <div>
                          {past ? (
                            <span className="text-sm text-gray-400">Session Ended</span>
                          ) : hasLink ? (
                            <button
                              onClick={() => navigate(`/course/${courseId}/session/${session.session_number}`)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                            >
                              Join Class
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="text-right">
                              <span className="text-sm text-yellow-600 dark:text-yellow-400 block">Link coming soon</span>
                              <span className="text-xs text-gray-400">Will be added 1 hour before</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* What's Included */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold dark:text-white mb-4">What's Included</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-black dark:text-white" />
                  </div>
                  <div>
                    <p className="font-medium dark:text-white">
                      {course.course_type === 'live' ? 'Live Sessions' : 'Video Content'}
                    </p>
                    <p className="text-xs text-gray-500">Full access</p>
                  </div>
                </div>
                {false && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                    <BadgeCheck className="w-5 h-5 text-black dark:text-white" />
                  </div>
                  <div>
                    <p className="font-medium dark:text-white">Certificate</p>
                    <p className="text-xs text-gray-500">On completion</p>
                  </div>
                </div>
                )}
                {course.sessions && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                      <Play className="w-5 h-5 text-black dark:text-white" />
                    </div>
                    <div>
                      <p className="font-medium dark:text-white">{course.sessions} Sessions</p>
                      <p className="text-xs text-gray-500">Interactive learning</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-black dark:text-white" />
                  </div>
                  <div>
                    <p className="font-medium dark:text-white">Community</p>
                    <p className="text-xs text-gray-500">Join our group</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Price Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Course Fee</p>
                <p className="text-4xl font-bold text-black dark:text-white">₹{course.fee}</p>
                
                {isRegistered ? (
                  <div className={`mt-4 p-4 rounded-xl ${getStatusBadge(myRegistration.status).bg}`}>
                    <div className={`flex items-center gap-2 ${getStatusBadge(myRegistration.status).text}`}>
                      {getStatusBadge(myRegistration.status).icon}
                      <span className="font-medium">{getStatusBadge(myRegistration.status).label}</span>
                    </div>
                    {myRegistration.status === 'approved' && (
                      <button
                        onClick={() => navigate(`/watch/${courseId}`)}
                        className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
                      >
                        {course.course_type === 'live' ? (
                          <>
                            <Video className="w-5 h-5" />
                            View Sessions
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5" />
                            Start Learning
                          </>
                        )}
                      </button>
                    )}
                    {myRegistration.status === 'pending' && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Your registration is being reviewed. You'll be notified once approved.
                      </p>
                    )}
                  </div>
                ) : course.registration_open ? (
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="btn-primary w-full mt-4"
                  >
                    Register Now
                  </button>
                ) : (
                  <button disabled className="btn-secondary w-full mt-4 opacity-50 cursor-not-allowed">
                    Registration Closed
                  </button>
                )}
              </div>

              {/* Registration Status */}
              {isRegistered && myRegistration.status === 'pending' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">Pending Approval</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Your registration is under review. This usually takes 24-48 hours.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal - Step Wizard */}
      {showRegisterModal && !isRegistered && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 md:p-6 w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold dark:text-white">Register for Course</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    registerStep >= step 
                      ? 'bg-black dark:bg-white text-white dark:text-black' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {registerStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-8 h-1 mx-1 rounded-full transition-all ${
                      registerStep > step 
                        ? 'bg-black dark:bg-white' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Labels */}
            <div className="flex justify-center gap-4 mb-5 text-xs text-gray-500 dark:text-gray-400">
              <span className={registerStep >= 1 ? 'text-black dark:text-white font-medium' : ''}>1. Payment</span>
              <span className={registerStep >= 2 ? 'text-black dark:text-white font-medium' : ''}>2. Details</span>
              <span className={registerStep >= 3 ? 'text-black dark:text-white font-medium' : ''}>3. Upload</span>
            </div>

            {registerSuccess ? (
              /* Success State */
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold dark:text-white mb-2">Registration Submitted!</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-5">
                  Your registration is pending approval. We'll notify you once approved.
                </p>
                <button
                  onClick={() => {
                    setShowRegisterModal(false)
                    navigate('/my-registrations')
                  }}
                  className="btn-primary w-full"
                >
                  View My Registrations
                </button>
              </div>
            ) : (
              <>
                {/* Step 1: Payment Info */}
                {registerStep === 1 && (
                  <div className="space-y-4">
                    {!qrData ? (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-center">
                        <div className="animate-pulse">
                          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32 mx-auto mb-3"></div>
                          <div className="w-40 h-40 bg-gray-300 dark:bg-gray-600 rounded-xl mx-auto mb-3"></div>
                          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-40 mx-auto"></div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Loading payment details...</p>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-center">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Scan QR code to pay
                          </p>
                          <p className="text-3xl font-bold text-black dark:text-white mb-3">₹{qrData.amount}</p>
                          <img 
                            src={qrData.qr_code} 
                            alt="Payment QR Code" 
                            className="w-40 h-40 mx-auto rounded-xl"
                          />
                          <p className="text-xs text-gray-500 mt-3">
                            UPI ID: <span className="font-mono">{qrData.upi_id}</span>
                          </p>
                        </div>

                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300">
                          <p className="font-medium mb-1">📱 How to Pay:</p>
                          <ol className="list-decimal list-inside space-y-1 text-blue-600 dark:text-blue-400">
                            <li>Open your UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                            <li>Scan the QR code above</li>
                            <li>Pay ₹{qrData.amount}</li>
                            <li>Take a screenshot of payment confirmation</li>
                          </ol>
                        </div>
                      </>
                    )}

                    {qrData && (
                      <button
                        onClick={handleNextStep}
                        className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                      >
                        Done, Next <ArrowRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Step 2: Details */}
                {registerStep === 2 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                      <p className="text-gray-500 dark:text-gray-400 mb-2">Your Details</p>
                      <p className="font-medium dark:text-white">{name}</p>
                      <p className="text-xs text-gray-400">Name from your account</p>
                      {city && (
                        <>
                          <p className="font-medium dark:text-white mt-2">{city}</p>
                          <p className="text-xs text-gray-400">City from your account</p>
                        </>
                      )}
                    </div>

                    {!city && (
                      <div>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => {
                            setCity(e.target.value)
                            setRegisterError('')
                          }}
                          className="input-field"
                          placeholder="Enter your city name"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">City is required for course certificates</p>
                      </div>
                    )}

                    {registerError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                        {registerError}
                      </div>
                    )}

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-sm text-yellow-700 dark:text-yellow-300">
                      💡 Tip: You can close this popup and come back later to upload the screenshot
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setRegisterStep(1)}
                        className="btn-secondary flex-1 py-3"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleNextStep}
                        className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                      >
                        Next <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Upload Screenshot */}
                {registerStep === 3 && (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Upload your payment screenshot to complete registration
                      </p>
                    </div>

                    <div>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            setScreenshot(e.target.files?.[0] || null)
                            setRegisterError('')
                          }}
                          className="hidden"
                          id="screenshot-upload"
                        />
                        <label htmlFor="screenshot-upload" className="cursor-pointer">
                          {screenshot ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                              </div>
                              <div>
                                <p className="font-medium dark:text-white">{screenshot.name}</p>
                                <p className="text-xs text-gray-500">Click to change</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="w-10 h-10 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Tap to upload payment screenshot
                                </p>
                                <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 10MB</p>
                              </div>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    {registerError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                        {registerError}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setRegisterStep(2)}
                        disabled={registrationMutation.isPending}
                        className="btn-secondary flex-1 py-3"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleRegister}
                        disabled={registrationMutation.isPending || !screenshot}
                        className="btn-primary flex-1 py-3"
                      >
                        {registrationMutation.isPending ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Submitting...
                          </span>
                        ) : (
                          'Register Now'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
