export interface WebsiteReference {
  id: string;
  title: string;
  route: string;
  routeLabel: string;
  category: 'Core' | 'QR' | 'Analytics' | 'Account' | 'Architecture';
  summary: string;
  answer: string;
  steps: string[];
  keywords: string[];
}

export interface AssistantReferenceItem {
  id: string;
  title: string;
  route: string;
  routeLabel: string;
  category: WebsiteReference['category'];
  summary: string;
}

export interface AssistantChatResult {
  reply: string;
  references: AssistantReferenceItem[];
  suggestions: string[];
  currentPageHint: string | null;
}

export const LINKORA_WEBSITE_REFERENCES: WebsiteReference[] = [
  {
    id: 'overview',
    title: 'What is LINKORA?',
    route: '/',
    routeLabel: 'Open Home',
    category: 'Core',
    summary:
      'Full-stack URL shortener, Dynamic QR Rescue platform, and privacy-first click analytics dashboard.',
    answer:
      'LINKORA lets you shorten long URLs, create custom slugs, generate styled PNG/SVG QR codes, update broken or expired QR destinations anytime without reprinting (Dynamic QR Rescue), and track real-time click analytics.',
    steps: [
      'Use Home (/) or Create Link (/create) to shorten any http:// or https:// URL.',
      'Switch to QR Code mode on Home—or visit QR Codes (/qr-codes) or My Links (/links)—whenever you want to generate, customize, or download a QR code.',
      'Use Edit / Rescue on any link to swap its destination URL or reactivate it live without changing the short slug.',
    ],
    keywords: [
      'linkora',
      'overview',
      'what',
      'website',
      'about',
      'features',
      'platform',
      'do',
      'help',
      'guide',
      'start',
    ],
  },
  {
    id: 'shorten-url',
    title: 'Shortening URLs & Custom Slugs',
    route: '/create',
    routeLabel: 'Go to Create Link',
    category: 'Core',
    summary:
      'Create fast short links with optional custom slugs (3–30 chars) and optional expiration.',
    answer:
      'To shorten a URL, open Home (/) or Create Link (/create), paste a valid URL starting with http:// or https://, optionally enter a custom back-half slug (3–30 letters, numbers, or hyphens) and an expiration date, and submit. Leaving the slug blank generates a random 6-character slug.',
    steps: [
      'Paste a full URL starting with http:// or https:// (unsafe schemes like javascript:, data:, or file: are blocked).',
      'Optionally type a custom slug (3–30 characters; reserved words like api, auth, login, register, rescue, analytics, health are blocked).',
      'Click Create link — LINKORA returns only your short link unless you specifically ask to generate a QR code.',
    ],
    keywords: [
      'shorten',
      'short',
      'url',
      'link',
      'create',
      'custom',
      'slug',
      'back-half',
      'http',
      'https',
      'longer',
      'length',
      'domain',
    ],
  },
  {
    id: 'qr-generation',
    title: 'Generating, Styling & Downloading QR Codes',
    route: '/qr-codes',
    routeLabel: 'Open QR Codes',
    category: 'QR',
    summary:
      'Generate PNG/SVG QR codes, customize dot/corner styles, colors, frames, and embed a center logo.',
    answer:
      'QR codes are generated only when you request them: switch the pill on Home (/) to QR Code, click QR Code on any link in My Links (/links), or open QR Codes (/qr-codes). You can customize dot styles, corner styles, hex colors, branded frames, CTA text, and logos, then download as PNG or SVG.',
    steps: [
      'On Home (/), select the QR Code tab before submitting—or open QR Codes (/qr-codes) or My Links (/links) and click QR Code.',
      'Customize dots (square, rounded, dots, classy-rounded), corners, colors, frame mode, or upload a logo image.',
      'Click Save QR Style (when signed in) to persist styling to Neon PostgreSQL, and export PNG or SVG.',
    ],
    keywords: [
      'qr',
      'qrcode',
      'code',
      'generate',
      'style',
      'custom',
      'logo',
      'color',
      'png',
      'svg',
      'download',
      'image',
      'frame',
    ],
  },
  {
    id: 'qr-rescue',
    title: 'Dynamic QR Rescue (Fix Broken or Expired Links)',
    route: '/manage',
    routeLabel: 'Open Link Management',
    category: 'QR',
    summary:
      'Swap destination URLs, clear expiration, or reactivate links live without reprinting printed QR codes.',
    answer:
      'Every LINKORA QR code encodes your permanent short URL (never the raw destination). With Dynamic QR Rescue, you can click Edit / Rescue on any link to change its destination URL, reactivate an EXPIRED/DISABLED link, or update its expiration—your existing printed QR codes update immediately via cache invalidation.',
    steps: [
      'Open My Links (/links) or Link Management (/manage) and click Rescue (or Edit / Rescue).',
      'Enter the new destination URL, adjust Status (ACTIVE / DISABLED / EXPIRED) or Expiration, and save.',
      'If a visitor scans an expired or missing QR code, LINKORA redirects them to the /rescue/:slug recovery page.',
    ],
    keywords: [
      'rescue',
      'broken',
      'expired',
      'expire',
      'expiration',
      'reprint',
      'swap',
      'change',
      'update',
      'destination',
      'edit',
      'reactivate',
      '404',
    ],
  },
  {
    id: 'analytics-privacy',
    title: 'Click Analytics & Visitor Privacy',
    route: '/analytics',
    routeLabel: 'Open Analytics',
    category: 'Analytics',
    summary:
      'Hourly/daily click charts, top links, referrers, device types, regions, and SHA-256 IP anonymisation.',
    answer:
      'LINKORA tracks clicks asynchronously without slowing down redirects. Open Analytics (/analytics) for workspace-wide Recharts dashboards or click Analytics on a single link (/analytics/:id) to view time-series clicks (day/hour), referrers, devices (Desktop, Mobile, Tablet, Bot), regions, and unique visitors.',
    steps: [
      'Open Analytics (/analytics) and filter by 7d, 30d, 90d, or All time.',
      'Privacy protection: raw visitor IP addresses are never stored—IPs are hashed daily with SHA-256 + IP_HASH_SALT, and referrers are sanitized down to hostname only.',
      'Click any individual link’s Analytics button to inspect its dedicated /analytics/:id breakdown.',
    ],
    keywords: [
      'analytics',
      'clicks',
      'stats',
      'chart',
      'recharts',
      'referrer',
      'device',
      'region',
      'unique',
      'visitor',
      'privacy',
      'ip',
      'anonymise',
      'sha256',
      'track',
    ],
  },
  {
    id: 'guest-vs-account',
    title: 'Guest Mode vs Signed-In Accounts',
    route: '/login',
    routeLabel: 'Go to Log In',
    category: 'Account',
    summary:
      'Try LINKORA without signing in (24-hour guest links), or sign in to save permanently and unlock all controls.',
    answer:
      'You can create short links and QR codes immediately without logging in using your browser’s 24-hour guest session (X-Guest-Id). When you sign in or create an account at /login or /register, your temporary guest links are automatically claimed into your permanent Neon PostgreSQL account.',
    steps: [
      'Use Home (/) or Create Link (/create) right away as a guest—links remain active for 24 hours.',
      'Click Log in or Sign up in the top-right header (or Save data in the sidebar) to save links permanently.',
      'Signing in unlocks permanent storage, custom QR style saving, and full QR Rescue lifecycle controls.',
    ],
    keywords: [
      'guest',
      'temporary',
      '24',
      'hours',
      'claim',
      'save',
      'account',
      'free',
      'without',
      'session',
    ],
  },
  {
    id: 'auth-account',
    title: 'Sign In, Registration, Demo Account & Settings',
    route: '/login',
    routeLabel: 'Open Sign In',
    category: 'Account',
    summary:
      'Log in with email/password, try the 1-click demo account, or manage profile & theme in Settings.',
    answer:
      'Sign in or register at /login or /register using email and password (JWT 7-day sessions) or click "Fill Demo Credentials" (demo@linkora.io / Demo@1234) to test immediately. Signed-in users can update their display name, password, and dark/light theme in Settings (/settings).',
    steps: [
      'Click Log in or Sign up in the top-right header to open /login or /register.',
      'For quick testing, click Fill Demo Credentials on /login and press Sign In.',
      'Visit Settings (/settings) to update your profile name, change your password, toggle light/dark mode, or check live API health.',
    ],
    keywords: [
      'login',
      'log in',
      'signin',
      'sign in',
      'register',
      'signup',
      'sign up',
      'password',
      'demo',
      'google',
      'oauth',
      'jwt',
      'settings',
      'profile',
      'theme',
      'dark',
    ],
  },
  {
    id: 'link-management',
    title: 'Managing, Filtering & Deleting Links',
    route: '/links',
    routeLabel: 'Open My Links',
    category: 'Core',
    summary:
      'Search links by slug/destination/date, filter by ACTIVE/EXPIRED/DISABLED status, pause, reactivate, or delete.',
    answer:
      'Use My Links (/links) to search across slugs and destinations, filter by status or date range, copy short URLs, open QR modals, or delete links. Use Link Management (/manage) for quick status toggles (Activate, Pause/Disable, Reactivate, and QR Rescue).',
    steps: [
      'Use the top search bar or My Links (/links) filters to find any link by slug, URL, status, or date.',
      'In Link Management (/manage), toggle a link between ACTIVE and DISABLED without deleting it.',
      'Deleting a link removes the link and its ClickEvent history and immediately invalidates the redirect cache.',
    ],
    keywords: [
      'manage',
      'management',
      'my links',
      'filter',
      'search',
      'delete',
      'pause',
      'disable',
      'activate',
      'status',
      'list',
    ],
  },
  {
    id: 'architecture-neon',
    title: 'Technical Stack, Neon PostgreSQL & HTTP 302 Flow',
    route: '/settings',
    routeLabel: 'Check System Health',
    category: 'Architecture',
    summary:
      'React 19 + Vite + Fastify 5 + Prisma 6.6 + Neon Serverless PostgreSQL + cache-first HTTP 302 redirects.',
    answer:
      'LINKORA runs a React 19 + Vite + TypeScript + Tailwind CSS + Recharts + Zustand frontend connected to a Node.js + Fastify 5 + TypeScript + Zod + Prisma 6.6 backend backed by Neon Serverless PostgreSQL (pooled DATABASE_URL at runtime, direct DIRECT_URL for schema sync). Redirects use cache-first lookup, HTTP 302 Found with no-store headers, and non-blocking setImmediate click telemetry.',
    steps: [
      'Redirect path: GET /:slug checks in-memory/Redis cache first, falls back to Neon PostgreSQL, verifies status & expiry, and returns HTTP 302 Found.',
      'Click telemetry runs asynchronously via setImmediate() so Neon DB writes never delay the redirect.',
      'Open Settings (/settings) → Appearance & System (or GET /api/health) to inspect live Neon connection status.',
    ],
    keywords: [
      'architecture',
      'tech',
      'stack',
      'neon',
      'postgres',
      'postgresql',
      'database',
      'prisma',
      'fastify',
      'react',
      'vite',
      '302',
      'redirect',
      'cache',
      'redis',
      'api',
      'backend',
      'how it works',
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting Common Issues',
    route: '/',
    routeLabel: 'Return Home',
    category: 'Architecture',
    summary:
      'Solutions for URL scheme errors, duplicate slugs, Render free-tier cold starts, and expired links.',
    answer:
      'Most issues have quick fixes: ensure destination URLs start with http:// or https://, pick a different custom slug if you see a 409 conflict, allow ~30–50 seconds if the free-tier Render API is waking from sleep, and use QR Rescue if a link shows EXPIRED.',
    steps: [
      'URL rejected? Always include https:// or http:// at the start of your destination URL.',
      'Slug already taken? Choose another 3–30 character slug (letters, numbers, hyphens) or leave it blank for an auto-generated slug.',
      'First request slow on Render? The free-tier backend spins down after inactivity and wakes up in ~30–50 seconds.',
    ],
    keywords: [
      'error',
      'issue',
      'problem',
      'fail',
      'not working',
      'slow',
      'cold',
      'conflict',
      '409',
      'invalid',
      'fix',
      'troubleshoot',
    ],
  },
];

const PAGE_LABELS: Array<{ prefix: string; label: string }> = [
  { prefix: '/create', label: 'Create Link (/create)' },
  { prefix: '/links', label: 'My Links (/links)' },
  { prefix: '/qr-codes', label: 'QR Codes (/qr-codes)' },
  { prefix: '/analytics/', label: 'Single-Link Analytics' },
  { prefix: '/analytics', label: 'Analytics Overview (/analytics)' },
  { prefix: '/manage', label: 'Link Management (/manage)' },
  { prefix: '/settings', label: 'Settings (/settings)' },
  { prefix: '/login', label: 'Sign In (/login)' },
  { prefix: '/register', label: 'Create Account (/register)' },
  { prefix: '/rescue/', label: 'QR Rescue Recovery' },
];

const SYNONYMS: Record<string, string[]> = {
  qr: ['qrcode', 'scan', 'scanner', 'matrix', 'barcode'],
  shorten: ['short', 'url', 'link', 'tiny', 'create'],
  rescue: ['fix', 'broken', 'expired', 'change', 'swap', 'destination'],
  analytics: ['stats', 'clicks', 'chart', 'graph', 'metrics', 'data', 'report'],
  privacy: ['ip', 'anonymise', 'anonymous', 'gdpr', 'hash', 'sha256'],
  login: ['signin', 'auth', 'account', 'register', 'signup', 'demo', 'password'],
  architecture: ['stack', 'neon', 'postgres', 'prisma', 'fastify', 'backend', 'database', 'api'],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function expandTokens(tokens: string[]): Set<string> {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    for (const [canonical, variants] of Object.entries(SYNONYMS)) {
      if (token === canonical || variants.includes(token)) {
        expanded.add(canonical);
        for (const v of variants) expanded.add(v);
      }
    }
  }
  return expanded;
}

function toPublicRef(ref: WebsiteReference): AssistantReferenceItem {
  return {
    id: ref.id,
    title: ref.title,
    route: ref.route,
    routeLabel: ref.routeLabel,
    category: ref.category,
    summary: ref.summary,
  };
}

function getCurrentPageHint(currentPath?: string): string | null {
  if (!currentPath) return null;
  if (currentPath === '/') return 'Home Dashboard (/)';
  const match = PAGE_LABELS.find((p) => currentPath.startsWith(p.prefix));
  return match ? match.label : null;
}

const DEFAULT_SUGGESTIONS = [
  'How do I shorten a URL?',
  'What is Dynamic QR Rescue?',
  'How do I generate & style a QR code?',
  'How do analytics and IP privacy work?',
  'What tech stack & database does LINKORA use?',
];

export function answerWebsiteQuestion(
  rawMessage: string,
  currentPath?: string
): AssistantChatResult {
  const message = rawMessage.trim();
  const lower = message.toLowerCase();
  const currentPageHint = getCurrentPageHint(currentPath);

  const isGreeting =
    /^(hi|hello|hey|yo|hola|namaste|good\s+(morning|afternoon|evening)|help|start|menu)[!.\s?]*$/i.test(
      message
    );

  if (isGreeting) {
    const overview = LINKORA_WEBSITE_REFERENCES[0];
    const pageNote = currentPageHint ? ` You're currently on **${currentPageHint}**.` : '';
    return {
      reply: `Hi! I'm the **LINKORA Website Guide**, trained on LINKORA's features, pages, and technical documentation.${pageNote}\n\nAsk me anything about shortening URLs, custom slugs, generating/styling QR codes, Dynamic QR Rescue, click analytics & privacy, guest vs signed-in accounts, or the Neon PostgreSQL architecture.`,
      references: [
        toPublicRef(overview),
        toPublicRef(LINKORA_WEBSITE_REFERENCES[1]),
        toPublicRef(LINKORA_WEBSITE_REFERENCES[2]),
        toPublicRef(LINKORA_WEBSITE_REFERENCES[3]),
      ],
      suggestions: DEFAULT_SUGGESTIONS.slice(0, 4),
      currentPageHint,
    };
  }

  const rawTokens = tokenize(message);
  const queryTokens = expandTokens(rawTokens);

  const scored = LINKORA_WEBSITE_REFERENCES.map((ref) => {
    let score = 0;
    const titleLower = ref.title.toLowerCase();
    const bodyLower = `${ref.summary} ${ref.answer} ${ref.steps.join(' ')}`.toLowerCase();

    for (const kw of ref.keywords) {
      if (lower.includes(kw)) {
        score += kw.includes(' ') ? 6 : 4;
      } else if (queryTokens.has(kw)) {
        score += 2.5;
      }
    }

    for (const token of queryTokens) {
      if (titleLower.includes(token)) score += 3;
      if (bodyLower.includes(token)) score += 1;
    }

    if (currentPath && currentPath !== '/' && ref.route === currentPath) {
      score += 0.5;
    }

    return { ref, score };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < 2) {
    return {
      reply:
        "I'm trained specifically on the **LINKORA** website and platform. I couldn't find an exact match for that question, but here are the main areas I can walk you through — or try one of the quick questions below.",
      references: [
        toPublicRef(LINKORA_WEBSITE_REFERENCES[0]),
        toPublicRef(LINKORA_WEBSITE_REFERENCES[1]),
        toPublicRef(LINKORA_WEBSITE_REFERENCES[3]),
      ],
      suggestions: DEFAULT_SUGGESTIONS.slice(0, 4),
      currentPageHint,
    };
  }

  const matched = scored.filter((item) => item.score >= Math.max(2, top.score * 0.55)).slice(0, 3);
  const primary = matched[0].ref;
  const secondary = matched[1]?.ref;

  const lines: string[] = [primary.answer, ''];
  primary.steps.forEach((step, idx) => {
    lines.push(`${idx + 1}. ${step}`);
  });

  if (secondary && secondary.id !== primary.id && matched[1].score >= top.score * 0.72) {
    lines.push('', `**Related — ${secondary.title}:** ${secondary.summary}`);
  }

  const relatedSuggestions = LINKORA_WEBSITE_REFERENCES.filter(
    (r) => !matched.some((m) => m.ref.id === r.id)
  )
    .slice(0, 3)
    .map((r) => `Tell me about ${r.title}`);

  return {
    reply: lines.join('\n'),
    references: matched.map((m) => toPublicRef(m.ref)),
    suggestions: relatedSuggestions.length > 0 ? relatedSuggestions : DEFAULT_SUGGESTIONS.slice(0, 3),
    currentPageHint,
  };
}
