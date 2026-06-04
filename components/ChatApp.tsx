'use client';

import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import type { Message } from '@/types';

export function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = { role: 'user', content: text };
    const history = [...messages, userMessage];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    resetTextareaHeight();
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) throw new Error('通信エラーが発生しました');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
        });
      }
    } catch {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return [
          ...prev.slice(0, -1),
          { ...last, content: 'エラーが発生しました。もう一度お試しください。' },
        ];
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    resetTextareaHeight();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center text-white text-xs font-bold select-none">
            AI
          </div>
          <h1 className="font-semibold text-gray-800">AI チャット</h1>
        </div>
        <button
          onClick={handleReset}
          disabled={messages.length === 0}
          className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          会話をリセット
        </button>
      </header>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="font-medium text-gray-500">何でも話しかけてください</p>
            <p className="text-sm text-gray-400 mt-1">Enter で送信 / Shift+Enter で改行</p>
          </div>
        )}

        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-7 h-7 bg-violet-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-0.5 select-none">
                AI
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                message.role === 'user'
                  ? 'bg-violet-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
              }`}
            >
              {message.content === '' ? (
                <span className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : (
                message.content
              )}
            </div>
            {message.role === 'user' && (
              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold flex-shrink-0 mb-0.5 select-none">
                You
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 入力フォーム */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={isStreaming}
            placeholder="メッセージを入力..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-50 transition-colors overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 bg-violet-500 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            aria-label="送信"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
