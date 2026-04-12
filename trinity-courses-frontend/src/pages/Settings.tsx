import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, QrCode, User, Loader2, Lock } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export const Settings: React.FC = () => {
  const [upiId, setUpiId] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileCity, setProfileCity] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const queryClient = useQueryClient()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '')
      setProfileCity(user.city || '')
    }
  }, [user])

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: api.getConfig,
  })

  const updateConfigMutation = useMutation({
    mutationFn: api.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] })
      setUpiId('')
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: ({ name, city }: { name: string; city: string }) => api.updateProfile(name, city),
    onSuccess: (updatedUser) => {
      setProfileSuccess('Profile updated successfully!')
      setProfileError('')
      localStorage.setItem('user', JSON.stringify(updatedUser))
    },
    onError: (err: any) => {
      setProfileError(err.message || 'Failed to update profile')
      setProfileSuccess('')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setPasswordSuccess('Password changed successfully!')
      setPasswordError('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err: any) => {
      setPasswordError(err.message || 'Failed to change password')
      setPasswordSuccess('')
    },
  })

  const handleSaveConfig = () => {
    updateConfigMutation.mutate(upiId)
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    updateProfileMutation.mutate({ name: profileName, city: profileCity })
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    changePasswordMutation.mutate({ currentPassword, newPassword })
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 dark:text-white">Settings</h1>

      <div className="max-w-2xl space-y-6">
        {/* Profile Settings */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-black/10 dark:bg-white/10">
              <User className="w-6 h-6 text-black dark:text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold dark:text-white">Profile Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update your personal information
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {profileError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm">
                {profileSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="input-field"
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={profileCity}
                  onChange={(e) => setProfileCity(e.target.value)}
                  className="input-field"
                  placeholder="Enter your city"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Profile
                </>
              )}
            </button>
          </form>
        </GlassCard>

        {/* Change Password */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-black/10 dark:bg-white/10">
              <Lock className="w-6 h-6 text-black dark:text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold dark:text-white">Change Password</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update your password
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm">
                {passwordSuccess}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field"
                placeholder="Enter current password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                placeholder="Enter new password"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 6 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="Confirm new password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Change Password
                </>
              )}
            </button>
          </form>
        </GlassCard>

        {/* UPI Configuration */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-black/10 dark:bg-white/10">
              <QrCode className="w-6 h-6 text-black dark:text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold dark:text-white">UPI Configuration</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure the UPI ID used for payment QR codes
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@upi"
                className="input-field text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: yourname@upi, payments@yourbusiness
              </p>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={updateConfigMutation.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {updateConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>

            {updateConfigMutation.isSuccess && (
              <p className="text-green-500 text-center text-sm">
                Settings saved successfully!
              </p>
            )}
          </div>
        </GlassCard>

        {/* Current Configuration */}
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Current Configuration</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-black/30">
              <span className="text-gray-600 dark:text-gray-400">UPI ID</span>
              <span className="font-mono font-medium dark:text-white">
                {config?.upi_id || 'Not configured'}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Bot Information */}
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Bot Information</h2>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              This dashboard allows you to manage courses, view registrations, and configure payment settings.
            </p>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="font-medium text-black dark:text-white">Version 1.0.0</p>
              <p className="text-gray-500 dark:text-gray-400">
                Course Registration Bot with AI Integration
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}