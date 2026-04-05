import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { ArrowLeft, Play, Pause, Menu, X } from 'lucide-react'

function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return ''
}

export const VideoPlayer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const { data: videos, isLoading, error } = useQuery({
    queryKey: ['courseVideos', courseId],
    queryFn: () => api.getCourseVideos(courseId!),
    enabled: !!courseId,
  })

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }
    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !videos || videos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-white mb-4">No videos available</h2>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const currentVideo = videos[currentVideoIndex]
  const videoId = extractVideoId(currentVideo.video_url)

  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row">
      <div className="flex-1 flex flex-col">
        <div className="p-2 md:p-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:text-primary transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex-1 relative bg-black">
          <iframe
            ref={iframeRef}
            key={videoId}
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&showinfo=0&cc_load_policy=0&controls=1&fs=0&playlist=${videoId}`}
            title={currentVideo.title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ border: 'none' }}
          />
        </div>

        <div className="p-4 bg-gray-900">
          <h2 className="text-white text-lg font-semibold">{currentVideo.title}</h2>
          <p className="text-gray-400 text-sm mt-1">
            Video {currentVideoIndex + 1} of {videos.length}
          </p>
        </div>
      </div>

      <div className={`w-full lg:w-80 bg-gray-900 border-l border-gray-800 overflow-y-auto max-h-[40vh] lg:max-h-screen transition-all ${sidebarOpen ? 'h-auto' : 'h-0 lg:h-auto lg:overflow-hidden'}`}>
        <div className="p-2 md:p-4">
          <h3 className="text-white font-semibold mb-3 hidden lg:block">Course Videos</h3>
          <div className="space-y-2 overflow-y-auto max-h-[35vh] lg:max-h-[calc(100vh-120px)]">
            {videos.map((video: any, index: number) => (
              <button
                key={index}
                onClick={() => setCurrentVideoIndex(index)}
                className={`w-full flex items-start gap-2 md:gap-3 p-1 md:p-2 rounded-lg text-left transition-colors ${
                  index === currentVideoIndex
                    ? 'bg-primary/20 border border-primary'
                    : 'hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={video.thumbnail_url || `https://img.youtube.com/vi/${extractVideoId(video.video_url)}/mqdefault.jpg`}
                    alt={video.title}
                    className="w-20 md:w-24 h-12 md:h-14 object-cover rounded"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                    {index === currentVideoIndex ? (
                      <Pause className="w-4 md:w-6 h-4 md:h-6 text-white" />
                    ) : (
                      <Play className="w-4 md:w-6 h-4 md:h-6 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs md:text-sm line-clamp-2">{video.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
