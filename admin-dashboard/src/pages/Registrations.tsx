import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Filter, Eye, Check, X, Clock, CheckCircle, XCircle } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { GlassModal } from '../components/GlassModal'
import { api } from '../lib/api'

const API_BASE = 'http://localhost:8000'

const REJECTION_REASONS = [
    'Fake screenshot',
    'Registration closed',
    'Seat filled',
    'Invalid details',
    'Duplicate registration'
]

export const Registrations: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [courseFilter, setCourseFilter] = useState<string>('')
    const [sortBy, setSortBy] = useState<string>('')
    const [sortOrder, setSortOrder] = useState<string>('desc')
    const [selectedReg, setSelectedReg] = useState<any>(null)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [tempFilters, setTempFilters] = useState({
        status: '',
        course: '',
        sortBy: '',
        sortOrder: 'desc'
    })
    const queryClient = useQueryClient()

    const { data: courses } = useQuery({
        queryKey: ['courses'],
        queryFn: () => api.getCourses(),
    })

    const { data: registrations, isLoading } = useQuery({
        queryKey: ['registrations', statusFilter, courseFilter, sortBy, sortOrder],
        queryFn: () => api.getRegistrations(
            statusFilter || undefined,
            courseFilter || undefined,
            sortBy || undefined,
            sortOrder || undefined
        ),
        refetchInterval: 30000,
    })

    const openFilterModal = () => {
        setTempFilters({
            status: statusFilter,
            course: courseFilter,
            sortBy: sortBy,
            sortOrder: sortOrder
        })
        setIsFilterModalOpen(true)
    }

    const clearAndCloseFilterModal = () => {
        setStatusFilter('')
        setCourseFilter('')
        setSortBy('')
        setSortOrder('desc')
        setIsFilterModalOpen(false)
    }

    const applyFilterModal = () => {
        setStatusFilter(tempFilters.status)
        setCourseFilter(tempFilters.course)
        setSortBy(tempFilters.sortBy)
        setSortOrder(tempFilters.sortOrder)
        setIsFilterModalOpen(false)
    }

    const activeFilterCount = [
        statusFilter,
        courseFilter,
        sortBy
    ].filter(Boolean).length

    const approveMutation = useMutation({
        mutationFn: api.approveRegistration,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['registrations'] })
            queryClient.invalidateQueries({ queryKey: ['courses'] })
            queryClient.invalidateQueries({ queryKey: ['stats'] })
            setSelectedReg(null)
        },
        onError: (error) => {
            alert('Failed to approve registration. Please try again.')
            console.error(error)
        },
    })

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
            api.rejectRegistration(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['registrations'] })
            queryClient.invalidateQueries({ queryKey: ['stats'] })
            setSelectedReg(null)
        },
        onError: (error) => {
            alert('Failed to reject registration. Please try again.')
            console.error(error)
        },
    })

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        }
        const icons = {
            pending: Clock,
            approved: CheckCircle,
            rejected: XCircle,
        }
        const Icon = icons[status as keyof typeof icons] || Clock
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${styles[status as keyof typeof styles]}`}>
                <Icon className="w-4 h-4" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        )
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-bold dark:text-white">Registrations</h1>
                <button
                    onClick={openFilterModal}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
                        activeFilterCount > 0
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white dark:bg-black/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-primary/10'
                    }`}
                >
                    <Filter className="w-4 h-4" />
                    Filter
                    {activeFilterCount > 0 && (
                        <span className="ml-1 px-2 py-0.5 text-xs bg-white text-primary rounded-full">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={`skeleton-${i}`} className="skeleton h-24 rounded-3xl" />
                    ))}
                </div>
            ) : registrations?.length === 0 ? (
                <GlassCard className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No registrations found</p>
                </GlassCard>
            ) : (
                <div className="space-y-4">
                    {registrations?.map((reg: any) => (
                        <GlassCard 
                            key={reg.id} 
                            hover 
                            onClick={() => setSelectedReg(reg)} 
                            className="flex items-center gap-6 cursor-pointer"
                        >
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xl font-bold text-primary">
                                    {reg.name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold dark:text-white">{reg.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{reg.course_title}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {reg.created_at ? new Date(reg.created_at).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    }) : 'N/A'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-primary mb-2">₹{reg.amount}</p>
                                {getStatusBadge(reg.status)}
                            </div>
                            <button className="p-2 rounded-full hover:bg-primary/10 transition-colors">
                                <Eye className="w-5 h-5 text-primary" />
                            </button>
                        </GlassCard>
                    ))}
                </div>
            )}

            <RegistrationModal
                registration={selectedReg}
                onClose={() => setSelectedReg(null)}
                onApprove={(id) => approveMutation.mutate(id)}
                onReject={(id, reason) => rejectMutation.mutate({ id, reason })}
                isLoading={approveMutation.isPending || rejectMutation.isPending}
            />

            <GlassModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} title="Filter Registrations">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <select
                            value={tempFilters.status}
                            onChange={(e) => setTempFilters({ ...tempFilters, status: e.target.value })}
                            className="input-field"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                        <select
                            value={tempFilters.course}
                            onChange={(e) => setTempFilters({ ...tempFilters, course: e.target.value })}
                            className="input-field"
                        >
                            <option value="">All Courses</option>
                            {courses?.map((course: any) => (
                                <option key={course.id} value={course.title}>{course.title}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
                        <select
                            value={tempFilters.sortBy}
                            onChange={(e) => setTempFilters({ ...tempFilters, sortBy: e.target.value })}
                            className="input-field"
                        >
                            <option value="">Sort By</option>
                            <option value="date">Date</option>
                            <option value="amount">Amount</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
                        <select
                            value={tempFilters.sortOrder}
                            onChange={(e) => setTempFilters({ ...tempFilters, sortOrder: e.target.value })}
                            className="input-field"
                        >
                            <option value="desc">Newest/High</option>
                            <option value="asc">Oldest/Low</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button onClick={clearAndCloseFilterModal} className="flex-1 btn-secondary">Clear Filters</button>
                        <button onClick={applyFilterModal} className="flex-1 btn-primary">Apply Filters</button>
                    </div>
                </div>
            </GlassModal>
        </div>
    )
}

interface RegistrationModalProps {
    registration: any
    onClose: () => void
    onApprove: (id: string) => void
    onReject: (id: string, reason?: string) => void
    isLoading: boolean
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({
    registration,
    onClose,
    onApprove,
    onReject,
    isLoading,
}) => {
    const [showRejectDropdown, setShowRejectDropdown] = useState(false)
    const [selectedReason, setSelectedReason] = useState('')

    if (!registration) return null

    const handleReject = () => {
        if (selectedReason) {
            onReject(registration.id, selectedReason)
            setShowRejectDropdown(false)
            setSelectedReason('')
        } else {
            setShowRejectDropdown(true)
        }
    }

    const imageUrl = registration.screenshot_url 
        ? `${API_BASE}${registration.screenshot_url}`
        : null

    return (
        <GlassModal isOpen={!!registration} onClose={onClose} title="Registration Details">
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                            {registration.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold dark:text-white">{registration.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400">Telegram ID: {registration.telegram_id}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {registration.mobile && (
                        <div className="p-4 rounded-xl bg-white/30 dark:bg-black/30">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Mobile</p>
                            <p className="dark:text-white">{registration.mobile}</p>
                        </div>
                    )}
                    <div className="p-4 rounded-xl bg-white/30 dark:bg-black/30">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Address</p>
                        <p className="dark:text-white">{registration.address}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/30 dark:bg-black/30">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Course</p>
                        <p className="dark:text-white">{registration.course_title}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/30 dark:bg-black/30">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount Paid</p>
                        <p className="text-2xl font-bold text-primary">₹{registration.amount}</p>
                    </div>
                    {registration.rejection_reason && (
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
                            <p className="text-sm text-red-500 dark:text-red-400 mb-1">Rejection Reason</p>
                            <p className="dark:text-white">{registration.rejection_reason}</p>
                        </div>
                    )}
                </div>

                {imageUrl && (
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Payment Screenshot</p>
                        <img
                            src={imageUrl}
                            alt="Payment screenshot"
                            className="w-full rounded-xl object-contain max-h-64 bg-gray-100 dark:bg-gray-800"
                        />
                    </div>
                )}

                {registration.status === 'pending' && (
                    <div className="space-y-3">
                        {showRejectDropdown && (
                            <select
                                value={selectedReason}
                                onChange={(e) => setSelectedReason(e.target.value)}
                                className="input-field w-full"
                            >
                                <option value="">Select rejection reason...</option>
                                {REJECTION_REASONS.map((reason) => (
                                    <option key={reason} value={reason}>{reason}</option>
                                ))}
                            </select>
                        )}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleReject}
                                disabled={isLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                                {showRejectDropdown ? 'Confirm Reject' : 'Reject'}
                            </button>
                            <button
                                onClick={() => onApprove(registration.id)}
                                disabled={isLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <Check className="w-5 h-5" />
                                Approve
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </GlassModal>
    )
}
