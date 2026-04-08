import React from 'react'
import { useToastStore, ToastType } from '../store/toastStore'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
  info: <Info className="w-5 h-5 text-gray-500" />,
}

const bgColors: Record<ToastType, string> = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  info: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
}

const textColors: Record<ToastType, string> = {
  success: 'text-green-700 dark:text-green-400',
  error: 'text-red-700 dark:text-red-400',
  warning: 'text-yellow-700 dark:text-yellow-400',
  info: 'text-gray-700 dark:text-gray-400',
}

interface ToastProps {
  id: string
  message: string
  type: ToastType
}

const Toast: React.FC<ToastProps> = ({ id, message, type }) => {
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
        animate-slideUp
        ${bgColors[type]} ${textColors[type]}
      `}
    >
      {icons[type]}
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => removeToast(id)}
        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  )
}

export const toast = {
  success: (message: string) => useToastStore.getState().addToast(message, 'success'),
  error: (message: string) => useToastStore.getState().addToast(message, 'error'),
  warning: (message: string) => useToastStore.getState().addToast(message, 'warning'),
  info: (message: string) => useToastStore.getState().addToast(message, 'info'),
}