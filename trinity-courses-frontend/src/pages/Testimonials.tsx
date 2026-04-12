import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Upload, Loader2, MessageSquare, X } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { GlassModal } from '../components/GlassModal'
import { api } from '../lib/api'

export const Testimonials: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', feedback: '', image_url: '' })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ['adminTestimonials'],
    queryFn: api.getTestimonials,
  })

  const createMutation = useMutation({
    mutationFn: api.createTestimonial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTestimonials'] })
      queryClient.invalidateQueries({ queryKey: ['testimonials'] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteTestimonial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTestimonials'] })
      queryClient.invalidateQueries({ queryKey: ['testimonials'] })
    },
  })

  const openModal = (testimonial?: any) => {
    if (testimonial) {
      setFormData({ name: testimonial.name, feedback: testimonial.feedback, image_url: testimonial.image_url || '' })
      setImagePreview(testimonial.image_url || null)
    } else {
      setFormData({ name: '', feedback: '', image_url: '' })
      setImagePreview(null)
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setFormData({ name: '', feedback: '', image_url: '' })
    setImagePreview(null)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await api.uploadImage(file)
      const url = result.url || result.secure_url
      setFormData({ ...formData, image_url: url })
      setImagePreview(url)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.feedback) return
    createMutation.mutate(formData)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this testimonial?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 dark:text-white" />
          <h1 className="text-2xl font-bold dark:text-white">Testimonials</h1>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Testimonial
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </GlassCard>
          ))}
        </div>
      ) : testimonials && testimonials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t: any) => (
            <GlassCard key={t.id} className="p-4 relative group">
              <div className="flex items-start gap-3">
                <img 
                  src={t.image_url || '/images/customers/customer-1.jpg'} 
                  alt={t.name} 
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold dark:text-white truncate">{t.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mt-1">{t.feedback}</p>
                </div>
              </div>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleDelete(t.id)}
                  className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No testimonials yet</p>
          <button onClick={() => openModal()} className="mt-4 btn-primary">
            Add First Testimonial
          </button>
        </div>
      )}

      <GlassModal isOpen={isModalOpen} onClose={closeModal} title="Add Testimonial">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 dark:text-white border-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              placeholder="Customer name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Feedback</label>
            <textarea
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 dark:text-white border-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              placeholder="Customer feedback..."
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Image</label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setFormData({ ...formData, image_url: '' }) }}
                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin dark:text-white" />
                  ) : (
                    <Upload className="w-5 h-5 dark:text-gray-400" />
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">Upload customer photo</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-medium rounded-full hover:opacity-80 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  )
}