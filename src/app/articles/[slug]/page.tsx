import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { ArticleDetailView } from '@/features/articles';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const article = await prisma.article.findFirst({
    where: {
      OR: [{ slug: decodedSlug }, { slug }],
      isPublished: true,
    },
    select: {
      title: true,
      excerpt: true,
      slug: true,
      coverImage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!article) {
    return {
      title: 'مقاله یافت نشد | پات استور',
    };
  }

  const title = `${article.title} | وبلاگ پات استور`;
  const description =
    article.excerpt ||
    'راهنما و مقاله تخصصی انتخاب گلدان و نگهداری اصولی گل و گیاه در پات استور.';

  return {
    title,
    description,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/articles/${article.slug}`,
      publishedTime: article.createdAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      images: article.coverImage ? [{ url: article.coverImage }] : undefined,
    },
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const article = await prisma.article.findFirst({
    where: {
      OR: [{ slug: decodedSlug }, { slug }],
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
      excerpt: true,
      content: true,
      tags: true,
      createdAt: true,
    },
  });

  if (!article) {
    notFound();
  }

  const relatedArticles = await prisma.article.findMany({
    where: {
      isPublished: true,
      NOT: { id: article.id },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
      excerpt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  const formattedDate = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(article.createdAt);

  return (
    <ArticleDetailView
      article={article}
      relatedArticles={relatedArticles}
      formattedDate={formattedDate}
    />
  );
}
