import React from 'react'
import { X } from 'lucide-react'

interface GlassModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export const GlassModal: React.FC<GlassModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null

  return (
    <div className="relative z-50">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="glass rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6 p-6 pb-0">
            <h2 className="text-2xl font-semibold dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6 dark:text-white" />
            </button>
          </div>
          <div className="p-6 pt-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
