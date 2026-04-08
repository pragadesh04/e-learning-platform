import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { GlassCard } from '../components/GlassCard'
import { Sparkles, BookOpen, Clock, Users, ArrowRight, Bot } from 'lucide-react'

export const Recommendations: React.FC = () => {
  const navigate = useNavigate()
  const [recommendationType, setRecommendationType] = useState<string>('')
  
  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.getRecommendations(),
  })

  useEffect(() => {
    if (recommendations?.type) {
      setRecommendationType(recommendations.type)
    }
  }, [recommendations])

  const formatDuration = (hours: number | null | undefined) => {
    if (!hours) return null
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0) return `${m} min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'popular':
        return 'Popular Courses'
      case 'ai_recommendations':
        return 'AI Recommended for You'
      case 'popular_fallback':
        return 'Suggested for You'
      default:
        return 'Recommended Courses'
    }
  }

  const courses = recommendations?.courses || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-black dark:text-white" />
            <h1 className="text-3xl font-bold dark:text-white">Recommended Courses</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {!recommendationType || recommendationType === 'popular' 
              ? 'Based on what other students are enrolling in' 
              : 'AI-powered personalized recommendations based on your interests'}
          </p>
        </div>
      </div>

      {recommendationType && recommendationType !== 'ai_recommendations' && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Register for a course to get AI-powered personalized recommendations!
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          Failed to load recommendations. Please try again.
        </div>
      )}

      {!isLoading && courses.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4">
            {recommendationType === 'ai_recommendations' && <Bot className="w-5 h-5 text-gray-500" />}
            <h2 className="text-xl font-semibold dark:text-white">{getTypeLabel(recommendationType)}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => (
              <GlassCard key={course.id} className="overflow-hidden group cursor-pointer" onClick={() => navigate(`/course/${course.id}`)}>
                <div className="relative">
                  <img
                    src={course.image_url || 'https://placehold.co/400x200/transparent/white?text=Course&font=Poppins'}
                    alt={course.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      course.registration_open 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {course.registration_open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-white" />
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold dark:text-white line-clamp-2">{course.title}</h3>
                    <span className="text-lg font-bold text-black dark:text-white shrink-0">₹{course.fee}</span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {course.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {course.course_type === 'live' ? (
                      course.sessions && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {course.sessions} sessions
                        </span>
                      )
                    ) : (
                      course.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(course.duration)}
                        </span>
                      )
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {course.registration_count || 0} enrolled
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <Link to="/courses" className="btn-primary flex items-center gap-2">
              View All Courses
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </>
      )}

      {!isLoading && courses.length === 0 && (
        <GlassCard className="text-center py-12">
          <Sparkles className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold dark:text-white mb-2">No Courses Available</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Check back later for new course offerings.
          </p>
        </GlassCard>
      )}
    </div>
  )
}
