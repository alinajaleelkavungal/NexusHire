'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Megaphone, MapPin, Building2, Users, CalendarDays, CalendarClock,
  Plus, Trash2, X, Loader2, AlertCircle, ImagePlus, ZoomIn, Pencil,
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
  const [editing, setEditing] = useState<Vacancy | null>(null)
  const [lightbox, setLightbox] = useState<Vacancy | null>(null)
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
    if (count < 2 || paused || reducedMotion || showForm || editing || lightbox) return
    const t = setInterval(() => setIndex(i => (i + 1) % count), SLIDE_MS)
    return () => clearInterval(t)
  }, [count, paused, reducedMotion, showForm, editing, lightbox])

  const go = (delta: number) => setIndex(i => (i + delta + count) % count)
  const isNewV = (v: Vacancy) => mounted && Date.now() - new Date(v.postedAt).getTime() < NEW_WINDOW_MS
  const current = vacancies[index] ?? vacancies[0]

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
          className="w-full max-w-[520px] border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50/40 rounded-2xl py-10 text-center text-gray-500 transition-colors"
        >
          <Megaphone className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          No vacancies posted yet. Click to post the first one.
        </button>
      ) : (
        <div
          className="relative w-full max-w-[520px] aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          aria-roledescription="carousel"
        >
          <div
            className="absolute inset-0 flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {vacancies.map((v, i) => {
              return (
                <article
                  key={v.id}
                  className="w-full h-full shrink-0 flex flex-col relative overflow-hidden"
                  aria-hidden={i !== index}
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                >
                  {v.hasImage ? (
                    <>
                      {/* The 4:3 box never changes: any poster shape is scaled to fit inside it, never cropped */}
                      <button
                        type="button"
                        onClick={() => setLightbox(v)}
                        aria-label={`View poster for ${v.title} full size`}
                        title="Click to enlarge"
                        className="group relative flex-1 min-h-0 bg-gray-100 cursor-zoom-in overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/vacancies/${v.id}/image`} alt={`Poster for ${v.title}`} className="absolute inset-0 w-full h-full object-contain" />
                        <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[11px] font-medium bg-black/55 text-white px-2 py-1 rounded-full opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="w-3 h-3" /> Enlarge
                        </span>
                      </button>
                      <div className={`shrink-0 px-4 py-2.5 text-white bg-gradient-to-r ${THEMES[i % THEMES.length]}`}>
                        <h3 className="font-bold text-sm leading-snug truncate">{v.title}</h3>
                        <VacancyMeta v={v} mounted={mounted} compact />
                      </div>
                    </>
                  ) : (
                    <div className={`flex-1 min-h-0 overflow-hidden px-14 pb-4 pt-14 text-white bg-gradient-to-br ${THEMES[i % THEMES.length]} flex flex-col`}>
                      <span className="self-start text-[11px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full mb-3">
                        We&apos;re hiring
                      </span>
                      <h3 className="text-xl font-extrabold tracking-tight leading-tight line-clamp-2">{v.title}</h3>
                      <VacancyMeta v={v} mounted={mounted} />
                      {v.details && <p className="mt-2 text-xs text-white/90 leading-relaxed line-clamp-3 whitespace-pre-line">{v.details}</p>}
                    </div>
                  )}

                </article>
              )
            })}
          </div>

          {/* One shared top bar keeps everything aligned: badges left · dots centre · actions right */}
          <div className="absolute top-3 inset-x-3 z-10 grid grid-cols-3 items-center pointer-events-none">
            <div className="flex items-center gap-2 justify-self-start">
              {isNewV(current) && (
                <span className="pointer-events-auto text-[11px] font-bold uppercase tracking-widest bg-yellow-300 text-yellow-900 px-2.5 py-1 rounded-full animate-pulse shadow">
                  New
                </span>
              )}
              {isAdmin && current.expired && !isNewV(current) && (
                <span className="pointer-events-auto text-[11px] font-bold uppercase tracking-widest bg-black/60 text-white px-2.5 py-1 rounded-full">
                  Expired
                </span>
              )}
            </div>

            <div className="justify-self-center">
              {count > 1 && (
                <div className="pointer-events-auto flex gap-1.5 bg-black/30 px-2.5 py-1.5 rounded-full">
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
              )}
            </div>

            <div className="flex items-center gap-2 justify-self-end">
              {isAdmin && (
                <>
                  <button
                    onClick={() => setEditing(current)}
                    aria-label={`Edit vacancy ${current.title}`}
                    title="Edit vacancy"
                    className="pointer-events-auto h-9 px-3 inline-flex items-center gap-1.5 rounded-full bg-white text-gray-800 text-sm font-semibold shadow-md ring-1 ring-black/10 hover:bg-green-50 hover:text-green-700 transition-colors"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => remove(current)}
                    aria-label={`Remove vacancy ${current.title}`}
                    title="Remove vacancy"
                    className="pointer-events-auto h-9 w-9 inline-flex items-center justify-center rounded-full bg-white text-gray-600 shadow-md ring-1 ring-black/10 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {count > 1 && (
            <>
              <button onClick={() => go(-1)} aria-label="Previous vacancy" className="absolute left-3 top-[42%] -translate-y-1/2 z-10 h-9 w-9 inline-flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => go(1)} aria-label="Next vacancy" className="absolute right-3 top-[42%] -translate-y-1/2 z-10 h-9 w-9 inline-flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}

      {lightbox && <PosterLightbox vacancy={lightbox} onClose={() => setLightbox(null)} />}

      {(showForm || editing) && (
        <VacancyFormModal
          vacancy={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => {
            if (!editing) setIndex(0) // a new vacancy is shown first
            setShowForm(false)
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </section>
  )
}

function VacancyMeta({ v, mounted, compact = false }: { v: Vacancy; mounted: boolean; compact?: boolean }) {
  const item = 'inline-flex items-center gap-1'
  const icon = compact ? 'w-3 h-3' : 'w-3.5 h-3.5'
  return (
    <div className={`text-white/90 ${compact ? 'text-[11px] mt-0.5' : 'text-xs mt-2.5 space-y-1.5'}`}>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {v.company && <span className={item}><Building2 className={icon} />{v.company}</span>}
        {v.location && <span className={item}><MapPin className={icon} />{v.location}</span>}
        {v.openings && <span className={item}><Users className={icon} />{v.openings} {v.openings === 1 ? 'opening' : 'openings'}</span>}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-white/80">
        <span className={item}><CalendarDays className={icon} />Posted {mounted ? fmt(v.postedAt) : ''}</span>
        {v.closingDate && <span className={item}><CalendarClock className={icon} />Apply by {mounted ? fmt(v.closingDate) : ''}</span>}
      </div>
    </div>
  )
}

// Full-size poster popup: click the backdrop, the X, or press Esc to close
function PosterLightbox({ vacancy, onClose }: { vacancy: Vacancy; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Poster for ${vacancy.title}`}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close poster"
        autoFocus
        className="absolute top-4 right-4 p-2 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/vacancies/${vacancy.id}/image`}
        alt={`Poster for ${vacancy.title}`}
        className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      <div className="mt-3 max-w-xl text-center text-white" onClick={e => e.stopPropagation()}>
        <p className="font-semibold">{vacancy.title}</p>
        {vacancy.details && <p className="text-sm text-white/75 mt-1 line-clamp-3 whitespace-pre-line">{vacancy.details}</p>}
      </div>
    </div>
  )
}

function VacancyFormModal({ vacancy, onClose, onSaved }: { vacancy?: Vacancy; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!vacancy
  const [form, setForm] = useState({
    title: vacancy?.title ?? '',
    company: vacancy?.company ?? '',
    location: vacancy?.location ?? '',
    openings: vacancy?.openings ? String(vacancy.openings) : '',
    closingDate: vacancy?.closingDate ?? '',
    details: vacancy?.details ?? '',
  })
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const hasExistingImage = !!vacancy?.hasImage
  // Earliest date the picker offers: today in the viewer's own timezone
  const todayLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
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
      if (removeImage && !image) body.append('removeImage', '1')
      const res = await fetch(isEdit ? `/api/vacancies/${vacancy!.id}` : '/api/vacancies', {
        method: isEdit ? 'PATCH' : 'POST',
        body,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || (isEdit ? 'Could not save changes' : 'Could not post vacancy'))
      onSaved()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }, [form, image, removeImage, isEdit, vacancy, onSaved])

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500'
  const label = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit vacancy' : 'Post a vacancy'}>
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit vacancy' : 'Post a vacancy'}</h3>
            <p className="text-xs text-gray-500">
              {isEdit
                ? 'Changes show on everyone\'s Home page straight away. The original posted date is kept.'
                : 'It appears on everyone\'s Home page. The posted date is added automatically.'}
            </p>
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
              <input type="date" min={todayLocal} className={input} value={form.closingDate} onChange={set('closingDate')} />
            </div>
          </div>
          <div>
            <label className={label}>Details</label>
            <textarea rows={4} maxLength={1500} className={input} value={form.details} onChange={set('details')} placeholder="Requirements, salary range, how to apply…" />
          </div>
          <div>
            <label className={label}>Poster image (optional)</label>
            {hasExistingImage && (
              <div className="flex items-center gap-3 mb-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {!removeImage && <img src={`/api/vacancies/${vacancy!.id}/image`} alt="Current poster" className="w-16 h-12 object-contain bg-white rounded border" />}
                <p className="flex-1 text-xs text-gray-600">
                  {removeImage ? 'The current poster will be removed.' : image ? 'The current poster will be replaced by the new image.' : 'Current poster is kept unless you replace or remove it.'}
                </p>
                <label className="flex items-center gap-1.5 text-xs text-red-600 cursor-pointer">
                  <input type="checkbox" checked={removeImage} onChange={e => setRemoveImage(e.target.checked)} /> Remove
                </label>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => setImage(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50/40 rounded-lg w-full">
              <ImagePlus className="w-4 h-4 text-gray-400" />
              {image ? `${image.name} (${(image.size / 1024).toFixed(0)} KB)` : hasExistingImage ? 'Choose a new poster to replace it' : 'Add a poster image — PNG, JPG or WEBP, up to 5 MB'}
            </button>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-white border hover:bg-gray-50 rounded-lg">Cancel</button>
          <button disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 rounded-lg">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {isEdit ? 'Save changes' : 'Post vacancy'}
          </button>
        </div>
      </form>
    </div>
  )
}
