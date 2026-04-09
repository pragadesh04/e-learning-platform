export interface SessionSchedule {
  session_number: number
  date?: string
  time?: string
  meeting_link?: string
}

export interface AccessDurations {
  three_months?: number
  six_months?: number
  lifetime?: number
}

export interface Video {
  video_url: string
  title: string
  thumbnail_url: string
}

export interface Course {
  _id: string
  title: string
  description: string
  fee: number
  image_url: string
  registration_count: number
  created_at: string
  updated_at: string
  course_type: string
  start_date?: string
  start_time?: string
  sessions?: number
  duration?: number
  registration_open: boolean
  video_type: string
  videos: Video[]
  tags?: string[]
  session_schedules?: SessionSchedule[]
  access_durations?: AccessDurations
}

export interface Registration {
  _id: string
  telegram_id: number
  name: string
  address: string
  course_id: string
  course_title: string
  amount: number
  screenshot_url?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export interface Config {
  upi_id: string
}

export interface User {
  id: string
  mobile: string
  name: string
  is_admin: boolean
  accessible_courses: string[]
  created_at?: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}
