import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Bot, Loader2, Send, Sparkles, X } from 'lucide-react';
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
  if (pathname === '/') return 'Landing';
  if (pathname.startsWith('/dashboard')) return 'Overview';
  if (pathname.startsWith('/create')) return 'Create Short Link';
  if (pathname.startsWith('/links')) return 'My Links';
  if (pathname.startsWith('/qr-codes')) return 'QR Code Studio';
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
      text: "Hi! I'm the **LINKORA Guide Agent**, trained on LINKORA's features and docs. Ask me how to shorten URLs, customize QR codes, rescue expired links, read analytics, or manage your account.",
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
          text: 'The backend is waking up or temporarily unreachable. You can jump straight to these LINKORA pages below and try again in a few seconds.',
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
          className="mb-3 flex h-[500px] max-h-[75vh] w-[370px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-2xl dark:border-[#3F3F46] dark:bg-[#27272A]"
        >
          {/* Charcoal Header */}
          <div className="flex items-center justify-between border-b border-[#3F3F46] bg-[#27272A] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#C4F000] text-[#18181B]">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-sm font-bold leading-tight">
                  LINKORA Guide
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[#C4F000]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#C4F000]">
                    <Sparkles className="h-2.5 w-2.5" />
                    Docs
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Viewing: {formatPageLabel(location.pathname)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close LINKORA Guide"
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-[#3F3F46] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-[#F4F4F5] p-3.5 dark:bg-[#18181B]"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'rounded-br-sm bg-[#27272A] font-medium text-[#C4F000] shadow-xs dark:bg-[#C4F000] dark:text-[#18181B]'
                      : 'rounded-bl-sm border border-[#E4E4E7] bg-white text-[#18181B] shadow-xs dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-zinc-100'
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
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                      <BookOpen className="h-3 w-3" />
                      Website References
                    </div>
                    {msg.references.map((ref) => (
                      <button
                        key={ref.id}
                        type="button"
                        onClick={() => handleNavigateRef(ref.route)}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-left transition hover:border-[#27272A] dark:border-[#3F3F46] dark:bg-[#27272A] dark:hover:border-[#C4F000]"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-bold text-[#18181B] dark:text-white">
                            {ref.title}
                          </div>
                          <div className="truncate text-[10px] text-[#71717A] dark:text-zinc-400">
                            {ref.summary}
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-[#27272A] px-2 py-1 text-[10px] font-bold text-[#C4F000] dark:bg-[#C4F000] dark:text-[#18181B]">
                          {ref.routeLabel}
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}

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
                          className="rounded-full border border-[#E4E4E7] bg-white px-2.5 py-1 text-[11px] font-medium text-[#18181B] transition hover:border-[#27272A] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-zinc-200 dark:hover:border-[#C4F000]"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#71717A]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#27272A] dark:text-[#C4F000]" />
                Searching LINKORA references...
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-[#E4E4E7] bg-white p-2.5 dark:border-[#3F3F46] dark:bg-[#27272A]"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about links, QR Rescue, analytics..."
              maxLength={500}
              className="flex-1 rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-3 py-2 text-xs text-[#18181B] placeholder:text-[#71717A] focus:border-[#27272A] focus:bg-white focus:outline-none dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send question"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#C4F000] text-[#18181B] transition hover:bg-[#d2f833] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </section>
      )}

      {/* Compact Circular Launcher Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Close LINKORA Guide' : 'Ask LINKORA Guide'}
        aria-label={open ? 'Close LINKORA Guide Agent' : 'Ask LINKORA Guide'}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-[#3F3F46] bg-[#27272A] text-[#C4F000] shadow-xl transition hover:scale-105 hover:bg-[#3F3F46] focus:outline-none focus:ring-2 focus:ring-[#C4F000]"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </button>
    </div>
  );
}
