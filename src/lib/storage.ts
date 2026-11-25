import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { s3 } from '@/lib/s3';
import { sniffImageType } from '@/lib/image-validation';

export type UploadKind = 'product' | 'landing';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const maxBytes = 5 * 1024 * 1024;

/**
 * The type the client claimed, or '' when it declined to say. Kept only so a
 * claim that contradicts the real content can be rejected; it never decides how
 * the file is stored.
 */
function declaredMimeType(file: File) {
  const type = file.type && file.type !== 'application/octet-stream' ? file.type : '';
  return allowedMimeTypes.has(type) ? type : '';
}

export async function saveUploadedImage(file: File, kind: UploadKind = 'product') {
  if (!(file instanceof File)) {
    throw new Error('فایل نامعتبر است');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes.byteLength === 0) {
    throw new Error('فایل ارسال‌شده خالی است');
  }

  if (bytes.byteLength > maxBytes) {
    throw new Error('حجم تصویر بیش از ۵ مگابایت است');
  }

  // Decide the format from the bytes themselves. The filename extension and the
  // client's Content-Type are both attacker-controlled and are not trusted.
  const detected = sniffImageType(bytes);
  if (!detected) {
    throw new Error(
      'محتوای فایل یک تصویر معتبر نیست. فقط JPG، PNG، WebP، AVIF یا GIF پذیرفته می‌شود.',
    );
  }

  const declared = declaredMimeType(file);
  if (declared && declared !== detected) {
    throw new Error('نوع اعلام‌شده فایل با محتوای واقعی آن مطابقت ندارد');
  }

  const bucket = process.env.LIARA_S3_BUCKET?.trim();
  const endpoint = process.env.LIARA_S3_ENDPOINT?.trim();

  if (!bucket || !endpoint) {
    throw new Error('تنظیمات فضای ابری (LIARA_S3_BUCKET / LIARA_S3_ENDPOINT) کامل نیست');
  }

  // 1. Convert to WebP using sharp
  const webpBuffer = await sharp(Buffer.from(bytes))
    .webp({ quality: 80 })
    .toBuffer();

  // 2. Generate a unique filename
  const filename = `${randomUUID()}.webp`;
  const folder = kind === 'landing' ? 'landing' : 'products';
  const key = `${folder}/${filename}`;

  // 3. Upload to Liara Object Storage
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: webpBuffer,
    ContentType: 'image/webp',
  });

  try {
    await s3.send(command);
  } catch (error: unknown) {
    const err = error as {
      name?: string;
      message?: string;
      Code?: string;
      code?: string;
      $metadata?: { httpStatusCode?: number };
    };
    console.error('=== [S3 UPLOAD ERROR] ===');
    console.error('Name:', err?.name);
    console.error('Message:', err?.message);
    console.error('Code:', err?.Code || err?.code);
    console.error('Status Code:', err?.$metadata?.httpStatusCode);
    console.error('Full Error:', error);
    throw new Error(`S3 Upload Failed: ${err?.message || 'Unknown error'}`);
  }

  // 4. Return the internal API proxy URL
  const url = `/api/image-proxy?key=${encodeURIComponent(key)}`;

  return {
    url,
    filename,
    kind,
  };
}
