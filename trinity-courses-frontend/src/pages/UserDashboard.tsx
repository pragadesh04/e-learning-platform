import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useThemeStore } from '../store/themeStore'
import { GlassCard } from '../components/GlassCard'
import { api } from '../lib/api'
import { 
  Play, Clock, LogOut, Menu, X, Home, 
  CheckCircle, Clock3, XCircle, Search, Sun, Moon,
  Video, Sparkles, Compass, FileText, ArrowRight, Bell,
  ChevronLeft, ChevronRight,
  Phone, MapPin, Instagram, Facebook, Youtube, MessageCircle
} from 'lucide-react'

type Tab = 'home' | 'courses' | 'mycourses' | 'registrations'

interface GalleryCarouselProps {
  images: any[]
}

const GalleryCarousel: React.FC<GalleryCarouselProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemsToShow = 3

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, images.length - itemsToShow)
        return prev >= maxIndex ? 0 : prev + 1
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [images.length])

  const goToPrev = () => {
    setCurrentIndex((prev) => {
      const maxIndex = Math.max(0, images.length - itemsToShow)
      return prev <= 0 ? maxIndex : prev - 1
    })
  }

  const goToNext = () => {
    setCurrentIndex((prev) => {
      const maxIndex = Math.max(0, images.length - itemsToShow)
      return prev >= maxIndex ? 0 : prev + 1
    })
  }

  if (images.length === 0) return null

  return (
    <div className="relative group -mx-4 md:-mx-8">
      <div className="overflow-hidden">
        <div 
          ref={containerRef}
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * (100 / itemsToShow)}%)` }}
        >
          {images.map((img: any) => (
            <div key={img.id} className="flex-shrink-0 w-1/3">
              <img 
                src={img.image} 
                alt={img.title} 
                className="w-full h-48 md:h-[60vh] object-contain"
              />
            </div>
          ))}
        </div>
      </div>
      
      {images.length > itemsToShow && (
        <>
          <button 
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50 z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50 z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}

export const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useThemeStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: myCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['userCourses'],
    queryFn: api.getUserCourses,
  })

  const { data: registrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ['userRegistrations'],
    queryFn: api.getUserRegistrations,
  })

  const { data: recommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: api.getRecommendations,
  })

  const { data: allCourses, isLoading: allCoursesLoading } = useQuery({
    queryKey: ['allCourses'],
    queryFn: () => api.getCourses(),
    enabled: activeTab === 'courses'
  })

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['searchCourses', debouncedQuery],
    queryFn: () => api.searchCourses(debouncedQuery),
    enabled: activeTab === 'courses' && debouncedQuery.length >= 2
  })

  const { data: testimonials, isLoading: testimonialsLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: api.getTestimonials,
  })

  const { data: gallery } = useQuery({
    queryKey: ['gallery'],
    queryFn: api.getGallery,
  })

  const { data: socialLinks } = useQuery({
    queryKey: ['socialLinks'],
    queryFn: api.getSocialLinks,
  })

  const heroBanner = gallery?.hero_banner?.image_url || '/images/hero-banner.jpg'
  const founderImage = gallery?.founder?.image_url || '/images/founder.jpg'
  const beforeImage = gallery?.before?.image_url || '/images/before-after/before-1.jpg'
  const afterImage = gallery?.after?.image_url || '/images/before-after/after-1.jpg'
  const galleryItems = (gallery?.gallery || []).map((item: any) => ({
    id: item.id,
    image: item.image_url,
    title: item.title || 'Gallery Item',
    category: item.category
  }))

  const process = [
    { title: 'Measuring', icon: '📏' },
    { title: 'Cutting', icon: '✂️' },
    { title: 'Stitching', icon: '🧵' },
    { title: 'Finishing', icon: '✨' },
  ]

  const displayedCourses = debouncedQuery.length >= 2 ? searchResults : allCourses

  const handleCourseClick = (courseId: string) => {
    navigate(`/course/${courseId}`)
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
        return 'bg-black dark:bg-white text-white dark:text-black'
      case 'pending':
        return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
      case 'rejected':
        return 'bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getApprovedCourses = () => {
    if (!registrations) return []
    return registrations
      .filter((reg: any) => reg.status === 'approved')
      .map((reg: any) => reg.course_id)
  }

  const approvedCourseIds = getApprovedCourses()

  const getStatusBadge = (courseId: string) => {
    const reg = registrations?.find((r: any) => r.course_id === courseId)
    if (!reg) return null
    switch (reg.status) {
      case 'approved':
        return { bg: 'bg-black dark:bg-white', text: 'text-white dark:text-black', label: 'Enrolled', icon: <CheckCircle className="w-3 h-3" /> }
      case 'pending':
        return { bg: 'bg-gray-400 dark:bg-gray-500', text: 'text-white', label: 'Pending', icon: <Clock3 className="w-3 h-3" /> }
      case 'rejected':
        return { bg: 'bg-gray-600 dark:bg-gray-700', text: 'text-gray-300', label: 'Rejected', icon: <XCircle className="w-3 h-3" /> }
      default:
        return null
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div>
            {/* Hero Section */}
            <section className="relative h-64 md:h-80 flex items-center justify-center overflow-hidden rounded-2xl mb-8">
              <div className="absolute inset-0">
                <img src={heroBanner} alt="Hero" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
              </div>
              <div className="relative z-10 text-center text-white px-4">
                <h1 className="text-2xl md:text-4xl font-bold mb-2">Professional Tailoring Courses</h1>
                <p className="text-lg md:text-xl mb-4">Learn Stitching from Experts</p>
                <button 
                  onClick={() => setActiveTab('courses')}
                  className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-medium rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                  View Courses
                </button>
              </div>
            </section>

            {/* Best Work Showcase - Carousel */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4 dark:text-white">Our Best Work</h2>
              
              {galleryItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No gallery images yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(['frock', 'skirt', 'flower'] as const).map((category) => {
                    const categoryImages = galleryItems.filter((img: any) => img.category === category)
                    if (categoryImages.length === 0) return null
                    return (
                      <div key={category}>
                        <h3 className="text-lg font-semibold dark:text-white mb-3 capitalize">
                          {category === 'frock' ? 'Kids Frocks' : category === 'skirt' ? 'Skirts' : 'Fabric Flowers'}
                        </h3>
                        <GalleryCarousel images={categoryImages} />
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Before/After */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4 dark:text-white">Transformation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                  <p className="text-center text-gray-500 dark:text-gray-400 mb-2 text-sm">Before</p>
                  <img src={beforeImage} alt="Before" className="w-full h-48 object-cover rounded-xl" />
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                  <p className="text-center text-gray-500 dark:text-gray-400 mb-2 text-sm">After</p>
                  <img src={afterImage} alt="After" className="w-full h-48 object-cover rounded-xl" />
                </div>
              </div>
            </section>

            {/* Happy Customers */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4 dark:text-white">Happy Customers</h2>
              {testimonialsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : testimonials && testimonials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {testimonials.map((customer: any) => (
                    <div key={customer.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <img 
                          src={customer.image_url || '/images/customers/customer-1.jpg'} 
                          alt={customer.name} 
                          className="w-14 h-14 rounded-full object-cover" 
                        />
                        <div>
                          <p className="text-gray-600 dark:text-gray-300 mb-1 text-sm">"{customer.feedback}"</p>
                          <p className="font-medium dark:text-white">- {customer.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">No testimonials yet</p>
              )}
            </section>

            {/* Founder */}
            <section className="mb-8">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-2xl font-bold mb-4 dark:text-white">Meet Our Founder</h2>
                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <img src={founderImage} alt="Founder" className="w-24 h-24 rounded-full object-cover" />
                    <div className="text-center md:text-left">
                      <h3 className="text-xl font-bold dark:text-white">Trinity</h3>
                      <p className="text-gray-600 dark:text-gray-400">Founder, Trinity Tailoring</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Process */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4 dark:text-white">Our Process</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {process.map((step, idx) => (
                  <div key={idx} className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl text-center">
                    <div className="text-4xl mb-2">{step.icon}</div>
                    <h3 className="font-medium dark:text-white">{step.title}</h3>
                  </div>
                ))}
              </div>
            </section>

            

            {/* View All Courses CTA */}
            <div className="text-center">
              <button
                onClick={() => setActiveTab('courses')}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Compass className="w-5 h-5" />
                Browse All Courses
              </button>
            </div>

            {/* Footer */}
            <footer className="py-8 mt-8">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <img src={isDark ? '/trinity-logo-dark.png' : '/trinity-logo-light.png'} alt="Trinity" className="h-10 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Professional Tailoring Courses</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3 dark:text-white">Quick Links</h4>
                    <div className="space-y-2">
                      <button onClick={() => setActiveTab('home')} className="block text-gray-500 hover:text-black dark:hover:text-white text-sm">Home</button>
                      <button onClick={() => setActiveTab('courses')} className="block text-gray-500 hover:text-black dark:hover:text-white text-sm">Courses</button>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3 dark:text-white">Contact</h4>
                    <div className="space-y-2 text-gray-500 dark:text-gray-400 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>+91 6379403553</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>Tamil Nadu, India</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3 dark:text-white">Follow Us</h4>
                    <div className="flex gap-3">
                      {socialLinks?.instagram && (
                        <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                          <Instagram className="w-5 h-5 cursor-pointer hover:text-black dark:text-gray-400" />
                        </a>
                      )}
                      {socialLinks?.facebook && (
                        <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                          <Facebook className="w-5 h-5 cursor-pointer hover:text-black dark:text-gray-400" />
                        </a>
                      )}
                      {socialLinks?.youtube && (
                        <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer">
                          <Youtube className="w-5 h-5 cursor-pointer hover:text-black dark:text-gray-400" />
                        </a>
                      )}
                      {socialLinks?.whatsapp && (
                        <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="w-5 h-5 cursor-pointer hover:text-black dark:text-gray-400" />
                        </a>
                      )}
                      {!socialLinks?.instagram && !socialLinks?.facebook && !socialLinks?.youtube && !socialLinks?.whatsapp && (
                        <>
                          <Instagram className="w-5 h-5 text-gray-400" />
                          <Facebook className="w-5 h-5 text-gray-400" />
                          <Youtube className="w-5 h-5 text-gray-400" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 mt-6 pt-4 text-center text-gray-500 text-sm">
                  <p>&copy; 2026 Trinity Tailoring. All rights reserved.</p>
                </div>
              </div>
            </footer>
          </div>
        )

      case 'courses':
        return (
          <>
            {/* Recommendations Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-black dark:text-white" />
                  <h2 className="text-2xl font-bold dark:text-white">
                    {recommendations?.type === 'ai_recommendations' ? 'Recommended for You' : 'Popular Courses'}
                  </h2>
                </div>
              </div>
              
              {recommendations?.courses?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {recommendations.courses.map((course: any) => {
                    const isAlreadyRegistered = approvedCourseIds.includes(course.id)
                    return (
                      <div
                        key={course.id}
                        onClick={() => handleCourseClick(course.id)}
                        className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border ${
                          isAlreadyRegistered 
                            ? 'border-gray-400 dark:border-gray-600' 
                            : 'border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={course.image_url || 'https://placehold.co/400x200/transparent/white?text=Course&font=Poppins'}
                            alt={course.title}
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              course.registration_open 
                                ? 'bg-green-500 text-white' 
                                : 'bg-red-500 text-white'
                            }`}>
                              {course.registration_open ? 'Open' : 'Closed'}
                            </span>
                          </div>
                          {isAlreadyRegistered && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Enrolled
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold dark:text-white text-sm line-clamp-2 flex-1">{course.title}</h3>
                            <span className="text-sm font-bold text-black dark:text-white ml-2">₹{course.fee}</span>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-2">
                            {course.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>{course.registration_count || 0} enrolled</span>
                            <span className="capitalize">{course.course_type}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No courses available yet</p>
                </div>
              )}
            </div>

            {/* All Courses */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Compass className="w-6 h-6 text-black dark:text-white" />
                <h2 className="text-2xl font-bold dark:text-white">All Courses</h2>
              </div>
            </div>

            {debouncedQuery.length >= 2 ? searchLoading : allCoursesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-48 rounded-xl" />
                ))}
              </div>
            ) : displayedCourses && displayedCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedCourses.map((course: any) => {
                  const statusBadge = getStatusBadge(course.id)
                  return (
                    <div
                      key={course.id}
                      onClick={() => handleCourseClick(course.id)}
                      className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border ${
                        statusBadge?.bg === 'bg-black dark:bg-white' 
                          ? 'border-gray-400 dark:border-gray-600' 
                          : 'border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={course.image_url || 'https://placehold.co/400x200/transparent/white?text=Course&font=Poppins'}
                          alt={course.title}
                          className="w-full h-32 object-cover"
                        />
                        {statusBadge && (
                          <div className={`absolute top-2 left-2 px-2 py-1 ${statusBadge.bg} ${statusBadge.text} text-xs font-medium rounded-full flex items-center gap-1`}>
                            {statusBadge.icon}
                            {statusBadge.label}
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            course.registration_open 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {course.registration_open ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold dark:text-white text-sm line-clamp-2 flex-1">{course.title}</h3>
                          <span className="text-sm font-bold text-black dark:text-white ml-2">₹{course.fee}</span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <Compass className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No courses found
                </h3>
                <p className="text-gray-500 dark:text-gray-500">
                  Try a different search term
                </p>
              </div>
            )}
          </>
        )

      case 'mycourses':
        return (
          <>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">My Courses</h2>
            
            {coursesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-48 rounded-xl" />
                ))}
              </div>
            ) : myCourses && myCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {myCourses.map((course: any) => (
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
                          : 'bg-gray-500 text-white'
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
                <button
                  onClick={() => setActiveTab('courses')}
                  className="mt-4 btn-primary"
                >
                  Browse Courses
                </button>
              </div>
            )}
          </>
        )

      case 'registrations':
        return (
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
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No registrations
                </h3>
                <p className="text-gray-500 dark:text-gray-500">
                  Your registration history will appear here
                </p>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="mt-4 btn-primary"
                >
                  Browse Courses
                </button>
              </div>
            )}
          </>
        )
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
            <h1 className="text-3xl font-bold text-black dark:text-white">Trinity</h1>
          </div>

          {/* Search toggle button - visible on mobile */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
          >
            <Search className="w-5 h-5 dark:text-white" />
          </button>

          {/* Desktop Search - always visible */}
          <div className="hidden md:block flex-1 max-w-xl mx-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="w-full px-4 py-2 pl-10 rounded-full bg-gray-100 dark:bg-gray-800 dark:text-white border-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/inbox')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Bell className="w-5 h-5 dark:text-white" />
            </button>
            <button
              onClick={toggle}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isDark ? <Sun className="w-5 h-5 dark:text-white" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>

        {/* Mobile Search - collapsible */}
        <div className={`md:hidden px-4 pb-3 overflow-hidden transition-all duration-300 ${searchOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              className="w-full px-4 py-2 pl-10 rounded-full bg-gray-100 dark:bg-gray-800 dark:text-white border-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 top-16 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:top-0 md:h-auto md:min-h-[calc(100vh-64px)] md:flex md:flex-col md:translate-x-0`}>
          <nav className="p-4 space-y-2 flex-1 flex flex-col">
            <button
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'home' ? 'bg-black dark:bg-white text-white dark:text-black' : 'dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'courses' ? 'bg-black dark:bg-white text-white dark:text-black' : 'dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <Compass className="w-5 h-5" />
              <span>Browse Courses</span>
            </button>
            <button
              onClick={() => setActiveTab('mycourses')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'mycourses' ? 'bg-black dark:bg-white text-white dark:text-black' : 'dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <Video className="w-5 h-5" />
              <span>My Courses</span>
            </button>
            <button
              onClick={() => setActiveTab('registrations')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'registrations' ? 'bg-black dark:bg-white text-white dark:text-black' : 'dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <FileText className="w-5 h-5" />
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

        {/* Overlay - only for clicking outside to close */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-30 bg-black/50 md:hidden top-16"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto w-full bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}