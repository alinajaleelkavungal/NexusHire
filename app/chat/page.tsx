import ChatBox from '@/components/chat/ChatBox'
import { MessagesSquare } from '@/components/icons'

export default function GlobalChatPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center bg-blue-100 p-4 rounded-full mb-2">
          <MessagesSquare className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">RAG Resume Chat</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Ask complex questions across your entire candidate database. The AI will retrieve the most relevant resumes and synthesize an answer backed by real data.
        </p>
      </div>

      <div className="mt-8">
        <ChatBox />
      </div>
    </div>
  )
}
