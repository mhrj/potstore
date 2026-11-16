'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Select from '@/components/ui/Select';

type Props = {
  tags: { name: string; slug: string }[];
  tagSlug: string;
};

export default function TagFilterSelect({ tags, tagSlug }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextTag = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (nextTag) {
      params.set('tag', nextTag);
    } else {
      params.delete('tag');
    }
    // Changing the filter resets pagination to page 1
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : '/products');
  };

  return (
    <Select
      name="tag"
      value={tagSlug}
      onChange={handleChange}
      containerClassName="mt-2 min-w-[140px] sm:min-w-[150px]"
    >
      <option value="">همه</option>
      {tags.map((t) => (
        <option key={t.slug} value={t.slug}>
          {t.name}
        </option>
      ))}
    </Select>
  );
}
