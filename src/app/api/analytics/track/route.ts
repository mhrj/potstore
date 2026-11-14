import { NextResponse } from 'next/server';
import { z } from 'zod';
import { trackPageView } from '@/lib/analytics-tracker';

const trackSchema = z
  .object({
    path: z.string().min(1).max(256),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = trackSchema.safeParse(rawBody);

    if (parsed.success && parsed.data.path) {
      await trackPageView(parsed.data.path, req);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Analytics tracking endpoint error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
