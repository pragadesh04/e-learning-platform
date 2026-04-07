import React from 'react'
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react'
import { GlassCard } from './GlassCard'

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <GlassCard hover className="flex items-center gap-4">
    <div
      className="p-4 rounded-2xl"
      style={{ backgroundColor: `${color}20` }}
    >
      <span style={{ color }}>{React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' }) : icon}</span>
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-3xl font-bold dark:text-white">{value}</p>
    </div>
  </GlassCard>
)

interface StatsSkeletonProps {
  dark?: boolean
}

const StatsSkeleton: React.FC<StatsSkeletonProps> = ({ dark }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="glass rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl skeleton ${dark ? 'dark:bg-gray-700' : ''}`} />
          <div className="flex-1">
            <div className={`h-4 w-24 mb-2 skeleton ${dark ? 'dark:bg-gray-700' : ''}`} />
            <div className={`h-8 w-16 skeleton ${dark ? 'dark:bg-gray-700' : ''}`} />
          </div>
        </div>
      </div>
    ))}
  </div>
)

interface StatsProps {
  stats?: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  isLoading?: boolean
}

export const StatsCards: React.FC<StatsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return <StatsSkeleton />
  }

  if (!stats) {
    return <StatsSkeleton />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Registrations"
        value={stats.total}
        icon={<Users className="w-6 h-6" />}
        color="#000000"
      />
      <StatCard
        title="Pending"
        value={stats.pending}
        icon={<Clock className="w-6 h-6" />}
        color="#eab308"
      />
      <StatCard
        title="Approved"
        value={stats.approved}
        icon={<CheckCircle className="w-6 h-6" />}
        color="#22c55e"
      />
      <StatCard
        title="Rejected"
        value={stats.rejected}
        icon={<XCircle className="w-6 h-6" />}
        color="#ef4444"
      />
    </div>
  )
}