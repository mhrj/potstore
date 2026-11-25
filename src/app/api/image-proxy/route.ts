import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '@/lib/s3';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key'); // e.g., "products/12345.webp"

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.LIARA_S3_BUCKET,
      Key: key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Convert the stream to bytes
    const bytes = await response.Body.transformToByteArray();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': response.ContentType || 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    });
  } catch (error: unknown) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}

