import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, QrCode } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { api } from '../lib/api'

export const Settings: React.FC = () => {
  const [upiId, setUpiId] = useState('')
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: api.getConfig,
  })

  const updateMutation = useMutation({
    mutationFn: api.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] })
    },
  })

  const handleSave = () => {
    updateMutation.mutate(upiId)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 dark:text-white">Settings</h1>

      <div className="max-w-2xl">
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-primary/10">
              <QrCode className="w-6 h-6 text-primary" />
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
                value={upiId || config?.upi_id || ''}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@upi"
                className="input-field text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: yourname@upi, payments@yourbusiness
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>

            {updateMutation.isSuccess && (
              <p className="text-green-500 text-center text-sm">
                Settings saved successfully!
              </p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="mt-6">
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

        <GlassCard className="mt-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Bot Information</h2>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              This dashboard allows you to manage courses, view registrations, and configure payment settings.
            </p>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="font-medium text-primary">Version 1.0.0</p>
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
