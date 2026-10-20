'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, KeyRound, Power, Loader2, Store, AlertCircle, CheckCircle } from 'lucide-react'

interface Branch {
  id: string
  loginId: string
  name: string
  active: boolean
  candidateCount: number
}

export default function BranchesManager() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ loginId: '', name: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/branches')
    if (res.ok) setBranches((await res.json()).branches)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/admin/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) return setMessage({ type: 'error', text: data.error || 'Could not create branch' })
    setMessage({ type: 'ok', text: `Branch "${form.name}" created. Share the ID and password with them.` })
    setForm({ loginId: '', name: '', password: '' })
    load()
  }

  const resetPassword = async (b: Branch) => {
    const password = prompt(`New password for ${b.name} (${b.loginId}) — at least 8 characters:`)
    if (!password) return
    const res = await fetch(`/api/admin/branches/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json().catch(() => ({}))
    setMessage(res.ok
      ? { type: 'ok', text: `Password reset for ${b.name}.` }
      : { type: 'error', text: data.error || 'Could not reset password' })
  }

  const toggleActive = async (b: Branch) => {
    if (b.active && !confirm(`Disable ${b.name}? They will be signed out and unable to log in. Their CVs are kept.`)) return
    await fetch(`/api/admin/branches/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !b.active }),
    })
    load()
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500'

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Branches</h1>
        <p className="text-sm text-gray-500 mt-1">
          Each branch logs in with its own ID and password and sees only the CVs it uploaded. Admins see everything.
        </p>
      </div>

      <form onSubmit={create} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4" /> Add a branch</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Branch name</label>
            <input required className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kochi Branch" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Branch ID (login)</label>
            <input required className={inputClass} value={form.loginId} onChange={e => setForm({ ...form, loginId: e.target.value })} placeholder="e.g. kochi01" autoComplete="off" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input required type="text" minLength={8} className={inputClass} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" autoComplete="off" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create branch
          </button>
          {message && (
            <p role="status" className={`flex items-center gap-1.5 text-sm ${message.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
              {message.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </p>
          )}
        </div>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : branches.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Store className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            No branches yet. Add your first one above.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {branches.map(b => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="flex-1 min-w-[160px]">
                  <p className="font-medium text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-500">ID: {b.loginId} · {b.candidateCount} CV{b.candidateCount === 1 ? '' : 's'}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${b.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {b.active ? 'Active' : 'Disabled'}
                </span>
                <button onClick={() => resetPassword(b)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg">
                  <KeyRound className="w-3.5 h-3.5" /> Reset password
                </button>
                <button onClick={() => toggleActive(b)} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg ${b.active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-700 border-green-200 hover:bg-green-50'}`}>
                  <Power className="w-3.5 h-3.5" /> {b.active ? 'Disable' : 'Enable'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
