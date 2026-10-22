import ChatBox from '@/components/chat/ChatBox'
import { MagicWand } from '@/components/icons'

export default function GlobalChatPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center bg-[#fdf3f0] border border-[#fbe4de] p-4 rounded-full mb-2 shadow-2xs">
          <MagicWand weight="fill" className="w-8 h-8 text-[#e85d3f]" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-950 tracking-tight">AI Assistant</h1>
        <p className="text-gray-700 font-medium max-w-xl mx-auto">
          Ask about anything in the app: candidate and vacancy counts, categories, ages, stages, branches or a specific CV. Numbers come straight from your live data.
        </p>
      </div>

      <div className="mt-8">
        <ChatBox />
      </div>
    </div>
  )
}
