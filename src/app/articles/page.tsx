import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { ArticlesListView } from '@/features/articles';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'مقالات و راهنمای نگهداری گیاهان و گلدان | پات استور',
  description:
    'مجموعه راهنماها، مقالات تخصصی و نکات کلیدی برای انتخاب بهترین گلدان، ترکیب خاک مناسب و مراقبت اصولی از گیاهان آپارتمانی.',
  alternates: { canonical: '/articles' },
  openGraph: {
    title: 'مقالات و راهنمای نگهداری گیاهان و گلدان | پات استور',
    description:
      'مجموعه راهنماها و نکات تخصصی برای انتخاب گلدان، خاک و مراقبت از گیاهان.',
    type: 'website',
  },
};

type Props = {
  searchParams: Promise<{ tag?: string }>;
};

export default async function ArticlesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const currentTag = sp.tag ? sp.tag.trim() : '';

  const allPublished = await prisma.article.findMany({
    where: { isPublished: true },
    select: { tags: true },
  });

  const allTags = Array.from(
    new Set(allPublished.flatMap((a) => a.tags || []).filter(Boolean)),
  ).sort();

  const articles = await prisma.article.findMany({
    where: {
      isPublished: true,
      ...(currentTag ? { tags: { has: currentTag } } : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      tags: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <ArticlesListView
      articles={articles}
      allTags={allTags}
      totalPublishedCount={allPublished.length}
      currentTag={currentTag}
    />
  );
}
