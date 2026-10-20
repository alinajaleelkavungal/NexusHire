import { FileText } from '@/components/icons'

/** When a search matches a candidate's saved CV file name, show that file name on the row. */
export default function FileHit({ candidate, query }: { candidate: any; query: string }) {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const hit = (candidate.resumes ?? []).find((r: any) => r.fileName?.toLowerCase().includes(q))
  if (!hit) return null
  return (
    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 break-all">
      <FileText className="w-3 h-3 shrink-0" /> {hit.fileName}
    </p>
  )
}
