'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Megaphone, MapPin, Building2, Users, CalendarDays, CalendarClock,
  Plus, Trash2, X, Loader2, AlertCircle, ImagePlus,
} from 'lucide-react'
import type { Vacancy } from '@/lib/vacancies'

const SLIDE_MS = 6000
const NEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000

// Soft rotating backgrounds for posters without an image
const THEMES = [
  'from-green-600 to-emerald-700',
  'from-blue-600 to-indigo-700',
  'from-violet-600 to-purple-700',
  'from-amber-500 to-orange-600',
]

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function VacancyBoard({ vacancies, isAdmin }: { vacancies: Vacancy[]; isAdmin: boolean }) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [mounted, setMounted] = useState(false) // dates/NEW badge render client-side only (timezone-safe)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const count = vacancies.length

  useEffect(() => {
    setMounted(true)
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // Keep the index valid when vacancies are removed
  useEffect(() => {
    if (index >= count) setIndex(0)
  }, [count, index])

  useEffect(() => {
    if (count < 2 || paused || reducedMotion || showForm) return
    const t = setInterval(() => setIndex(i => (i + 1) % count), SLIDE_MS)
    return () => clearInterval(t)
  }, [count, paused, reducedMotion, showForm])

  const go = (delta: number) => setIndex(i => (i + delta + count) % count)

  const remove = async (v: Vacancy) => {
    if (!confirm(`Take down the vacancy "${v.title}"?`)) return
    const res = await fetch(`/api/vacancies/${v.id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else alert('Could not remove the vacancy')
  }

  if (count === 0 && !isAdmin) return null

  return (
    <section aria-label="Vacancies" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-green-600" /> Current vacancies
        </h2>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Post vacancy
          </button>
        )}
      </div>

      {count === 0 ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50/40 rounded-2xl py-12 text-center text-gray-500 transition-colors"
        >
          <Megaphone className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          No vacancies posted yet. Click to post the first one.
        </button>
      ) : (
        <div
          className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          aria-roledescription="carousel"
        >
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {vacancies.map((v, i) => {
              const isNew = mounted && Date.now() - new Date(v.postedAt).getTime() < NEW_WINDOW_MS
              return (
                <article
                  key={v.id}
                  className="w-full shrink-0 flex flex-col md:flex-row min-h-[260px]"
                  aria-hidden={i !== index}
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                >
                  <div className={`flex-1 p-6 sm:p-8 text-white bg-gradient-to-br ${THEMES[i % THEMES.length]} flex flex-col`}>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
                        We&apos;re hiring
                      </span>
                      {isNew && (
                        <span className="text-[11px] font-bold uppercase tracking-widest bg-yellow-300 text-yellow-900 px-2.5 py-1 rounded-full animate-pulse">
                          New
                        </span>
                      )}
                      {isAdmin && v.expired && (
                        <span className="text-[11px] font-bold uppercase tracking-widest bg-black/30 px-2.5 py-1 rounded-full">
                          Expired
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">{v.title}</h3>

                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm text-white/90">
                      {v.company && <span className="inline-flex items-center gap-1.5"><Building2 className="w-4 h-4" />{v.company}</span>}
                      {v.location && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" />{v.location}</span>}
                      {v.openings && <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" />{v.openings} {v.openings === 1 ? 'opening' : 'openings'}</span>}
                    </div>

                    {v.details && <p className="mt-4 text-sm text-white/90 leading-relaxed line-clamp-4 whitespace-pre-line">{v.details}</p>}

                    <div className="mt-auto pt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-white/80">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" /> Posted {mounted ? fmt(v.postedAt) : ''}
                      </span>
                      {v.closingDate && (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5" /> Apply by {mounted ? fmt(v.closingDate) : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {v.hasImage && (
                    <div className="md:w-2/5 bg-gray-100 max-md:h-56">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/vacancies/${v.id}/image`} alt={`Poster for ${v.title}`} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => remove(v)}
                      aria-label={`Remove vacancy ${v.title}`}
                      title="Remove vacancy"
                      className="absolute top-3 right-3 p-2 rounded-full bg-black/35 hover:bg-red-600 text-white transition-colors"
                      style={{ display: i === index ? 'block' : 'none' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </article>
              )
            })}
          </div>

          {count > 1 && (
            <>
              <button onClick={() => go(-1)} aria-label="Previous vacancy" className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => go(1)} aria-label="Next vacancy" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {vacancies.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => setIndex(i)}
                    aria-label={`Show vacancy ${i + 1}`}
                    aria-current={i === index}
                    className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showForm && (
        <PostVacancyModal
          onClose={() => setShowForm(false)}
          onPosted={() => { setShowForm(false); setIndex(0); router.refresh() }}
        />
      )}
    </section>
  )
}

function PostVacancyModal({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [form, setForm] = useState({ title: '', company: '', location: '', openings: '', closingDate: '', details: '' })
  const [image, setImage] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body = new FormData()
      Object.entries(form).forEach(([k, v]) => body.append(k, v))
      if (image) body.append('image', image)
      const res = await fetch('/api/vacancies', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not post vacancy')
      onPosted()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }, [form, image, onPosted])

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500'
  const label = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Post a vacancy">
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Post a vacancy</h3>
            <p className="text-xs text-gray-500">It appears on everyone&apos;s Home page. The posted date is added automatically.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className={label}>Job title <span className="text-red-500">*</span></label>
            <input required maxLength={120} className={input} value={form.title} onChange={set('title')} placeholder="e.g. Senior Accountant" autoFocus />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Company</label>
              <input className={input} value={form.company} onChange={set('company')} placeholder="e.g. Al Noor Trading" />
            </div>
            <div>
              <label className={label}>Location</label>
              <input className={input} value={form.location} onChange={set('location')} placeholder="e.g. Dubai" />
            </div>
            <div>
              <label className={label}>Number of openings</label>
              <input type="number" min={1} className={input} value={form.openings} onChange={set('openings')} placeholder="e.g. 3" />
            </div>
            <div>
              <label className={label}>Last date to apply</label>
              <input type="date" className={input} value={form.closingDate} onChange={set('closingDate')} />
            </div>
          </div>
          <div>
            <label className={label}>Details</label>
            <textarea rows={4} maxLength={1500} className={input} value={form.details} onChange={set('details')} placeholder="Requirements, salary range, how to apply…" />
          </div>
          <div>
            <label className={label}>Poster image (optional)</label>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => setImage(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50/40 rounded-lg w-full">
              <ImagePlus className="w-4 h-4 text-gray-400" />
              {image ? `${image.name} (${(image.size / 1024).toFixed(0)} KB)` : 'Add a poster image — PNG, JPG or WEBP, up to 5 MB'}
            </button>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-white border hover:bg-gray-50 rounded-lg">Cancel</button>
          <button disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 rounded-lg">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Post vacancy
          </button>
        </div>
      </form>
    </div>
  )
}
