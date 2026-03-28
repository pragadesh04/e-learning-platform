const API_BASE = '/api'

const getToken = () => localStorage.getItem('token')

const fetchWithAuth = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  const token = getToken()
  
  const headers: HeadersInit = {
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, headers })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  async login(mobile: string, password: string) {
    const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password }),
    })
    if (!res.ok) throw new Error('Invalid mobile or password')
    return res.json()
  },

  async getMe() {
    const res = await fetchWithAuth(`${API_BASE}/auth/me`)
    if (!res.ok) throw new Error('Failed to get user')
    return res.json()
  },

  async getUserCourses() {
    const res = await fetchWithAuth(`${API_BASE}/user/courses`)
    if (!res.ok) throw new Error('Failed to get user courses')
    return res.json()
  },

  async getUserRegistrations() {
    const res = await fetchWithAuth(`${API_BASE}/user/registrations`)
    if (!res.ok) throw new Error('Failed to get user registrations')
    return res.json()
  },

  async getCourseVideos(courseId: string) {
    const res = await fetchWithAuth(`${API_BASE}/courses/${courseId}/videos`)
    if (!res.ok) throw new Error('Failed to get course videos')
    return res.json()
  },

  async getStats() {
    const res = await fetchWithAuth(`${API_BASE}/stats`)
    if (!res.ok) throw new Error('Failed to fetch stats')
    return res.json()
  },

  async getCourses() {
    const res = await fetchWithAuth(`${API_BASE}/courses`)
    if (!res.ok) throw new Error('Failed to fetch courses')
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
}
