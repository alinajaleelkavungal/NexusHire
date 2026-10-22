'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Plus, Trash2, Pencil, X, Loader2, AlertCircle, ImagePlus, ZoomIn, CalendarDays, CalendarClock
} from '@/components/icons'
import type { Vacancy } from '@/lib/vacancies'

const PAGE_SIZE = 9
const POSTER_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const POSTER_MAX_BYTES = 5 * 1024 * 1024

function formatDate(isoOrDateStr: string | null | undefined): string {
  if (!isoOrDateStr) return ''
  const d = new Date(isoOrDateStr)
  if (isNaN(d.getTime())) return String(isoOrDateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

type VacancyStatus = 'NEW' | 'CLOSING SOON' | 'OPEN' | 'CLOSED'

function getVacancyStatus(v: Vacancy, mounted: boolean): VacancyStatus {
  if (v.expired) return 'CLOSED'
  if (!mounted) return 'OPEN'

  const now = Date.now()
  if (v.closingDate) {
    const closeTime = new Date(v.closingDate).getTime()
    const diffDays = (closeTime - now) / (1000 * 60 * 60 * 24)
    if (diffDays <= 0) return 'CLOSED'
    if (diffDays <= 14) return 'CLOSING SOON'
  }

  const postedTime = new Date(v.postedAt).getTime()
  const daysSincePosted = (now - postedTime) / (1000 * 60 * 60 * 24)
  if (daysSincePosted <= 5) return 'NEW'

  return 'OPEN'
}

interface VacancyBoardProps {
  vacancies: Vacancy[]
  isAdmin?: boolean
  candidates?: any[]
}

export default function VacancyBoard({ vacancies, isAdmin = true, candidates }: VacancyBoardProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<'active' | 'closing_soon' | 'closed'>('active')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Vacancy | null>(null)
  const [lightbox, setLightbox] = useState<Vacancy | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const remove = async (v: Vacancy) => {
    if (!confirm(`Take down the vacancy "${v.title}"?`)) return
    setDeletingId(v.id)
    try {
      const res = await fetch(`/api/vacancies/${v.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 404) {
        router.refresh()
        return
      }
      const data = await res.json().catch(() => ({}))
      alert(`Could not remove the vacancy${data.error ? `: ${data.error}` : ''}`)
    } catch {
      alert('Could not reach the server. Check your connection and try again.')
    } finally {
      setDeletingId(null)
    }
  }

  // Calculate status per vacancy
  const vacanciesWithStatus = useMemo(() => {
    return vacancies.map(v => ({
      ...v,
      status: getVacancyStatus(v, mounted),
    }))
  }, [vacancies, mounted])

  // Tab counts
  const activeCount = vacanciesWithStatus.filter(v => v.status !== 'CLOSED').length
  const closingSoonCount = vacanciesWithStatus.filter(v => v.status === 'CLOSING SOON').length
  const closedCount = vacanciesWithStatus.filter(v => v.status === 'CLOSED').length

  // Filtered by Tab & Search query
  const filtered = useMemo(() => {
    let list = vacanciesWithStatus
    if (tab === 'active') {
      list = list.filter(v => v.status !== 'CLOSED')
    } else if (tab === 'closing_soon') {
      list = list.filter(v => v.status === 'CLOSING SOON')
    } else if (tab === 'closed') {
      list = list.filter(v => v.status === 'CLOSED')
    }

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(v =>
        (v.title && v.title.toLowerCase().includes(q)) ||
        (v.company && v.company.toLowerCase().includes(q)) ||
        (v.location && v.location.toLowerCase().includes(q)) ||
        (v.details && v.details.toLowerCase().includes(q))
      )
    }

    return list
  }, [vacanciesWithStatus, tab, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageVacancies = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section aria-label="Vacancies" className="space-y-4">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setTab('active'); setPage(1); }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'active'
                ? 'bg-white border border-gray-300 shadow-2xs text-gray-900'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Active <span className="ml-1 tabular-nums">{activeCount}</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('closing_soon'); setPage(1); }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'closing_soon'
                ? 'bg-white border border-gray-300 shadow-2xs text-gray-900'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Closing soon <span className="ml-1 tabular-nums">{closingSoonCount}</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('closed'); setPage(1); }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'closed'
                ? 'bg-white border border-gray-300 shadow-2xs text-gray-900'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Closed {closedCount > 0 && <span className="ml-1 tabular-nums">{closedCount}</span>}
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">Search</span>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search vacancies..."
                className="w-48 sm:w-60 pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black transition-all"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-black hover:bg-gray-800 rounded-lg transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Post vacancy
            </button>
          )}
        </div>
      </div>

      {/* Vacancy Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-sm font-semibold text-gray-800">No vacancies found</p>
          <p className="text-xs text-gray-500 mt-1">
            {query ? `No vacancies matched "${query}" in this category.` : 'There are currently no vacancies posted in this tab.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-gray-800 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Post a new vacancy
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {pageVacancies.map(v => (
            <article
              key={v.id}
              className="bg-white rounded-2xl p-5 sm:p-6 transition-all duration-200 relative flex flex-col justify-between shadow-2xs hover:shadow-md border border-gray-200 hover:border-gray-300"
            >
              <div>
                {/* Card Top Row: Status badge */}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    {v.status === 'NEW' && (
                      <span className="bg-[#facc15] text-black font-extrabold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full inline-block">
                        NEW
                      </span>
                    )}
                    {v.status === 'CLOSING SOON' && (
                      <span className="bg-black text-white font-extrabold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full inline-block">
                        CLOSING SOON
                      </span>
                    )}
                    {v.status === 'OPEN' && (
                      <span className="bg-[#e7e5e4] text-[#44403c] font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full inline-block">
                        OPEN
                      </span>
                    )}
                    {v.status === 'CLOSED' && (
                      <span className="bg-stone-300 text-stone-700 font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full inline-block">
                        CLOSED
                      </span>
                    )}
                  </div>
                </div>

                {/* Title and Poster Preview Row */}
                <div className="flex items-start justify-between gap-3 mt-4 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug line-clamp-2">
                      {v.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 font-normal mt-0.5 truncate">
                      {v.company || 'Direct Hiring'}
                    </p>
                  </div>

                  {/* Poster Thumbnail or Mockup Poster Box */}
                  {v.hasImage && v.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setLightbox(v)}
                      title="Click to enlarge poster"
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 cursor-zoom-in shrink-0 relative group shadow-2xs hover:border-gray-400 transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.imageUrl!} alt={`Poster for ${v.title}`} className="w-full h-full object-cover" />
                      <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px]">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ) : (
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-[#f5f0e8] border border-[#e5dfd3] flex items-center justify-center text-[10px] sm:text-[11px] font-medium text-gray-400 shrink-0 select-none">
                      Poster
                    </div>
                  )}
                </div>

                {/* Metadata Lines */}
                <div className="mt-4 space-y-1">
                  <p className="text-xs text-gray-700 font-normal">
                    <strong className="font-semibold">{v.openings ? `${v.openings} openings` : '1 opening'}</strong>
                    {' '}· Apply by {v.closingDate ? (mounted ? formatDate(v.closingDate) : v.closingDate) : 'Open'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Posted {mounted ? formatDate(v.postedAt) : 'Recently'}
                  </p>
                </div>
              </div>

              {/* Bottom Row: Actions */}
              <div className="flex items-center justify-end pt-4 mt-4 border-t border-gray-100 gap-2">
                {isAdmin && (
                  <>
                    {/* Edit Option */}
                    <button
                      type="button"
                      onClick={() => setEditing(v)}
                      className="px-3 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 hover:bg-gray-100 rounded-full transition-all active:scale-95"
                    >
                      Edit
                    </button>

                    {/* Delete Option */}
                    <button
                      type="button"
                      disabled={deletingId === v.id}
                      onClick={() => remove(v)}
                      className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-full transition-all active:scale-95 disabled:opacity-50"
                    >
                      {deletingId === v.id ? '...' : 'Delete'}
                    </button>
                  </>
                )}

                {/* View candidates Option */}
                <Link
                  href={`/candidates?search=${encodeURIComponent(v.title)}`}
                  className="px-3.5 py-1 text-xs font-semibold text-white bg-black hover:bg-gray-800 rounded-full transition-all active:scale-95 shadow-2xs inline-block"
                >
                  View candidates
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-center gap-6 py-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-gray-600 hover:text-black disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-500">
            {filtered.length === 0
              ? '0-0 of 0'
              : `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-gray-600 hover:text-black disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Full-size poster lightbox */}
      {lightbox && <PosterLightbox vacancy={lightbox} onClose={() => setLightbox(null)} />}

      {/* Post / Edit Vacancy Modal */}
      {(showForm || editing) && (
        <VacancyFormModal
          vacancy={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => {
            setShowForm(false)
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </section>
  )
}

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
  const todayLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const pickImage = useCallback((file: File | null | undefined) => {
    if (!file) return
    if (!POSTER_TYPES.includes(file.type)) return setError('Poster must be a PNG, JPG or WEBP image.')
    if (file.size > POSTER_MAX_BYTES) return setError('Poster image must be 5 MB or smaller.')
    setError('')
    setImage(file.name && file.name !== 'image.png' ? file : new File([file], `pasted-poster.${file.type.split('/')[1]}`, { type: file.type }))
  }, [])

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
      if (isEdit && res.status === 404) return onSaved()
      if (!res.ok) throw new Error(data.error || (isEdit ? 'Could not save changes' : 'Could not post vacancy'))
      onSaved()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }, [form, image, removeImage, isEdit, vacancy, onSaved])

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black'
  const label = 'block text-xs font-semibold text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit vacancy' : 'Post a vacancy'}>
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
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
            <input required maxLength={120} className={input} value={form.title} onChange={set('title')} placeholder="e.g. Senior Consultant Doctor" autoFocus />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Company / Organization</label>
              <input className={input} value={form.company} onChange={set('company')} placeholder="e.g. Al Noor Medical City" />
            </div>
            <div>
              <label className={label}>Location</label>
              <input className={input} value={form.location} onChange={set('location')} placeholder="e.g. Dubai, Riyadh" />
            </div>
            <div>
              <label className={label}>Number of openings</label>
              <input type="number" min={1} className={input} value={form.openings} onChange={set('openings')} placeholder="e.g. 4" />
            </div>
            <div>
              <label className={label}>Last date to apply</label>
              <input type="date" min={todayLocal} className={input} value={form.closingDate} onChange={set('closingDate')} />
            </div>
          </div>
          <div>
            <label className={label}>Details</label>
            <textarea rows={3} maxLength={1500} className={input} value={form.details} onChange={set('details')} placeholder="Requirements, salary range, qualifications…" />
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
                <label className="flex items-center gap-1.5 text-xs text-red-600 cursor-pointer font-medium">
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
              className={`relative flex flex-col items-center justify-center gap-2 px-4 py-6 min-h-[140px] text-sm text-gray-700 border-2 border-dashed rounded-lg w-full text-center transition-colors ${
                dragging ? 'border-black bg-gray-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
            >
              {preview && !dragging ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Selected poster preview" className="max-h-36 max-w-full object-contain bg-white rounded border" />
                  <span className="max-w-full truncate text-xs text-gray-600">
                    {image!.name} ({(image!.size / 1024).toFixed(0)} KB) · click or drop to change
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className={`w-7 h-7 ${dragging ? 'text-black' : 'text-gray-400'}`} />
                  <span className="font-semibold text-gray-800 text-xs">
                    {dragging ? 'Drop the poster here'
                      : hasExistingImage ? 'Drag & drop a new poster here, or click to browse'
                      : 'Drag & drop a poster here, or click to browse'}
                  </span>
                  {!dragging && (
                    <span className="text-[11px] text-gray-500">
                      PNG, JPG or WEBP, up to 5 MB
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
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button disabled={saving} className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-black hover:bg-gray-800 disabled:opacity-60 rounded-lg shadow-2xs">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {isEdit ? 'Save changes' : 'Post vacancy'}
          </button>
        </div>
      </form>
    </div>
  )
}
