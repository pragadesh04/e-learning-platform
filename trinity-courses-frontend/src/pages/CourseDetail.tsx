import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { ArrowLeft, BookOpen, Clock, Users, Play, Calendar, CheckCircle, XCircle, Upload, BadgeCheck, AlertCircle } from 'lucide-react'

export const CourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [mobile, setMobile] = useState('')
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
      return api.registerCourse(courseId!, name, address, mobile, screenshot)
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
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      setName(user.name || '')
    }
  }, [])

  const formatDuration = (hours: number | null | undefined) => {
    if (!hours) return null
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0) return `${m} min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterError('')
    registrationMutation.mutate()
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
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-500 text-white">
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
                      ? `${course.sessions} Sessions` 
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
                {course.start_date && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Calendar className="w-5 h-5 text-black dark:text-white mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                    <p className="font-semibold dark:text-white">{course.start_date}</p>
                  </div>
                )}
                {course.start_time && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Clock className="w-5 h-5 text-black dark:text-white mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Start Time</p>
                    <p className="font-semibold dark:text-white">{course.start_time}</p>
                  </div>
                )}
                {course.sessions && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Play className="w-5 h-5 text-black dark:text-white mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sessions</p>
                    <p className="font-semibold dark:text-white">{course.sessions}</p>
                  </div>
                )}
              </div>
            </div>

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
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                    <BadgeCheck className="w-5 h-5 text-black dark:text-white" />
                  </div>
                  <div>
                    <p className="font-medium dark:text-white">Certificate</p>
                    <p className="text-xs text-gray-500">On completion</p>
                  </div>
                </div>
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
                        className="btn-primary w-full mt-3"
                      >
                        Start Learning
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

      {/* Registration Modal */}
      {showRegisterModal && !isRegistered && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold dark:text-white">Register for Course</h2>
              <button
                onClick={() => {
                  setShowRegisterModal(false)
                  setRegisterSuccess(false)
                  setRegisterError('')
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {registerSuccess ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-xl font-bold dark:text-white mb-2">Registration Submitted!</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your registration is pending approval. We'll notify you once approved.
                </p>
                <button
                  onClick={() => {
                    setShowRegisterModal(false)
                    navigate('/my-registrations')
                  }}
                  className="btn-primary"
                >
                  View My Registrations
                </button>
              </div>
            ) : (
              <>
                {qrData && (
                  <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Scan QR code to pay <span className="font-bold text-black dark:text-white">₹{qrData.amount}</span>
                    </p>
                    <img 
                      src={qrData.qr_code} 
                      alt="Payment QR Code" 
                      className="w-48 h-48 mx-auto rounded-xl"
                    />
                    <p className="text-xs text-gray-500 mt-3">
                      UPI ID: <span className="font-mono">{qrData.upi_id}</span>
                    </p>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  {registerError && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                      {registerError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Address
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="input-field"
                      placeholder="Enter your address"
                      rows={2}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="input-field"
                      placeholder="Enter your mobile number"
                      pattern="[0-9]{10,}"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Screenshot
                    </label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                        className="hidden"
                        id="screenshot-upload"
                      />
                      <label htmlFor="screenshot-upload" className="cursor-pointer">
                        {screenshot ? (
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium dark:text-white">{screenshot.name}</p>
                              <p className="text-xs text-gray-500">Click to change</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-10 h-10 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Click to upload payment screenshot
                              </p>
                              <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 10MB</p>
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={registrationMutation.isPending || !screenshot}
                    className="btn-primary w-full py-4"
                  >
                    {registrationMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        Submitting...
                      </span>
                    ) : (
                      'Submit Registration'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
