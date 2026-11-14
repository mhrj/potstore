'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Msg = { role: 'user' | 'model'; content: string; escalated?: boolean };

const GREETING: Msg = {
  role: 'model',
  content:
    'سلام! 🌿 من دستیار پات استور هستم. می‌تونم درباره انتخاب گلدان، خاک، ابزار و نگهداری گیاهان کمکت کنم. چی می‌خوای بدونی؟',
};

const QUICK = [
  'چه گلدانی برای سانسوریا مناسبه؟',
  'قیمت عمده بالای ۲۰ عدد چنده؟',
  'سفال بهتره یا سرامیک؟',
  'هزینه ارسال به شیراز؟',
];

export default function PersianChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    let sid = sessionStorage.getItem('ps_chat_sid');
    if (!sid) {
      sid =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `sid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem('ps_chat_sid', sid);
    }
    sessionIdRef.current = sid;
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          messages: next.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content:
              data?.message ??
              'الان مشکلی پیش اومد. می‌تونی مستقیم با پشتیبانی ما تماس بگیری: ۰۲۱-۹۱۰۰۰۰۰۰',
            escalated: true,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'model', content: data.reply, escalated: data.escalated },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content:
            'ارتباط برقرار نشد. لطفاً اینترنتت رو بررسی کن یا با پشتیبانی تماس بگیر.',
          escalated: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="print:hidden no-print">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'بستن گفتگو' : 'گفتگو با دستیار پات استور'}
        aria-expanded={open}
        className="fixed bottom-5 end-5 z-40 grid size-14 place-items-center rounded-full bg-flora-900 text-white shadow-xl shadow-flora-900/30 transition hover:bg-flora-700 active:scale-95 focus-visible:ring-4 focus-visible:ring-flora-400 focus-visible:outline-none focus-visible:ring-offset-2"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'chat'}
            initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6, rotate: 45 }}
            transition={{ duration: 0.16 }}
            className="text-2xl"
          >
            {open ? '✕' : '💬'}
          </motion.span>
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            role="dialog"
            aria-label="دستیار هوشمند پات استور"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed bottom-24 end-5 z-40 flex h-[min(34rem,72dvh)] w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-pot bg-white dark:bg-flora-950 border border-soil-900/10 dark:border-dust-100/10 shadow-[0_12px_32px_-12px_rgba(62,39,35,0.22)] dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)]"
          >
            <header className="flex items-center justify-between gap-3 bg-flora-900 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-flora-500/30 text-lg">
                  🌿
                </span>
                <div>
                  <p className="text-sm font-black">دستیار پات استور</p>
                  <p className="text-[11px] text-flora-100/70">پاسخ‌گویی فوری · ۲۴ ساعته</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن پنجره گفتگو"
                className="grid size-8 place-items-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                ✕
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-dust-50 dark:bg-flora-900/40 p-4"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-7 whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-flora-900 dark:bg-flora-700 text-white'
                        : 'bg-white dark:bg-flora-900 text-soil-900 dark:text-dust-50 shadow-sm border border-soil-900/5 dark:border-dust-100/10'
                    }`}
                  >
                    {m.content}

                    {m.escalated && (
                      <a
                        href="tel:+982191000000"
                        className="mt-3 block rounded-xl bg-dust-100 dark:bg-flora-900 border border-transparent dark:border-dust-50/10 px-3 py-2 text-center text-[11px] font-bold text-soil-900 dark:text-dust-100 transition-colors hover:bg-dust-200 dark:hover:bg-flora-950"
                      >
                        تماس با پشتیبانی انسانی: ۰۲۱-۹۱۰۰۰۰۰۰
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-end">
                  <div className="flex gap-1 rounded-2xl bg-white dark:bg-flora-900 px-4 py-3 shadow-sm border border-soil-900/5 dark:border-dust-100/10">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: d * 0.18 }}
                        className="size-1.5 rounded-full bg-flora-500"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 border-t border-soil-900/5 dark:border-dust-100/10 bg-white dark:bg-flora-950 px-4 pt-3">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-full bg-dust-100 dark:bg-flora-950 dark:text-dust-300 dark:hover:bg-flora-900 border border-transparent dark:border-dust-50/10 px-3 py-1.5 text-[11px] font-medium text-soil-700 transition-colors hover:bg-dust-200"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-soil-900/5 dark:border-dust-100/10 bg-white dark:bg-flora-950 p-3"
            >
              <label htmlFor="chatbot-input" className="sr-only">
                متن پیام برای گفتگو با دستیار هوشمند
              </label>
              <input
                id="chatbot-input"
                name="message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="سوالت رو بنویس…"
                aria-label="متن پیام برای گفتگو با دستیار هوشمند"
                maxLength={500}
                className="flex-1 rounded-full bg-dust-50 dark:bg-flora-900 px-4 py-2.5 text-[13px] text-soil-900 dark:text-dust-50 outline-none placeholder:text-soil-700/45 dark:placeholder:text-dust-300/45 focus:ring-2 focus:ring-flora-500/30 focus-visible:ring-2 focus-visible:ring-flora-500 focus-visible:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="ارسال پیام"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 transition-colors hover:bg-flora-700 disabled:opacity-40 cursor-pointer focus-visible:ring-2 focus-visible:ring-flora-400 focus-visible:outline-none"
              >
                ↑
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
