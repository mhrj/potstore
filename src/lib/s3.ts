import { S3Client } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  endpoint: process.env.LIARA_S3_ENDPOINT,
  region: 'default', // Liara does not require a specific region, "default" works
  credentials: {
    accessKeyId: process.env.LIARA_S3_ACCESS_KEY!,
    secretAccessKey: process.env.LIARA_S3_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for S3-compatible providers like Liara
});

