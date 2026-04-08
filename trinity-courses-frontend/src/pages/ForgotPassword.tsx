import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useThemeStore } from '../store/themeStore'
import { api } from '../lib/api'
import { Lock, Loader2, CheckCircle } from 'lucide-react'

export const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState(1)
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { isDark, toggle } = useThemeStore()

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await api.forgotPasswordSendOTP(mobile)
      setStep(2)
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      await api.forgotPasswordReset(mobile, otp, newPassword)
      setStep(3)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white to-pink-50 dark:from-black dark:to-gray-900 px-4 py-6">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggle}
          className="p-3 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          {isDark ? (
            <span className="text-white">☀️</span>
          ) : (
            <span className="text-gray-700">🌙</span>
          )}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={isDark ? '/trinity-logo-dark.png' : '/trinity-logo-light.png'} alt="Trinity" className="h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold dark:text-white mb-2">Reset Password</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {step === 1 && 'Enter your registered mobile number'}
              {step === 2 && 'Enter the OTP sent to your mobile'}
              {step === 3 && 'Your password has been reset'}
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-800">
            {step === 3 ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold dark:text-white mb-2">Password Reset!</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You can now login with your new password.
                </p>
                <Link
                  to="/login"
                  className="btn-primary w-full inline-block text-center"
                >
                  Go to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={step === 1 ? handleSendOTP : handleResetPassword} className="space-y-5">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
                      placeholder="Enter your mobile number"
                      pattern="[0-9]{10,}"
                      required
                    />
                  </div>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        OTP (6 digits)
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700 text-center text-2xl tracking-widest"
                        placeholder="000000"
                        maxLength={6}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        OTP sent to {mobile}. Valid for 3 minutes.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
                        placeholder="Enter new password (min 6 chars)"
                        minLength={6}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {step === 1 ? 'Sending OTP...' : 'Resetting...'}
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      {step === 1 ? 'Send OTP' : 'Reset Password'}
                    </>
                  )}
                </button>

                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1)
                      setError('')
                      setOtp('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ← Change mobile number
                  </button>
                )}
              </form>
            )}
          </div>

          <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
            Remember your password?{' '}
            <Link to="/login" className="text-black dark:text-white hover:underline font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}