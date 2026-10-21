'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Megaphone, MapPin, Building2, Users, CalendarDays, CalendarClock,
  Plus, Trash2, X, Loader2, AlertCircle, ImagePlus, ZoomIn, Pencil, Search, ChevronDown, ChevronUp,
} from '@/components/icons'
import type { Vacancy } from '@/lib/vacancies'

const SLIDE_MS = 6000
const PER_VIEW = 2 // posters shown side by side in the carousel
const LIST_PREVIEW = 8 // cards shown in the list below before "Show all"
const CAROUSEL_ID = 'vacancy-carousel'
const NEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000
const POSTER_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const POSTER_MAX_BYTES = 5 * 1024 * 1024

// Flat rotating backgrounds for posters without an image
const THEMES = [
  'bg-green-500',
  'bg-gray-600',
  'bg-red-500',
  'bg-amber-500',
]

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function VacancyBoard({ vacancies, isAdmin }: { vacancies: Vacancy[]; isAdmin: boolean }) {
  const router = useRouter()
  const [index, setIndex] = useState(0) // first of the posters currently in view
  const [paused, setPaused] = useState(false)
  const [mounted, setMounted] = useState(false) // dates/NEW badge render client-side only (timezone-safe)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Vacancy | null>(null)
  const [lightbox, setLightbox] = useState<Vacancy | null>(null)
  const count = vacancies.length
  const perView = Math.max(1, Math.min(PER_VIEW, count))
  const positions = Math.max(1, count - perView + 1) // how many distinct starting points the carousel has

  useEffect(() => {
    setMounted(true)
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // Keep the index valid when vacancies are removed
  useEffect(() => {
    if (index >= positions) setIndex(0)
  }, [positions, index])

  useEffect(() => {
    if (positions < 2 || paused || reducedMotion || showForm || editing || lightbox) return
    const t = setInterval(() => setIndex(i => (i + 1) % positions), SLIDE_MS)
    return () => clearInterval(t)
  }, [positions, paused, reducedMotion, showForm, editing, lightbox])

  const go = (delta: number) => setIndex(i => (i + delta + positions) % positions)
  // Bring a vacancy into view (it lands in the left slot unless it's one of the last ones)
  const show = (i: number) => setIndex(Math.min(i, positions - 1))
  const inView = (i: number) => i >= index && i < index + perView
  const isNewV = (v: Vacancy) => mounted && Date.now() - new Date(v.postedAt).getTime() < NEW_WINDOW_MS

  const remove = async (v: Vacancy) => {
    if (!confirm(`Take down the vacancy "${v.title}"?`)) return
    try {
      const res = await fetch(`/api/vacancies/${v.id}`, { method: 'DELETE' })
      // 404 = it was already removed (e.g. this page was out of date): just refresh the list
      if (res.ok || res.status === 404) return router.refresh()

      const data = await res.json().catch(() => ({}))
      alert(
        res.status === 401 ? 'Your session has expired. Please sign in again.'
        : res.status === 403 ? 'Only an admin can remove vacancies.'
        : `Could not remove the vacancy${data.error ? `: ${data.error}` : ''}`
      )
    } catch {
      alert('Could not reach the server. Check your connection and try again.')
    }
  }

  if (count === 0 && !isAdmin) return null

  return (
    <section aria-label="Vacancies" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          <Megaphone className="w-4 h-4 text-green-600" /> Current vacancies
          {count > 0 && <span className="text-gray-700 bg-gray-100 border border-gray-200 rounded-sm px-1.5 py-px tabular-nums">{count}</span>}
        </h2>
        <div className="flex items-center gap-3">
          {count > perView && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 tabular-nums mr-1">
                {index + 1}–{index + perView} of {count}
              </span>
              <button onClick={() => go(-1)} aria-label="Previous vacancies" className="h-8 w-8 inline-flex items-center justify-center rounded-sm bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => go(1)} aria-label="Next vacancies" className="h-8 w-8 inline-flex items-center justify-center rounded-sm bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Post vacancy
            </button>
          )}
        </div>
      </div>

      {count === 0 ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full h-[390px] border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50/40 rounded-md text-center text-gray-500 transition-colors"
        >
          <Megaphone className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          No vacancies posted yet. Click to post the first one.
        </button>
      ) : (
        <>
          {/* Same height as before, now full width: two posters side by side */}
          <div
            id={CAROUSEL_ID}
            className="relative w-full h-[390px] rounded-md overflow-hidden border border-gray-300 bg-white"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            aria-roledescription="carousel"
          >
            <div
              className="absolute inset-0 flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${index * (100 / perView)}%)` }}
            >
              {vacancies.map((v, i) => (
                <article
                  key={v.id}
                  style={{ width: `${100 / perView}%` }}
                  className="h-full shrink-0 flex flex-col relative overflow-hidden border-r border-gray-200 last:border-r-0"
                  aria-hidden={!inView(i)}
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                >
                  {v.hasImage ? (
                    <>
                      {/* Any poster shape is scaled to fit inside its slot, never cropped */}
                      <button
                        type="button"
                        onClick={() => setLightbox(v)}
                        tabIndex={inView(i) ? 0 : -1}
                        aria-label={`View poster for ${v.title} full size`}
                        title="Click to enlarge"
                        className="group relative flex-1 min-h-0 bg-gray-100 cursor-zoom-in overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.imageUrl!} alt={`Poster for ${v.title}`} className="absolute inset-0 w-full h-full object-contain" />
                        <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[11px] font-medium bg-black/55 text-white px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="w-3 h-3" /> Enlarge
                        </span>
                      </button>
                      <div className="shrink-0 px-4 py-2.5 bg-white border-t border-gray-200">
                        <h3 className="font-bold text-sm leading-snug truncate text-gray-900">{v.title}</h3>
                        <VacancyMeta v={v} mounted={mounted} compact tone="light" />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 min-h-0 overflow-hidden bg-green-50 flex flex-col pt-14 pb-4 px-8">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-700 flex items-center gap-2">
                        <span className={`w-6 h-0.5 ${THEMES[i % THEMES.length]}`} /> We&apos;re hiring
                      </p>
                      <h3 className="mt-2 text-2xl font-extrabold tracking-tight leading-tight text-gray-900 line-clamp-2">{v.title}</h3>
                      {v.details && <p className="mt-2 text-[13px] text-gray-600 leading-relaxed line-clamp-4 whitespace-pre-line">{v.details}</p>}
                      <div className="mt-auto pt-3 border-t border-green-200">
                        <VacancyMeta v={v} mounted={mounted} tone="light" />
                      </div>
                    </div>
                  )}

                  {/* Each poster carries its own badges (left) and admin actions (right) */}
                  <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2">
                      {isNewV(v) && (
                        <span className="text-[11px] font-bold uppercase tracking-widest bg-amber-300 text-amber-900 px-2.5 py-1 rounded-sm">New</span>
                      )}
                      {isAdmin && v.expired && (
                        <span className="text-[11px] font-bold uppercase tracking-widest bg-gray-800 text-white px-2.5 py-1 rounded-sm">Expired</span>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing(v)}
                          tabIndex={inView(i) ? 0 : -1}
                          aria-label={`Edit vacancy ${v.title}`}
                          title="Edit vacancy"
                          className="pointer-events-auto h-8 px-2.5 inline-flex items-center gap-1.5 rounded-sm bg-white text-gray-800 text-sm font-semibold ring-1 ring-gray-300 hover:bg-green-50 hover:text-green-700 transition-colors"
                        >
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => remove(v)}
                          tabIndex={inView(i) ? 0 : -1}
                          aria-label={`Remove vacancy ${v.title}`}
                          title="Remove vacancy"
                          className="pointer-events-auto h-8 w-8 inline-flex items-center justify-center rounded-sm bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {positions > 1 && (
              <>
                <button onClick={() => go(-1)} aria-label="Previous vacancies" className="absolute left-3 top-[45%] -translate-y-1/2 z-20 h-10 w-10 inline-flex items-center justify-center rounded-full bg-white/95 hover:bg-white text-gray-800 ring-1 ring-gray-300 shadow-sm transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => go(1)} aria-label="Next vacancies" className="absolute right-3 top-[45%] -translate-y-1/2 z-20 h-10 w-10 inline-flex items-center justify-center rounded-full bg-white/95 hover:bg-white text-gray-800 ring-1 ring-gray-300 shadow-sm transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          <VacancyList vacancies={vacancies} mounted={mounted} isAdmin={isAdmin} isNew={isNewV} inView={inView} onSelect={show} />
        </>
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

// Every vacancy as a compact card grid under the carousel: searchable, and collapsed when there are many
function VacancyList({ vacancies, mounted, isAdmin, isNew, inView, onSelect }: {
  vacancies: Vacancy[]
  mounted: boolean
  isAdmin: boolean
  isNew: (v: Vacancy) => boolean
  inView: (i: number) => boolean
  onSelect: (i: number) => void
}) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  const q = query.trim().toLowerCase()
  const matches = vacancies
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => !q || [v.title, v.company, v.location].some(s => s?.toLowerCase().includes(q)))
  const visible = expanded || q ? matches : matches.slice(0, LIST_PREVIEW)

  const pick = (i: number) => {
    onSelect(i)
    document.getElementById(CAROUSEL_ID)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) // it sits above the list
  }

  return (
    <div className="border border-gray-300 rounded-md bg-white">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-900">
          All vacancies <span className="font-normal text-gray-500">· {q ? `${matches.length} of ${vacancies.length}` : vacancies.length}</span>
        </p>
        <label className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search title, company or location"
            aria-label="Search vacancies"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </label>
      </div>

      {matches.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">No vacancies match &ldquo;{query}&rdquo;.</p>
      ) : (
        <ul className="grid grid-cols-3 xl:grid-cols-4 gap-3 p-4">
          {visible.map(({ v, i }) => (
            <li key={v.id}>
              <button
                onClick={() => pick(i)}
                aria-current={inView(i)}
                className={`w-full h-full text-left flex gap-3 p-2.5 rounded-md border transition-colors ${
                  inView(i) ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="w-14 h-14 shrink-0 rounded-sm overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {v.hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.imageUrl!} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <Megaphone className="w-5 h-5 text-green-600" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-1.5">
                    <span className="flex-1 min-w-0 text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{v.title}</span>
                    {isNew(v) && <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-300 text-amber-900 px-1 py-0.5 rounded-sm shrink-0">New</span>}
                    {isAdmin && v.expired && <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-800 text-white px-1 py-0.5 rounded-sm shrink-0">Expired</span>}
                  </span>
                  <span className="block text-xs text-gray-500 truncate mt-0.5">
                    {[v.company, v.location].filter(Boolean).join(' · ') || 'Open position'}
                  </span>
                  {v.closingDate && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                      <CalendarClock className="w-3 h-3" /> Apply by {mounted ? fmt(v.closingDate) : ''}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!q && matches.length > LIST_PREVIEW && (
        <div className="border-t border-gray-200 px-4 py-2.5 text-center">
          <button onClick={() => setExpanded(e => !e)} className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800">
            {expanded ? <>Show fewer <ChevronUp className="w-4 h-4" /></> : <>Show all {matches.length} vacancies <ChevronDown className="w-4 h-4" /></>}
          </button>
        </div>
      )}
    </div>
  )
}

function VacancyMeta({ v, mounted, compact = false, tone = 'dark' }: { v: Vacancy; mounted: boolean; compact?: boolean; tone?: 'dark' | 'light' }) {
  const main = tone === 'light' ? 'text-gray-700' : 'text-white/90'
  const sub = tone === 'light' ? 'text-gray-500' : 'text-white/80'
  const item = 'inline-flex items-center gap-1'
  const icon = compact ? 'w-3 h-3' : 'w-3.5 h-3.5'
  return (
    <div className={`${main} ${compact ? 'text-[11px] mt-0.5' : 'text-xs mt-2.5 space-y-1.5'}`}>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {v.company && <span className={item}><Building2 className={icon} />{v.company}</span>}
        {v.location && <span className={item}><MapPin className={icon} />{v.location}</span>}
        {v.openings && <span className={item}><Users className={icon} />{v.openings} {v.openings === 1 ? 'opening' : 'openings'}</span>}
      </div>
      <div className={`flex flex-wrap gap-x-3 gap-y-0.5 ${sub}`}>
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
        src={vacancy.imageUrl!}
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
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  // Local preview of the chosen image, released when it changes or the form closes
  useEffect(() => {
    if (!image) return setPreview(null)
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  // Shared by the file picker, drag-and-drop and paste
  const pickImage = useCallback((file: File | null | undefined) => {
    if (!file) return
    if (!POSTER_TYPES.includes(file.type)) return setError('Poster must be a PNG, JPG or WEBP image.')
    if (file.size > POSTER_MAX_BYTES) return setError('Poster image must be 5 MB or smaller.')
    setError('')
    // Pasted screenshots often arrive without a useful name
    setImage(file.name && file.name !== 'image.png' ? file : new File([file], `pasted-poster.${file.type.split('/')[1]}`, { type: file.type }))
  }, [])

  // Paste an image anywhere in the form (text pastes into fields are left alone)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find(f => f.type.startsWith('image/'))
      if (!file) return
      e.preventDefault()
      pickImage(file)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [pickImage])

  const set =(k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
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
      if (isEdit && res.status === 404) return onSaved() // already removed: refresh the list
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
                {!removeImage && <img src={vacancy!.imageUrl!} alt="Current poster" className="w-16 h-12 object-contain bg-white rounded border" />}
                <p className="flex-1 text-xs text-gray-600">
                  {removeImage ? 'The current poster will be removed.' : image ? 'The current poster will be replaced by the new image.' : 'Current poster is kept unless you replace or remove it.'}
                </p>
                <label className="flex items-center gap-1.5 text-xs text-red-600 cursor-pointer">
                  <input type="checkbox" checked={removeImage} onChange={e => setRemoveImage(e.target.checked)} /> Remove
                </label>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept={POSTER_TYPES.join(',')}
              className="hidden"
              onChange={e => { pickImage(e.target.files?.[0]); e.target.value = '' }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false) }}
              onDrop={e => { e.preventDefault(); setDragging(false); pickImage(e.dataTransfer.files?.[0]) }}
              className={`relative flex flex-col items-center justify-center gap-2 px-4 py-6 min-h-[150px] text-sm text-gray-700 border-2 border-dashed rounded-lg w-full text-center transition-colors ${
                dragging ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50/40'
              }`}
            >
              {preview && !dragging ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Selected poster preview" className="max-h-40 max-w-full object-contain bg-white rounded border" />
                  <span className="max-w-full truncate text-xs text-gray-600">
                    {image!.name} ({(image!.size / 1024).toFixed(0)} KB) · click, drop or paste to change
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className={`w-8 h-8 ${dragging ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="font-medium text-gray-800">
                    {dragging ? 'Drop the image here'
                      : hasExistingImage ? 'Drag & drop a new poster here, or click to browse'
                      : 'Drag & drop a poster here, or click to browse'}
                  </span>
                  {!dragging && (
                    <span className="text-xs text-gray-500">
                      You can also paste an image with <kbd className="px-1.5 py-0.5 rounded border border-gray-300 bg-white font-mono text-[11px]">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 rounded border border-gray-300 bg-white font-mono text-[11px]">V</kbd> · PNG, JPG or WEBP, up to 5 MB
                    </span>
                  )}
                </>
              )}
              {image && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Clear selected image"
                  onClick={e => { e.stopPropagation(); setImage(null) }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setImage(null) } }}
                  className="absolute top-2 right-2 p-1 bg-white border border-gray-200 text-gray-500 hover:text-red-600 rounded-full"
                >
                  <X className="w-4 h-4" />
                </span>
              )}
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
