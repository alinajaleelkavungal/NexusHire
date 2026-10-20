'use client'

import { useState } from 'react'
import { Send, Bot, User, Loader2 } from '@/components/icons'

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  sources?: any[]
  confidence?: number
}

const SUGGESTIONS = [
  'How many candidates are there?',
  'How many vacancy posters are active?',
  'Candidates by category',
  'Candidates added this week',
  'Give me a summary',
]

interface ChatBoxProps {
  candidateId?: string
  placeholder?: string
}

export default function ChatBox({ candidateId,  placeholder = "Ask about candidates, vacancies, stages, branches..." }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'ai',
    content: candidateId 
      ? "Hi! I've analyzed this candidate's resume. What would you like to know about them?"
      : "Hi! Ask me anything about ResumeIQ: how many candidates or active vacancy posters there are, CVs by category, age or stage, a specific candidate, and more."
  }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async (e: React.FormEvent, preset?: string) => {
    e.preventDefault()
    const text = (preset ?? input).trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg.content, candidateId })
      })
      
      if (res.ok) {
        const data = await res.json()
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: data.answer,
          sources: data.sources,
          confidence: data.confidence
        }
        setMessages(prev => [...prev, aiMsg])
      } else {
        throw new Error('Failed to fetch')
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Sorry, I encountered an error while analyzing the resumes. Please try again."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col bg-white border rounded-xl shadow-sm h-[600px] max-h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="font-semibold text-gray-800">AI Resume Assistant</h2>
        </div>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-medium">Answers from your live data</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-start max-w-[85%] space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                
                {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Information Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, i) => (
                        <span key={i} className="bg-white border text-gray-600 text-[10px] px-2 py-1 rounded-md shadow-sm">
                          {src.name} • {src.chunkType}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-gray-100 rounded-tl-sm flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              <span className="text-sm text-gray-500">Looking that up...</span>
            </div>
          </div>
        )}
      </div>

      {!candidateId && (
        <div className="px-4 pt-3 pb-1 border-t bg-gray-50 flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              disabled={isLoading}
              onClick={e => handleSend(e as unknown as React.FormEvent, s)}
              className="text-xs px-2.5 py-1 rounded-full border border-gray-300 bg-white text-gray-600 hover:border-green-500 hover:text-green-700 disabled:opacity-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className={`p-4 bg-gray-50 ${candidateId ? 'border-t' : 'pt-2'}`}>
        <div className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={placeholder}
            className="w-full pl-4 pr-12 py-3 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
