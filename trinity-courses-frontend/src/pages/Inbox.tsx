import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Trash2, BookOpen, Video, Bell, CheckCheck, ExternalLink, ArrowLeft } from 'lucide-react'


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

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'new_course':
        return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Course' }
      case 'new_video':
        return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Video' }
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Notification' }
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    const minutes = Math.floor(diff / (1000 * 60))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const unreadCount = messages?.filter((m: InboxMessage) => !m.is_read).length || 0

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-4 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : !messages || messages.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No notifications yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-500 max-w-sm mx-auto">
            You'll be notified when new courses are launched or videos are added to your enrolled courses.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg: InboxMessage) => {
            const styles = getTypeStyles(msg.type)
            return (
              <div
                key={msg.id}
                onClick={() => handleMessageClick(msg)}
                className={`
                  group relative p-4 rounded-xl cursor-pointer transition-all duration-200
                  ${msg.is_read 
                    ? 'bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900' 
                    : 'bg-white dark:bg-gray-900 hover:shadow-md border-l-4 border-l-black dark:border-l-white'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-lg ${styles.bg} ${styles.text}`}>
                    {msg.type === 'new_course' ? (
                      <BookOpen className="w-5 h-5" />
                    ) : msg.type === 'new_video' ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold truncate ${
                        msg.is_read 
                          ? 'text-gray-600 dark:text-gray-400' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {msg.title}
                      </h3>
                      {!msg.is_read && (
                        <span className="w-2 h-2 rounded-full bg-black dark:bg-white flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                      {msg.message}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(msg.created_at)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${styles.bg} ${styles.text}`}>
                        {styles.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMessageClick(msg)
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="View"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMutation.mutate(msg.id)
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
    </div>
  )
}