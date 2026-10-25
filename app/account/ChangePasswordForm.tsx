'use client'

import { useState } from 'react'
import { CircleNotch, WarningCircle, CheckCircle } from '@/components/icons'

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

  const inputClass = 'w-full px-3.5 py-2.5 border border-[#e2dcce] dark:border-[#352c25] bg-white dark:bg-[#241c17] rounded-xl text-sm text-[#24211f] dark:text-[#f3eee8] placeholder:text-[#a89c8e] focus:outline-none focus:ring-2 focus:ring-[#e85d3f]/40 focus:border-[#e85d3f] transition-all'

  return (
    <form onSubmit={submit} className="bg-white dark:bg-[#1e1814] border border-[#e2dcce] dark:border-[#352c25] rounded-3xl p-6 shadow-sm space-y-4 transition-colors">
      <h2 className="text-base font-bold text-[#24211f] dark:text-[#f3eee8]">Change password</h2>
      <div>
        <label className="block text-xs font-bold text-[#423a30] dark:text-[#a89c8e] mb-1.5 uppercase tracking-wider">Current password</label>
        <input required type="password" autoComplete="current-password" className={inputClass} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold text-[#423a30] dark:text-[#a89c8e] mb-1.5 uppercase tracking-wider">New password (at least 8 characters)</label>
        <input required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold text-[#423a30] dark:text-[#a89c8e] mb-1.5 uppercase tracking-wider">Confirm new password</label>
        <input required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={confirm} onChange={e => setConfirm(e.target.value)} />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[#24211f] dark:bg-[#e85d3f] hover:bg-black dark:hover:bg-[#d64f33] disabled:opacity-60 text-white text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer">
          {saving && <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />} Update password
        </button>
        {message && (
          <p role="status" className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${message.type === 'ok' ? 'bg-[#fefcf3] dark:bg-[#292215] text-[#b58933] border border-[#fbedb8] dark:border-[#4a391e]' : 'bg-[#fdf1ef] dark:bg-[#331c17] text-[#aa2c1e] dark:text-[#ff7866] border border-[#f9dcd8] dark:border-[#52251e]'}`}>
            {message.type === 'ok' ? <CheckCircle weight="fill" className="w-4 h-4 text-[#b58933]" /> : <WarningCircle weight="fill" className="w-4 h-4 text-[#aa2c1e] dark:text-[#ff7866]" />}
            {message.text}
          </p>
        )}
      </div>
    </form>
  )
}
