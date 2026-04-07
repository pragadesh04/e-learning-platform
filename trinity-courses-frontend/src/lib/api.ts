const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const getToken = () => localStorage.getItem('token')

const fetchWithAuth = async (url: string, options: RequestInit = {}, timeout = 30000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  const token = getToken()
  
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, headers })
    return res
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 30000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Failed to connect to server. Please check your internet connection.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  // Auth endpoints
  async login(mobile: string, password: string) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error: ${res.status}`)
      }
      return res.json()
    } catch (error: any) {
      if (error.message.includes('connect') || error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please check your internet connection.')
      }
      throw error
    }
  },

  async register(name: string, mobile: string, password: string) {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('mobile', mobile)
    formData.append('password', password)
    
    const res = await fetchWithTimeout(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }))
      throw new Error(err.detail || 'Registration failed')
    }
    return res.json()
  },

  async getMe() {
    const res = await fetchWithAuth(`${API_BASE}/auth/me`)
    if (!res.ok) throw new Error('Failed to get user')
    return res.json()
  },

  // Courses endpoints (public & user)
  async getCourses() {
    const res = await fetchWithAuth(`${API_BASE}/courses`)
    if (!res.ok) throw new Error('Failed to fetch courses')
    return res.json()
  },

  async getCourseById(courseId: string) {
    const res = await fetchWithAuth(`${API_BASE}/courses/${courseId}`)
    if (!res.ok) throw new Error('Failed to fetch course')
    return res.json()
  },

  async searchCourses(query: string) {
    const res = await fetchWithAuth(`${API_BASE}/course-post-login/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) throw new Error('Failed to search courses')
    return res.json()
  },

  async searchAdminCourses(query: string) {
    const res = await fetchWithAuth(`${API_BASE}/courses/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) throw new Error('Failed to search courses')
    return res.json()
  },

  async getRecommendations() {
    const res = await fetchWithAuth(`${API_BASE}/course-post-login/recommendations`)
    if (!res.ok) throw new Error('Failed to fetch recommendations')
    return res.json()
  },

  async getCourseQR(courseId: string) {
    const res = await fetchWithAuth(`${API_BASE}/course-post-login/${courseId}/qr`)
    if (!res.ok) throw new Error('Failed to generate QR code')
    return res.json()
  },

  // Registrations endpoints
  // User's registrations (web)
  async getUserRegistrations() {
    const res = await fetchWithAuth(`${API_BASE}/web/user`)
    if (!res.ok) throw new Error('Failed to fetch registrations')
    return res.json()
  },

  async registerCourse(courseId: string, name: string, address: string, mobile: string, screenshot: File) {
    const formData = new FormData()
    formData.append('course_id', courseId)
    formData.append('name', name)
    formData.append('address', address)
    formData.append('mobile', mobile)
    formData.append('screenshot', screenshot)
    
    const res = await fetchWithAuth(`${API_BASE}/web`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }))
      throw new Error(err.detail || 'Registration failed')
    }
    return res.json()
  },

  // User's accessible courses
  async getUserCourses() {
    const res = await fetchWithAuth(`${API_BASE}/user/courses`)
    if (!res.ok) throw new Error('Failed to get user courses')
    return res.json()
  },

  async getCourseVideos(courseId: string) {
    const res = await fetchWithAuth(`${API_BASE}/course-post-login/${courseId}/videos`)
    if (!res.ok) throw new Error('Failed to get course videos')
    return res.json()
  },

  async updateVideoProgress(courseId: string, videoId: string, timestamp: number) {
    const res = await fetchWithAuth(`${API_BASE}/course-post-login/${courseId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: videoId, timestamp }),
    })
    if (!res.ok) throw new Error('Failed to update progress')
    return res.json()
  },

  async getVideoProgress(courseId: string) {
    const res = await fetchWithAuth(`${API_BASE}/course-post-login/${courseId}/progress`)
    if (!res.ok) throw new Error('Failed to get progress')
    return res.json()
  },

  // Admin endpoints
  async getStats() {
    const res = await fetchWithAuth(`${API_BASE}/stats`)
    if (!res.ok) throw new Error('Failed to fetch stats')
    return res.json()
  },

  async createCourse(data: { title: string; description: string; fee: number; image_url?: string; course_type?: string; start_date?: string; start_time?: string; sessions?: number; duration?: number; video_type?: string; videos?: any[] }) {
    const res = await fetchWithAuth(`${API_BASE}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create course')
    return res.json()
  },

  async updateCourse(id: string, data: { title?: string; description?: string; fee?: number; image_url?: string; course_type?: string; start_date?: string; start_time?: string; sessions?: number; duration?: number; video_type?: string; videos?: any[] }) {
    const res = await fetchWithAuth(`${API_BASE}/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update course')
    return res.json()
  },

  async deleteCourse(id: string) {
    const res = await fetchWithAuth(`${API_BASE}/courses/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete course')
    return res.json()
  },

  async toggleCourseRegistration(id: string) {
    const res = await fetchWithAuth(`${API_BASE}/courses/${id}/toggle-registration`, { method: 'PUT' })  
    if (!res.ok) throw new Error('Failed to toggle registration')
    return res.json()
  },

  async getRegistrations(status?: string, course?: string, sortBy?: string, order?: string) {
    let url = `${API_BASE}/registrations`
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (course) params.append('course', course)
    if (sortBy) params.append('sort_by', sortBy)
    if (order) params.append('order', order)
    const queryString = params.toString()
    if (queryString) url += `?${queryString}`
    const res = await fetchWithAuth(url)
    if (!res.ok) throw new Error('Failed to fetch registrations')
    return res.json()
  },

  async approveRegistration(id: string) {
    const res = await fetchWithAuth(`${API_BASE}/registrations/${id}/approve`, { method: 'PUT' })
    if (!res.ok) throw new Error('Failed to approve registration')
    return res.json()
  },

  async rejectRegistration(id: string, reason?: string) {
    const url = reason 
      ? `${API_BASE}/registrations/${id}/reject?reason=${encodeURIComponent(reason)}`
      : `${API_BASE}/registrations/${id}/reject`
    const res = await fetchWithAuth(url, { method: 'PUT' })
    if (!res.ok) throw new Error('Failed to reject registration')
    return res.json()
  },

  async getConfig() {
    const res = await fetchWithAuth(`${API_BASE}/config/upi`)
    if (!res.ok) throw new Error('Failed to fetch config')
    return res.json()
  },

  async updateConfig(value: string) {
    const res = await fetchWithAuth(`${API_BASE}/config/upi`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
    if (!res.ok) throw new Error('Failed to update config')
    return res.json()
  },

  // Image upload
  async uploadImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetchWithAuth(`${API_BASE}/upload/image`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error('Failed to upload image')
    return res.json()
  },

  // Inbox endpoints
  async getInbox() {
    const res = await fetchWithAuth(`${API_BASE}/inbox`)
    if (!res.ok) throw new Error('Failed to fetch inbox')
    return res.json()
  },

  async getUnreadCount() {
    const res = await fetchWithAuth(`${API_BASE}/inbox/unread-count`)
    if (!res.ok) throw new Error('Failed to fetch unread count')
    return res.json()
  },

  async markInboxRead(messageId: string) {
    const res = await fetchWithAuth(`${API_BASE}/inbox/${messageId}/read`, { method: 'PUT' })
    if (!res.ok) throw new Error('Failed to mark as read')
    return res.json()
  },

  async markAllInboxRead() {
    const res = await fetchWithAuth(`${API_BASE}/inbox/read-all`, { method: 'PUT' })
    if (!res.ok) throw new Error('Failed to mark all as read')
    return res.json()
  },

  async deleteInboxMessage(messageId: string) {
    const res = await fetchWithAuth(`${API_BASE}/inbox/${messageId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete message')
    return res.json()
  },
}
