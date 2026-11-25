import { z } from 'zod';

const RESERVED_SLUGS = new Set([
  'api',
  'auth',
  'login',
  'register',
  'rescue',
  'analytics',
  'health',
  'favicon.ico',
  'robots.txt',
]);

export const safeHttpUrlSchema = z
  .string()
  .trim()
  .min(1, 'Destination URL is required')
  .max(2048, 'Destination URL is too long')
  .refine(
    (value) => {
      const lower = value.toLowerCase();
      if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('file:')) {
        return false;
      }
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    {
      message: 'URL must start with http:// or https:// (javascript:, data:, file: are blocked)',
    }
  );

export const customSlugSchema = z
  .string()
  .trim()
  .min(3, 'Custom slug must be at least 3 characters')
  .max(30, 'Custom slug must be at most 30 characters')
  .regex(/^[a-zA-Z0-9-]+$/, 'Custom slug may only contain letters, numbers, and hyphens')
  .refine((slug) => !RESERVED_SLUGS.has(slug.toLowerCase()), {
    message: 'This slug is reserved and cannot be used',
  });

const optionalDateSchema = z
  .union([z.string().trim(), z.null(), z.undefined()])
  .transform((val) => {
    if (!val) return null;
    return val;
  })
  .refine(
    (val) => {
      if (val === null) return true;
      const date = new Date(val);
      return !Number.isNaN(date.getTime());
    },
    { message: 'expiresAt must be a valid ISO date/time' }
  );

export const createLinkSchema = z.object({
  originalUrl: safeHttpUrlSchema,
  customSlug: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .pipe(customSlugSchema.optional()),
  expiresAt: optionalDateSchema,
});

export const qrStyleConfigSchema = z
  .object({
    dotStyle: z.enum(['square', 'rounded', 'dots', 'classy-rounded']).default('square'),
    cornerStyle: z.enum(['square', 'extra-rounded', 'dot']).default('square'),
    foregroundColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Foreground color must be a 6-digit hex color')
      .default('#0f172a'),
    backgroundColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Background color must be a 6-digit hex color')
      .default('#ffffff'),
    accentColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Accent color must be a 6-digit hex color')
      .optional(),
    frameMode: z
      .enum(['none', 'center-logo', 'color-matched', 'branded-card'])
      .default('none'),
    ctaText: z.string().trim().max(40).optional(),
    logoDataUrl: z
      .string()
      .max(400_000, 'Uploaded image is too large; please use a smaller image')
      .refine(
        (v) => v.startsWith('data:image/'),
        'logoDataUrl must be a valid image data URL'
      )
      .nullable()
      .optional(),
  })
  .nullable();

export const updateLinkSchema = z
  .object({
    originalUrl: safeHttpUrlSchema.optional(),
    targetUrl: safeHttpUrlSchema.optional(),
    status: z.enum(['ACTIVE', 'EXPIRED', 'DISABLED']).optional(),
    expiresAt: optionalDateSchema.optional(),
    qrStyleConfig: qrStyleConfigSchema.optional(),
  })
  .refine(
    (data) =>
      data.originalUrl !== undefined ||
      data.targetUrl !== undefined ||
      data.status !== undefined ||
      data.expiresAt !== undefined ||
      data.qrStyleConfig !== undefined,
    {
      message:
        'Provide at least one field (originalUrl, targetUrl, status, expiresAt, or qrStyleConfig) to update',
    }
  );

export const createGuestLinkSchema = z.object({
  originalUrl: safeHttpUrlSchema,
  customSlug: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .pipe(customSlugSchema.optional()),
  expiresAt: optionalDateSchema,
});

export const claimLinksSchema = z.object({
  slugs: z
    .array(z.string().trim().min(1))
    .max(50, 'Cannot claim more than 50 links at once')
    .default([]),
});
