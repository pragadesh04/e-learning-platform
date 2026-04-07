import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { ArrowLeft, Play, Pause } from 'lucide-react'

declare const window: Window & typeof globalThis & {
  YT?: {
    Player: new (elementId: string, config: any) => any
    PlayerState: {
      PLAYING: number
      PAUSED: number
      ENDED: number
    }
  }
  onYouTubeIframeAPIReady?: () => void
}

const YT_URL = 'https://www.youtube.com/iframe_api'

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

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT) {
      resolve()
      return
    }
    window.onYouTubeIframeAPIReady = () => resolve()
    const script = document.createElement('script')
    script.src = YT_URL
    const firstScript = document.getElementsByTagName('script')[0]
    firstScript.parentNode?.insertBefore(script, firstScript)
  })
}

export const VideoPlayer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const playerRef = useRef<any>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateProgress = useMutation({
    mutationFn: ({ videoId, timestamp }: { videoId: string; timestamp: number }) =>
      api.updateVideoProgress(courseId!, videoId, timestamp),
  })

  const { data: progressData } = useQuery({
    queryKey: ['videoProgress', courseId],
    queryFn: () => api.getVideoProgress(courseId!),
    enabled: !!courseId,
    refetchInterval: 60000,
  })

  const videosRef = useRef<any[]>([])
  
  const { data: videos, isLoading, error } = useQuery({
    queryKey: ['courseVideos', courseId],
    queryFn: () => api.getCourseVideos(courseId!),
    enabled: !!courseId,
  })

  useEffect(() => {
    if (videos) {
      videosRef.current = videos
    }
  }, [videos])

  const syncProgress = useCallback(() => {
    if (playerRef.current && playerRef.current.getCurrentTime) {
      try {
        const time = playerRef.current.getCurrentTime()
        const videoId = extractVideoId(videosRef.current[currentVideoIndex]?.video_url || '')
        setCurrentTime(time)
        updateProgress.mutate({ videoId, timestamp: Math.floor(time) })
      } catch (e) {
        console.error('Error syncing progress:', e)
      }
    }
  }, [currentVideoIndex, updateProgress])

  useEffect(() => {
    loadYouTubeAPI()
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [syncProgress])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

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

  useEffect(() => {
    if (videos && progressData?.progress && window.YT) {
      const savedProgress = progressData.progress[videos[currentVideoIndex]?._id]
      if (savedProgress && playerRef.current?.seekTo) {
        try {
          playerRef.current.seekTo(savedProgress.timestamp, true)
        } catch (e) {
          console.error('Error seeking:', e)
        }
      }
    }
  }, [videos, progressData, currentVideoIndex])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error || !videos || videos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl text-white mb-4">No videos available</h2>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-white text-black rounded-lg font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const currentVideo = videos[currentVideoIndex]
  const videoId = extractVideoId(currentVideo.video_url)

  const handleNextVideo = () => {
    syncProgress()
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1)
    }
  }

  const handlePrevVideo = () => {
    syncProgress()
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNextVideo()
      else handlePrevVideo()
    }
    setTouchStart(null)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div 
      className="min-h-screen bg-black flex flex-col lg:flex-row"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex-1 relative bg-black">
        <iframe
          key={videoId}
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&showinfo=0&cc_load_policy=0&controls=1&fs=1&enablejsapi=1&origin=${window.location.origin}`}
          title={currentVideo.title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ border: 'none' }}
        />
        {currentTime > 0 && (
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/70 text-white text-sm rounded-full">
            {formatTime(currentTime)}
          </div>
        )}
      </div>

      <div className={`w-full lg:w-80 bg-gray-900 border-l border-gray-800 flex flex-col ${isFullscreen ? 'hidden' : ''}`}>
        <div className="p-3 border-b border-gray-800">
          <button
            onClick={() => {
              syncProgress()
              navigate(-1)
            }}
            className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {videos.map((video: any, index: number) => (
              <button
                key={index}
                onClick={() => {
                  syncProgress()
                  setCurrentVideoIndex(index)
                }}
                className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors ${
                  index === currentVideoIndex 
                    ? 'bg-white/20 border border-white' 
                    : 'hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={video.thumbnail_url || `https://img.youtube.com/vi/${extractVideoId(video.video_url)}/mqdefault.jpg`}
                    alt={video.title}
                    className="w-24 h-14 object-cover rounded"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                    {index === currentVideoIndex ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="absolute bottom-1 right-1 px-1 bg-black/70 text-white text-xs rounded">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm line-clamp-2">{video.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}