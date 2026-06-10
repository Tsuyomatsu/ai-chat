'use client';

import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import type { Message } from '@/types';

// ────────── 8bit カラーパレット ──────────
const C = {
  bg:         '#0c0c1e',
  surface:    '#1a1a3e',
  black:      '#000000',
  white:      '#ffffff',
  green:      '#44ff44',
  cyan:       '#44aaff',
  yellow:     '#ffdd00',
  red:        '#ff4444',
  dimText:    '#666666',
  userBg:     '#003300',
  aiBg:       '#00006e',
  inputBg:    '#000000',
  inputBorder:'#888888',
} as const;

const PIXEL_FONT = '"Press Start 2P", monospace';

// ────────── ピクセルボーダーのスタイル ──────────
const pixelBox = (bg: string): React.CSSProperties => ({
  background: bg,
  border: `3px solid ${C.white}`,
  boxShadow: `4px 4px 0 ${C.black}`,
});

export function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
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

      if (!res.ok || !res.body) throw new Error('通信エラー');

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
        return [...prev.slice(0, -1), { ...last, content: 'エラーが発生しました。もう一度お試しください。' }];
      });
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
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
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    resetTextareaHeight();
  };

  const canSend = input.trim().length > 0 && !isStreaming;

  return (
    <div
      className="flex flex-col h-screen"
      style={{
        background: C.bg,
        backgroundImage: [
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '8px 8px',
      }}
    >
      {/* ─── ヘッダー (HUD) ─── */}
      <header
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          background: C.surface,
          borderBottom: `4px solid ${C.white}`,
          boxShadow: `0 4px 0 ${C.black}`,
        }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: PIXEL_FONT, fontSize: 12, color: C.yellow }}>★</span>
          <span style={{ fontFamily: PIXEL_FONT, fontSize: 10, color: C.white }}>AI CHAT</span>
          <span style={{ fontFamily: PIXEL_FONT, fontSize: 7, color: C.dimText }}>v1.0</span>
        </div>

        <div className="flex items-center gap-3">
          <span style={{ fontFamily: PIXEL_FONT, fontSize: 7, color: C.green }}>HP:∞</span>
          <span style={{ fontFamily: PIXEL_FONT, fontSize: 7, color: C.cyan }}>MP:∞</span>
        </div>

        <button
          onClick={handleReset}
          disabled={messages.length === 0}
          className="pixel-btn"
          style={{
            fontFamily: PIXEL_FONT,
            fontSize: 7,
            padding: '6px 10px',
            cursor: messages.length > 0 ? 'pointer' : 'not-allowed',
            color:      messages.length > 0 ? C.black  : C.dimText,
            background: messages.length > 0 ? C.red    : '#333333',
            border: `3px solid ${messages.length > 0 ? C.white : '#555555'}`,
            boxShadow: messages.length > 0 ? `3px 3px 0 ${C.black}` : 'none',
          }}
        >
          RESET
        </button>
      </header>

      {/* ─── メッセージ一覧 ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* 空状態 */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center select-none">
            <div style={{ fontFamily: PIXEL_FONT, fontSize: 10, color: C.yellow }}>
              ★ ★ ★
            </div>
            <div style={{ fontFamily: PIXEL_FONT, fontSize: 12, color: C.white, lineHeight: 2 }}>
              READY PLAYER ONE
            </div>
            <div className="blink" style={{ fontFamily: PIXEL_FONT, fontSize: 8, color: C.cyan }}>
              ▶ PRESS ENTER TO START
            </div>
            <div style={{ fontFamily: PIXEL_FONT, fontSize: 6, color: C.dimText, marginTop: 8, lineHeight: 2.5 }}>
              ENTER: SEND  /  SHIFT+ENTER: NEW LINE
            </div>
          </div>
        )}

        {/* メッセージバブル */}
        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div style={{ maxWidth: '78%', ...pixelBox(message.role === 'user' ? C.userBg : C.aiBg) }}>
              {/* ラベル */}
              <div style={{
                fontFamily: PIXEL_FONT,
                fontSize: 7,
                color: message.role === 'user' ? C.green : C.cyan,
                marginBottom: 8,
                letterSpacing: 1,
              }}>
                {message.role === 'user' ? '[ YOU ]' : '▶ A.I.'}
              </div>
              {/* 本文 */}
              <div style={{
                color: C.white,
                fontSize: 13,
                lineHeight: 1.9,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {message.content === ''
                  ? <span className="blink" style={{ color: C.cyan }}>▌</span>
                  : message.content
                }
              </div>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ─── 入力フォーム ─── */}
      <div
        className="shrink-0 px-4 py-3"
        style={{
          background: '#0a0a1a',
          borderTop: `4px solid ${C.white}`,
          boxShadow: `0 -4px 0 ${C.black}`,
        }}
      >
        <div className="flex items-end gap-2">
          {/* テキストエリア */}
          <div
            className="flex flex-1 items-end"
            style={{ border: `3px solid ${C.inputBorder}`, background: C.inputBg, padding: '0 8px' }}
          >
            <span style={{
              fontFamily: PIXEL_FONT,
              fontSize: 10,
              color: C.green,
              paddingBottom: 10,
              marginRight: 8,
              flexShrink: 0,
            }}>▶</span>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              disabled={isStreaming}
              placeholder="メッセージを入力..."
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: C.green,
                caretColor: C.green,
                fontSize: 14,
                fontFamily: 'monospace',
                resize: 'none',
                padding: '10px 0',
                maxHeight: 128,
                overflowY: 'auto',
              }}
            />
          </div>

          {/* 送信ボタン */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="pixel-btn shrink-0"
            style={{
              fontFamily: PIXEL_FONT,
              fontSize: 8,
              padding: '12px 14px',
              cursor: canSend ? 'pointer' : 'not-allowed',
              color:      canSend ? C.black   : C.dimText,
              background: canSend ? C.yellow  : '#222222',
              border: `3px solid ${canSend ? C.white : '#555555'}`,
              boxShadow: canSend ? `4px 4px 0 ${C.black}` : 'none',
              lineHeight: 1.8,
            }}
            aria-label="送信"
          >
            送 る
          </button>
        </div>
      </div>
    </div>
  );
}
