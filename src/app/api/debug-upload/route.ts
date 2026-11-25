import { NextResponse } from 'next/server';
import { saveUploadedImage } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const result = await saveUploadedImage(file, 'product');

    return NextResponse.json({ success: true, url: result.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: message,
      },
      { status: 500 },
    );
  }
}

