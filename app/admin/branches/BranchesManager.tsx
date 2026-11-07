'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Key, Power, CircleNotch, Branches, WarningCircle, CheckCircle } from '@/components/icons'

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

  const inputClass = 'w-full px-3 py-2 text-xs sm:text-sm bg-[#faf8f5] dark:bg-[#1a1410] border border-[#c8c0af] dark:border-[#3a3028] text-[#191614] dark:text-[#f3eee8] placeholder-[#8a7f70] dark:placeholder-[#6b6055] rounded-sm focus:outline-none focus:border-[#191614] dark:focus:border-[#6b5e52] transition-all font-sans'

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 select-none font-sans min-h-screen">
      {/* Header Row */}
      <div>
        <div className="mb-1">
          <span className="text-[10px] sm:text-[11px] font-jakarta tracking-[0.2em] uppercase font-bold text-[#e85d3f]">
            ORGANIZATIONAL ACCESS · REGIONAL NODES
          </span>
        </div>
        <h1
          className="text-3xl sm:text-4xl font-black text-[#191614] dark:text-[#f3eee8] tracking-tight leading-none mt-1 mb-2 font-sans"
          style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
        >
          Branches
        </h1>
        <p className="text-sm font-medium text-[#6b6257] dark:text-[#a89c8e]">
          Manage regional branch accounts and credentials. Branches can only view and manage CVs they upload.
        </p>
      </div>

      {/* Add a Branch Architectural Card */}
      <form onSubmit={create} className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] rounded-sm p-5 sm:p-6 space-y-5 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-[#c8c0af] dark:border-[#3d3329]">
          <h2 className="text-xs sm:text-[13px] font-jakarta tracking-[0.14em] uppercase font-bold text-[#191614] dark:text-[#f3eee8] flex items-center gap-2">
            <Plus weight="bold" className="w-4 h-4 text-[#e85d3f]" /> Add a branch
          </h2>
          <span className="text-[10px] font-jakarta uppercase tracking-wider text-[#7a7062] dark:text-[#a89c8e]">
            Account Provisioning
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-jakarta uppercase tracking-[0.12em] font-bold text-[#7a7062] dark:text-[#a89c8e] mb-1.5">
              Branch name
            </label>
            <input
              required
              className={inputClass}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Kochi Branch"
            />
          </div>
          <div>
            <label className="block text-[10px] font-jakarta uppercase tracking-[0.12em] font-bold text-[#7a7062] dark:text-[#a89c8e] mb-1.5">
              Branch ID (login)
            </label>
            <input
              required
              className={inputClass}
              value={form.loginId}
              onChange={e => setForm({ ...form, loginId: e.target.value })}
              placeholder="e.g. kochi01"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-[10px] font-jakarta uppercase tracking-[0.12em] font-bold text-[#7a7062] dark:text-[#a89c8e] mb-1.5">
              Password
            </label>
            <input
              required
              type="text"
              minLength={8}
              className={inputClass}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#181513] hover:bg-black text-white dark:bg-[#f3eee8] dark:text-[#191614] dark:hover:bg-white text-xs font-jakarta uppercase tracking-wider font-bold rounded-sm shadow-2xs hover:shadow transition-all shrink-0 cursor-pointer disabled:opacity-60"
          >
            {saving ? <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" /> : <Plus weight="bold" className="w-3.5 h-3.5" />}
            <span>Create branch</span>
          </button>
          {message && (
            <p
              role="status"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-jakarta ${
                message.type === 'ok'
                  ? 'border-[#c4dec4] dark:border-[#224422] bg-[#f2f8f2] dark:bg-[#142614] text-[#22632e] dark:text-[#4ade80]'
                  : 'border-[#e0b4b4] dark:border-[#522525] bg-[#fbf2f2] dark:bg-[#2a1616] text-[#aa2c1e] dark:text-[#f87171]'
              }`}
            >
              {message.type === 'ok' ? <CheckCircle weight="fill" className="w-3.5 h-3.5 shrink-0" /> : <WarningCircle weight="fill" className="w-3.5 h-3.5 shrink-0" />}
              <span>{message.text}</span>
            </p>
          )}
        </div>
      </form>

      {/* Branches List Container */}
      <div className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[#c8c0af] dark:border-[#3d3329]">
          <h2 className="text-xs font-jakarta tracking-[0.14em] uppercase font-bold text-[#7a7062] dark:text-[#a89c8e]">
            Configured Branches
          </h2>
          <span className="text-[10px] font-jakarta uppercase tracking-wider text-[#8a7f70] dark:text-[#6b6055] tabular-nums">
            {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center text-[#8a7f70]">
            <CircleNotch weight="bold" className="w-5 h-5 animate-spin" />
          </div>
        ) : branches.length === 0 ? (
          <div className="p-12 text-center text-[#7a7062] dark:text-[#a89c8e]">
            <Branches weight="bold" className="w-8 h-8 mx-auto text-[#a89c8e] mb-2" />
            <p className="font-bold text-sm text-[#191614] dark:text-[#f3eee8] font-sans">No branches provisioned yet</p>
            <p className="text-xs font-jakarta uppercase tracking-wider text-[#8a7f70] mt-1">Use the form above to create the first branch.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#c8c0af] dark:divide-[#3d3329]">
            {branches.map(b => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-[#faf8f5] dark:hover:bg-[#1a1410] transition-colors">
                <div className="w-9 h-9 rounded-sm bg-[#faf8f5] dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#e85d3f] flex items-center justify-center shrink-0">
                  <Branches weight="bold" className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <p className="font-black text-sm sm:text-base text-[#191614] dark:text-[#f3eee8] font-sans">{b.name}</p>
                  <p className="text-xs font-jakarta text-[#7a7062] dark:text-[#a89c8e] mt-0.5">
                    ID: <span className="font-bold text-[#191614] dark:text-[#f3eee8]">{b.loginId}</span>
                    <span className="opacity-40 mx-1.5">·</span>
                    <span className="tabular-nums font-bold text-[#191614] dark:text-[#f3eee8]">{b.candidateCount}</span> CV{b.candidateCount === 1 ? '' : 's'}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-sm text-[10px] font-jakarta font-bold tracking-wider uppercase border ${
                    b.active
                      ? 'border-[#c4dec4] dark:border-[#224422] bg-[#f2f8f2] dark:bg-[#142614] text-[#22632e] dark:text-[#4ade80]'
                      : 'border-[#e0b4b4] dark:border-[#522525] bg-[#fbf2f2] dark:bg-[#2a1616] text-[#aa2c1e] dark:text-[#f87171]'
                  }`}
                >
                  {b.active ? 'Active' : 'Disabled'}
                </span>
                <button
                  onClick={() => resetPassword(b)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-jakarta uppercase tracking-wider font-semibold text-[#191614] dark:text-[#f3eee8] border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#1f1a16] hover:bg-[#faf8f5] dark:hover:bg-[#251f1a] rounded-sm transition-colors cursor-pointer"
                >
                  <Key weight="bold" className="w-3.5 h-3.5" />
                  <span>Reset password</span>
                </button>
                <button
                  onClick={() => toggleActive(b)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-jakarta uppercase tracking-wider font-semibold border rounded-sm transition-colors cursor-pointer ${
                    b.active
                      ? 'text-[#aa2c1e] dark:text-[#f87171] border-[#e0b4b4] dark:border-[#522525] hover:bg-[#fbf2f2] dark:hover:bg-[#2a1616]'
                      : 'text-[#22632e] dark:text-[#4ade80] border-[#c4dec4] dark:border-[#224422] hover:bg-[#f2f8f2] dark:hover:bg-[#142614]'
                  }`}
                >
                  <Power weight="bold" className="w-3.5 h-3.5" />
                  <span>{b.active ? 'Disable' : 'Enable'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
