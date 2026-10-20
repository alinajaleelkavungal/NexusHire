'use client'

import { useState } from 'react'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (newPassword !== confirm) return setMessage({ type: 'error', text: 'New passwords do not match' })
    setSaving(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) return setMessage({ type: 'error', text: data.error || 'Could not change password' })
    setMessage({ type: 'ok', text: 'Password changed.' })
    setCurrentPassword(''); setNewPassword(''); setConfirm('')
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500'

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      <h2 className="font-semibold text-gray-900">Change password</h2>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Current password</label>
        <input required type="password" autoComplete="current-password" className={inputClass} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">New password (at least 8 characters)</label>
        <input required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Confirm new password</label>
        <input required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={confirm} onChange={e => setConfirm(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <button disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Update password
        </button>
        {message && (
          <p role="status" className={`flex items-center gap-1.5 text-sm ${message.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
            {message.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </p>
        )}
      </div>
    </form>
  )
}
