import type { Metadata } from 'next';
import { getContentMap } from '@/lib/content';
import { AboutPageView } from '@/features/landing';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'درباره ما',
  description:
    'درباره پات استور —  تأمین‌کننده گلدان‌های سفالی، سرامیکی، خاک تخصصی و ابزار باغبانی با ارسال به سراسر ایران.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'درباره ما | پات استور',
    description:
      'پات استور تامین کننده بهترین گلدان‌ها، خاک و ابزارهای نگهداری گیاهان از برترین کارگاه‌های ایران.',
    type: 'website',
  },
};

export default async function AboutPage() {
  const content = await getContentMap();

  return <AboutPageView content={content} />;
}
