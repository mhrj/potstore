'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import RichTextEditor from '@/features/admin/components/RichTextEditor';

type ArticleData = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  tags: string[];
  isPublished: boolean;
};

type ArticleFormProps = {
  initialData?: ArticleData;
};

export default function ArticleForm({ initialData }: ArticleFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  const [title, setTitle] = useState(initialData?.title || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || '');
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join('، ') || '');
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCover(true);
      setError(null);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'product');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'خطا در آپلود تصویر');
      }

      setCoverImage(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'آپلود ناموفق بود');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('عنوان مقاله الزامی است');
      return;
    }

    if (!content.trim() || content.trim() === '<p></p>') {
      setError('محتوای مقاله الزامی است');
      return;
    }

    // Split tags by comma (both English ',' and Persian '،')
    const parsedTags = tagsInput
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      content,
      coverImage: coverImage.trim() || null,
      tags: parsedTags,
      isPublished,
    };

    try {
      setIsSaving(true);
      const url = isEditing
        ? `/api/admin/articles/${initialData?.id}`
        : '/api/admin/articles';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'خطا در ذخیره مقاله');
      }

      router.push('/admin/articles');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای غیرمنتظره رخ داد');
      setIsSaving(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-4 text-xs font-bold text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-6 md:p-8 shadow-sm dark:shadow-none space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-soil-800 dark:text-dust-200 mb-2">
            عنوان مقاله <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: ۵ اشتباه رایج در تعویض گلدان سانسوریا"
            className="w-full rounded-2xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 px-4 py-3 text-sm font-medium text-soil-900 dark:text-dust-50 placeholder:text-soil-700/40 dark:placeholder:text-dust-200/40 focus:border-flora-500 focus:outline-none"
            required
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-xs font-bold text-soil-800 dark:text-dust-200 mb-2">
            نامک یکتا (Slug)
            <span className="ms-2 text-[11px] font-normal text-soil-700/60 dark:text-dust-200/60">
              (در صورت خالی بودن، به صورت خودکار از عنوان تولید می‌شود)
            </span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="مثال: sansevieria-pot-repotting-guide"
            dir="auto"
            className="w-full rounded-2xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 px-4 py-3 text-sm font-medium text-soil-900 dark:text-dust-50 placeholder:text-soil-700/40 dark:placeholder:text-dust-200/40 focus:border-flora-500 focus:outline-none"
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-xs font-bold text-soil-800 dark:text-dust-200 mb-2">
            تصویر شاخص (Cover Image)
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <input
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="آدرس اینترنتی تصویر یا آپلود مستقیم"
              dir="ltr"
              className="flex-1 w-full rounded-2xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 px-4 py-3 text-xs font-medium text-soil-900 dark:text-dust-50 placeholder:text-soil-700/40 dark:placeholder:text-dust-200/40 focus:border-flora-500 focus:outline-none"
            />
            <label className="shrink-0 cursor-pointer rounded-2xl bg-soil-100 dark:bg-flora-700 px-5 py-3 text-xs font-bold text-soil-900 dark:text-dust-100 hover:bg-soil-200 dark:hover:bg-flora-900 transition">
              {isUploadingCover ? 'در حال آپلود...' : 'انتخاب و آپلود عکس'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingCover}
                onChange={handleUploadCover}
              />
            </label>
          </div>
          {coverImage && (
            <div className="mt-3 relative h-40 w-72 overflow-hidden rounded-2xl border border-soil-900/5 dark:border-dust-50/10 bg-white dark:bg-flora-950">
              <Image
                src={coverImage}
                alt="پیش‌نمایش تصویر شاخص"
                fill
                className="object-cover"
                sizes="300px"
              />
              <button
                type="button"
                onClick={() => setCoverImage('')}
                className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white hover:bg-black"
              >
                حذف
              </button>
            </div>
          )}
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-xs font-bold text-soil-800 dark:text-dust-200 mb-2">
            خلاصه مقاله (Excerpt)
            <span className="ms-2 text-[11px] font-normal text-soil-700/60 dark:text-dust-200/60">
              (متن کوتاه برای نمایش در کارت‌های لیست مقالات و پیش‌نمایش شبکه‌های اجتماعی)
            </span>
          </label>
          <textarea
            rows={3}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="خلاصه‌ای دو تا سه خطی از موضوع مقاله بنویسید..."
            className="w-full rounded-2xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 px-4 py-3 text-sm font-medium text-soil-900 dark:text-dust-50 placeholder:text-soil-700/40 dark:placeholder:text-dust-200/40 focus:border-flora-500 focus:outline-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-bold text-soil-800 dark:text-dust-200 mb-2">
            برچسب‌ها (Tags)
            <span className="ms-2 text-[11px] font-normal text-soil-700/60 dark:text-dust-200/60">
              (برچسب‌ها را با ویرگول یا کاما جدا کنید، مثال: خاک، گلدان، نگهداری)
            </span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="خاک، گلدان، نگهداری گیاه، زهکشی"
            className="w-full rounded-2xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 px-4 py-3 text-sm font-medium text-soil-900 dark:text-dust-50 placeholder:text-soil-700/40 dark:placeholder:text-dust-200/40 focus:border-flora-500 focus:outline-none"
          />
        </div>

        {/* Rich Text Content */}
        <div>
          <label className="block text-xs font-bold text-soil-800 dark:text-dust-200 mb-2">
            متن کامل مقاله <span className="text-red-500">*</span>
          </label>
          <RichTextEditor content={content} onChange={setContent} />
        </div>

        {/* Status checkbox */}
        <div className="pt-4 border-t border-soil-900/10 dark:border-dust-50/10">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="size-5 rounded border-soil-900/20 dark:border-dust-50/20 text-flora-700 focus:ring-flora-500"
            />
            <div>
              <p className="text-sm font-bold text-soil-900 dark:text-dust-50">انتشار عمومی در وبلاگ</p>
              <p className="text-xs text-soil-700/60 dark:text-dust-200/60">
                در صورت فعال بودن، مقاله برای کاربران و موتورهای جستجو نمایش داده می‌شود.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-2xl bg-flora-900 dark:bg-flora-700 px-8 py-3.5 text-sm font-black text-white shadow-md shadow-flora-950/20 dark:shadow-none transition hover:bg-flora-700 dark:hover:bg-flora-900 disabled:opacity-50"
        >
          {isSaving ? 'در حال ثبت…' : isEditing ? 'ثبت تغییرات' : 'انتشار مقاله'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/articles')}
          className="rounded-2xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 px-6 py-3.5 text-sm font-bold text-soil-800 dark:text-dust-100 transition hover:bg-dust-100 dark:hover:bg-flora-950"
        >
          انصراف
        </button>
      </div>
    </form>
  );
}
