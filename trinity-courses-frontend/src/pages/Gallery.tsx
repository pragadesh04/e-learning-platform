import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Image, Upload, Loader2, Trash2, Layout } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { api } from '../lib/api'

interface GallerySectionProps {
  title: string
  category: string
  images: any[]
  onUpload: (category: string, files: FileList | null) => void
  onDelete: (id: string) => void
  maxImages: number
  isMultiple?: boolean
}

const GallerySection: React.FC<GallerySectionProps> = ({
  title,
  category,
  images,
  onUpload,
  onDelete,
  maxImages,
  isMultiple = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const currentImage = images.find((img: any) => img.category === category)
  const categoryImages = images.filter((img: any) => img.category === category).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  const canAdd = isMultiple ? categoryImages.length < maxImages : !currentImage

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onUpload(category, files)
    }
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isMultiple ? `${categoryImages.length} images` : `${maxImages} image${maxImages > 1 ? 's' : ''}`}
          </p>
        </div>
        {canAdd && (
          <button
            onClick={handleClick}
            className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80"
          >
            <Upload className="w-4 h-4 inline mr-1" />
            Add More
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={isMultiple}
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {isMultiple && categoryImages.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-64 overflow-y-auto">
          {categoryImages.map((img: any) => (
            <div key={img.id} className="relative group aspect-square">
              <img
                src={img.image_url}
                alt={img.title}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                onClick={() => onDelete(img.id)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-white text-xs rounded">
                {img.order || 1}
              </span>
            </div>
          ))}
        </div>
      ) : isMultiple && categoryImages.length === 0 ? (
        <div 
          onClick={handleClick}
          className="h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"
        >
          <div className="text-center text-gray-400">
            <Image className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Click to add {title.toLowerCase()}</p>
          </div>
        </div>
      ) : !isMultiple && currentImage ? (
        <div className="relative group">
          <img
            src={currentImage.image_url}
            alt={title}
            className="w-full h-48 object-cover rounded-lg"
          />
          <button
            onClick={() => onDelete(currentImage.id)}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div 
          onClick={handleClick}
          className="h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"
        >
          <div className="text-center text-gray-400">
            <Image className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No image uploaded</p>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

export const Gallery: React.FC = () => {
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const { data: gallery, isLoading } = useQuery({
    queryKey: ['gallery'],
    queryFn: api.getGallery,
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ category, imageUrl, order }: { category: string; imageUrl: string; order?: number }) => {
      const data: any = { image_url: imageUrl, category }
      if (order !== undefined) data.order = order
      if (category === 'hero_banner') data.title = 'Hero Banner'
      if (category === 'founder') data.title = 'Founder'
      if (category === 'before') data.title = 'Before'
      if (category === 'after') data.title = 'After'
      return api.saveGalleryImage(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteGalleryImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
    },
  })

  const handleUpload = async (category: string, files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const result = await api.uploadImage(file)
        const imageUrl = result.url || result.secure_url

        const existingCount = gallery?.gallery?.filter((img: any) => img.category === category).length || 0
        const order = existingCount + i + 1

        uploadMutation.mutate({ category, imageUrl, order })
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this image?')) {
      deleteMutation.mutate(id)
    }
  }

  const allImages = [
    ...(gallery?.gallery || []),
    ...(gallery?.hero_banner ? [gallery.hero_banner] : []),
    ...(gallery?.founder ? [gallery.founder] : []),
    ...(gallery?.before ? [gallery.before] : []),
    ...(gallery?.after ? [gallery.after] : [])
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {uploading && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl text-center">
            <Loader2 className="w-10 h-10 mx-auto animate-spin dark:text-white mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Uploading and converting to WebP...</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <Image className="w-6 h-6 dark:text-white" />
        <h1 className="text-2xl font-bold dark:text-white">Gallery Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GallerySection
          title="Hero Banner"
          category="hero_banner"
          images={allImages}
          onUpload={handleUpload}
          onDelete={handleDelete}
          maxImages={1}
        />

        <GallerySection
          title="Founder Image"
          category="founder"
          images={allImages}
          onUpload={handleUpload}
          onDelete={handleDelete}
          maxImages={1}
        />

        <GallerySection
          title="Before (Transformation)"
          category="before"
          images={allImages}
          onUpload={handleUpload}
          onDelete={handleDelete}
          maxImages={1}
        />

        <GallerySection
          title="After (Transformation)"
          category="after"
          images={allImages}
          onUpload={handleUpload}
          onDelete={handleDelete}
          maxImages={1}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
          <Layout className="w-5 h-5" />
          Best Work Showcase
        </h2>
        <GallerySection
          title="Best Work"
          category="best_work"
          images={gallery?.gallery || []}
          onUpload={handleUpload}
          onDelete={handleDelete}
          maxImages={50}
          isMultiple
        />
      </div>
    </div>
  )
}