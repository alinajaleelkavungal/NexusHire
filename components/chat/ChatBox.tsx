'use client'

import { useState } from 'react'
import { PaperPlaneTilt, MagicWand, User, CircleNotch } from '@/components/icons'

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
    <div className="flex flex-col bg-white border border-[#e2dcce] rounded-2xl shadow-sm h-[600px] max-h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="bg-[#faf8f5] px-6 py-4 border-b border-[#f0ece1] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="font-bold text-[#24211f] text-base">AI Resume Assistant</h2>
        </div>
        <span className="text-xs bg-[#fefcf3] text-[#b58933] border border-[#fbedb8] px-2.5 py-1 rounded-full font-semibold">Live Knowledge</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-start max-w-[85%] space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-[#e85d3f] text-white' : 'bg-[#faf8f5] border border-[#e2dcce] text-[#24211f]'}`}>
                {msg.role === 'user' ? <User weight="bold" className="w-4 h-4" /> : <MagicWand weight="bold" className="w-4 h-4 text-[#e85d3f]" />}
              </div>
              <div className={`px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-[#24211f] text-white rounded-tr-sm' : 'bg-[#faf8f5] border border-[#e2dcce] text-[#24211f] rounded-tl-sm'}`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                
                {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#e2dcce]">
                    <p className="text-xs font-semibold text-[#7e715f] mb-2">Information Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, i) => (
                        <span key={i} className="bg-white border border-[#e2dcce] text-[#423a30] text-[10px] px-2 py-1 rounded-md shadow-2xs">
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
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#faf8f5] border border-[#e2dcce] text-[#24211f] flex items-center justify-center">
              <MagicWand weight="bold" className="w-4 h-4 text-[#e85d3f]" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-[#faf8f5] border border-[#e2dcce] rounded-tl-sm flex items-center space-x-2">
              <CircleNotch weight="bold" className="w-4 h-4 animate-spin text-[#e85d3f]" />
              <span className="text-sm text-[#7e715f]">Looking that up...</span>
            </div>
          </div>
        )}
      </div>

      {!candidateId && (
        <div className="px-4 pt-3 pb-1 border-t border-[#f0ece1] bg-[#faf8f5] flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              disabled={isLoading}
              onClick={e => handleSend(e as unknown as React.FormEvent, s)}
              className="text-xs px-2.5 py-1 rounded-full border border-[#e2dcce] bg-white text-[#7e715f] hover:border-[#e85d3f] hover:text-[#e85d3f] disabled:opacity-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className={`p-4 bg-[#faf8f5] ${candidateId ? 'border-t border-[#f0ece1]' : 'pt-2'}`}>
        <div className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={placeholder}
            className="w-full pl-4 pr-12 py-3 bg-white border border-[#e2dcce] rounded-full focus:outline-none focus:ring-2 focus:ring-[#e85d3f]/40 focus:border-[#e85d3f] text-sm text-[#24211f] placeholder-[#a79a87] disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-[#24211f] text-white rounded-full hover:bg-black transition-colors disabled:opacity-50"
          >
            <PaperPlaneTilt weight="fill" className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
