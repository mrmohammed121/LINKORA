import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import type { AssistantReferenceItem } from '../types';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  references?: AssistantReferenceItem[];
  suggestions?: string[];
}

const INITIAL_SUGGESTIONS = [
  'How do I shorten a URL?',
  'What is Dynamic QR Rescue?',
  'How do I generate & style a QR code?',
  'How do analytics and IP privacy work?',
];

const INITIAL_REFERENCES: AssistantReferenceItem[] = [
  {
    id: 'shorten-url',
    title: 'Shortening URLs & Custom Slugs',
    route: '/create',
    routeLabel: 'Go to Create Link',
    category: 'Core',
    summary: 'Shorten http:// or https:// URLs with optional custom slugs and expiration.',
  },
  {
    id: 'qr-rescue',
    title: 'Dynamic QR Rescue',
    route: '/manage',
    routeLabel: 'Open Link Management',
    category: 'QR',
    summary: 'Swap destinations or reactivate expired links without reprinting QR codes.',
  },
];

function formatPageLabel(pathname: string): string {
  if (pathname === '/') return 'Home';
  if (pathname.startsWith('/create')) return 'Create Link';
  if (pathname.startsWith('/links')) return 'My Links';
  if (pathname.startsWith('/qr-codes')) return 'QR Codes';
  if (pathname.startsWith('/analytics')) return 'Analytics';
  if (pathname.startsWith('/manage')) return 'Link Management';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/login')) return 'Sign In';
  if (pathname.startsWith('/register')) return 'Create Account';
  if (pathname.startsWith('/rescue')) return 'QR Rescue';
  return 'LINKORA';
}

export function WebsiteGuideAgent() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm the **LINKORA Guide Agent**, trained on LINKORA's website features and technical docs. Ask me how to shorten links, generate or style QR codes, rescue expired links, view analytics, or manage your account.",
      references: INITIAL_REFERENCES,
      suggestions: INITIAL_SUGGESTIONS,
    },
  ]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, isLoading]);

  const askAgent = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.assistant.chat({
        message: trimmed,
        currentPath: location.pathname,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: res.reply,
          references: res.references,
          suggestions: res.suggestions,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: 'The backend is waking up or temporarily unreachable. Meanwhile, you can jump straight to these LINKORA sections below and try again in a few seconds.',
          references: INITIAL_REFERENCES,
          suggestions: INITIAL_SUGGESTIONS,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void askAgent(input);
  };

  const handleNavigateRef = (route: string) => {
    navigate(route);
    if (window.innerWidth < 640) {
      setOpen(false);
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end sm:right-6 sm:bottom-6">
      {open && (
        <section
          aria-label="LINKORA Guide Agent"
          className="mb-3 flex h-[500px] max-h-[75vh] w-[370px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-teal-500 px-4 py-3 text-white dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-sm font-bold leading-tight">
                  LINKORA Guide
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                    <Sparkles className="h-2.5 w-2.5" />
                    Docs
                  </span>
                </div>
                <p className="text-[11px] text-white/85">
                  Viewing: {formatPageLabel(location.pathname)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close LINKORA Guide"
              className="rounded-lg p-1.5 text-white/85 transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-3.5 dark:bg-slate-950/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'rounded-br-sm bg-blue-600 text-white shadow-xs'
                      : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  {msg.text.split('**').map((part, i) =>
                    i % 2 === 1 ? (
                      <strong key={i} className="font-bold">
                        {part}
                      </strong>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </div>

                {/* Cited Website References */}
                {msg.role === 'assistant' && msg.references && msg.references.length > 0 && (
                  <div className="mt-2 w-[92%] space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <BookOpen className="h-3 w-3" />
                      Website References
                    </div>
                    {msg.references.map((ref) => (
                      <button
                        key={ref.id}
                        type="button"
                        onClick={() => handleNavigateRef(ref.route)}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-400 hover:bg-blue-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/10"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-bold text-slate-800 dark:text-slate-100">
                            {ref.title}
                          </div>
                          <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                            {ref.summary}
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                          {ref.routeLabel}
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick Suggestion Chips on latest assistant message */}
                {msg.role === 'assistant' &&
                  msg.id === messages[messages.length - 1]?.id &&
                  msg.suggestions &&
                  msg.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.suggestions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => void askAgent(q)}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                Searching LINKORA references...
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about links, QR Rescue, analytics..."
              maxLength={500}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send question"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </section>
      )}

      {/* Floating Launcher Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close LINKORA Guide Agent' : 'Open LINKORA Guide Agent'}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition hover:scale-[1.02] hover:from-blue-500 hover:to-teal-400"
      >
        {open ? (
          <>
            <X className="h-4 w-4" />
            <span>Close Guide</span>
          </>
        ) : (
          <>
            <MessageSquare className="h-4 w-4" />
            <span>Ask LINKORA Guide</span>
          </>
        )}
      </button>
    </div>
  );
}
