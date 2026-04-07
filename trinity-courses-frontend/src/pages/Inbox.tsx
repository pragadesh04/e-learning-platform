import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { GlassCard } from '../components/GlassCard'
import { Trash2, BookOpen, Video, Bell, CheckCheck } from 'lucide-react'


interface InboxMessage {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  course_id: string
  is_read: boolean
  created_at: string
}

export const Inbox: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: messages, isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: api.getInbox,
  })

  const markReadMutation = useMutation({
    mutationFn: api.markInboxRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: api.markAllInboxRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteInboxMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    },
  })

  const handleMessageClick = (msg: InboxMessage) => {
    if (!msg.is_read) {
      markReadMutation.mutate(msg.id)
    }
    if (msg.type === 'new_course') {
      navigate(`/course/${msg.course_id}`)
    } else if (msg.type === 'new_video') {
      navigate(`/watch/${msg.course_id}`)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_course':
        return <BookOpen className="w-5 h-5" />
      case 'new_video':
        return <Video className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const unreadCount = messages?.filter((m: InboxMessage) => !m.is_read).length || 0

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Inbox</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="btn-secondary flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-3xl" />
          ))}
        </div>
      ) : messages?.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No notifications
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              You'll receive notifications when new courses are launched or videos are added
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {messages?.map((msg: InboxMessage) => (
            <GlassCard
              key={msg.id}
              hover
              className={`cursor-pointer transition-all ${
                !msg.is_read
                  ? 'border-l-4 border-l-black dark:border-l-white'
                  : 'opacity-75'
              }`}
              onClick={() => handleMessageClick(msg)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${
                  msg.is_read 
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' 
                    : 'bg-black dark:bg-white text-white dark:text-black'
                }`}>
                  {getIcon(msg.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold ${
                      msg.is_read 
                        ? 'text-gray-600 dark:text-gray-400' 
                        : 'dark:text-white'
                    }`}>
                      {msg.title}
                    </h3>
                    {!msg.is_read && (
                      <span className="w-2 h-2 rounded-full bg-black dark:bg-white" />
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2">
                    {msg.message}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                    {formatDate(msg.created_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteMutation.mutate(msg.id)
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}