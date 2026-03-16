'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import type { ChatMessage } from '@/lib/fantasy-types';

const QUICK_PROMPTS = [
  '¿Mejor equipo para este GP?',
  'Top 3 value picks',
  '¿Usar Wildcard ahora?',
  'Armame equipo de $100M',
];

export default function FantasyAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '🏁 ¡Hola! Soy Pitwall AI, tu asistente experto de F1 Fantasy.\n\nPuedo ayudarte con:\n• Armar el mejor equipo para cada GP\n• Identificar value picks\n• Decidir cuándo usar chips\n• Analizar cambios de precio\n\n¿Qué necesitás saber?',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/fantasy/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let fullContent = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'text' && parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: fullContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent('');
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Lo siento, hubo un error. Por favor intentá de nuevo.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="text-[#E8002D]" size={24} />
            Pitwall AI Assistant
          </h1>
          <p className="text-sm text-[#7878A0] mt-1">
            Your expert F1 Fantasy advisor
          </p>
        </div>
      </div>

      {/* Chat Container */}
      <div className="f1-card p-0 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  message.role === 'user'
                    ? 'bg-[#E8002D]'
                    : 'bg-[#BF00FF]'
                }`}
              >
                {message.role === 'user' ? (
                  <span className="text-white text-xs font-bold">You</span>
                ) : (
                  <span className="text-white text-xs">🏁</span>
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-[#E8002D] text-white rounded-tr-sm'
                    : 'bg-[#1C1C2E] text-[#EEEEF5] rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              </div>
            </div>
          ))}
          
          {/* Streaming message */}
          {isLoading && streamingContent && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#BF00FF] flex items-center justify-center shrink-0">
                <span className="text-white text-xs">🏁</span>
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-[#1C1C2E] text-[#EEEEF5]">
                <div className="whitespace-pre-wrap text-sm">{streamingContent}</div>
                <span className="inline-block w-2 h-4 bg-[#BF00FF] ml-1 animate-pulse" />
              </div>
            </div>
          )}
          
          {/* Loading indicator */}
          {isLoading && !streamingContent && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#BF00FF] flex items-center justify-center shrink-0">
                <span className="text-white text-xs">🏁</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-[#1C1C2E] rounded-2xl rounded-tl-sm">
                <div className="w-2 h-2 bg-[#7878A0] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#7878A0] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#7878A0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 2 && (
          <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.07)]">
            <div className="text-xs text-[#7878A0] mb-2">Quick prompts:</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-[#1C1C2E] text-[#7878A0] rounded-full text-sm hover:bg-[#2C2C3E] hover:text-white transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-[rgba(255,255,255,0.07)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Pitwall AI anything about F1 Fantasy..."
              disabled={isLoading}
              className="flex-1 bg-[#1C1C2E] text-white placeholder-[#4A4A6A] px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.07)] focus:border-[#E8002D] focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-3 bg-[#E8002D] text-white rounded-xl hover:bg-[#B80024] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
