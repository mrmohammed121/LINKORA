export interface SlugSanitizeResult {
  slug: string;
  notice: string | null;
}

/**
 * Sanitizes user input for custom back-half/slug fields.
 * Extracts the trailing path segment if a full URL is pasted and strips invalid characters.
 */
export function sanitizeSlugInput(raw: string): SlugSanitizeResult {
  if (!raw) return { slug: '', notice: null };

  let working = raw.trim();
  let notice: string | null = null;

  if (/^https?:\/\//i.test(working)) {
    try {
      const parsed = new URL(working);
      const segments = parsed.pathname.split('/').filter(Boolean);
      working = segments[segments.length - 1] ?? '';
      notice = working
        ? `Extracted slug "${working}" from pasted URL.`
        : 'Removed URL prefix — enter a 3–30 character slug or leave blank.';
    } catch {
      working = working.replace(/^https?:\/\//i, '');
      notice = 'Removed URL prefix from custom slug.';
    }
  }

  if (working.startsWith('/')) {
    working = working.replace(/^\/+/, '');
    notice = notice ?? 'Removed leading slash from custom slug.';
  }

  const cleaned = working
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .slice(0, 30);

  if (cleaned !== working && !notice) {
    notice = 'Custom slugs only allow letters, numbers, and hyphens (max 30 chars).';
  }

  return { slug: cleaned, notice };
}

export function validateSlugForSubmit(slug: string): string | null {
  if (!slug) return null;
  if (slug.length < 3) {
    return 'Custom slug must be at least 3 characters (or leave empty to auto-generate).';
  }
  if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
    return 'Custom slug may only contain letters, numbers, and hyphens.';
  }
  return null;
}
