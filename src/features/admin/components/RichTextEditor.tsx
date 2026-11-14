'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import { useState, useRef, useEffect } from 'react';

type RichTextEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export default function RichTextEditor({
  content,
  onChange,
  placeholder: _placeholder = 'محتوای مقاله را اینجا بنویسید...',
}: RichTextEditorProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTargetBlank, setLinkTargetBlank] = useState(true);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc ps-6 space-y-1',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal ps-6 space-y-1',
          },
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-flora-700 underline font-medium hover:text-flora-700 transition',
        },
      }),
      ImageExtension.configure({
        inline: false,
        HTMLAttributes: {
          class: 'rounded-2xl max-w-full h-auto my-4 shadow-sm border border-soil-900/10',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'min-h-80 max-h-[650px] overflow-y-auto px-4 py-3 text-soil-900 dark:text-dust-100 focus:outline-none leading-relaxed text-sm md:text-base font-normal',
        dir: 'rtl',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  // Sync initial content if loaded asynchronously (e.g. edit article page)
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      if (editor.getText().trim() === '') {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="h-64 rounded-2xl border border-soil-900/15 dark:border-dust-50/15 bg-white dark:bg-flora-900 p-4 text-center text-xs text-soil-700/60 dark:text-dust-200/60 flex items-center justify-center">
        در حال بارگذاری ویرایشگر متن...
      </div>
    );
  }

  const handleOpenLinkModal = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    const currentTarget = editor.getAttributes('link').target;
    setLinkUrl(previousUrl);
    setLinkTargetBlank(currentTarget === '_blank' || !previousUrl);
    setLinkModalOpen(true);
  };

  const handleApplyLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({
          href: linkUrl.trim(),
          target: linkTargetBlank ? '_blank' : null,
        })
        .run();
    }
    setLinkModalOpen(false);
  };

  const handleRemoveLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkModalOpen(false);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setEditorError(null);
      setIsUploadingImage(true);
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

      if (data.url) {
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      }
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'آپلود تصویر با خطا مواجه شد');
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleOpenImageUrlModal = () => {
    setImageUrl('');
    setEditorError(null);
    setImageModalOpen(true);
  };

  const handleApplyImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrl && imageUrl.trim()) {
      editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    }
    setImageModalOpen(false);
  };

  return (
    <div className="rounded-2xl border border-soil-900/15 dark:border-dust-50/15 bg-white dark:bg-flora-900 overflow-hidden shadow-sm dark:shadow-none">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-soil-900/10 dark:border-dust-50/10 bg-dust-50/80 dark:bg-flora-950/80 p-2 text-xs">
        {/* Bold */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded-lg px-2.5 py-1.5 font-bold transition ${
            editor.isActive('bold')
              ? 'bg-flora-900 dark:bg-flora-700 text-white shadow-sm dark:shadow-none'
              : 'text-soil-800 dark:text-dust-200 hover:bg-dust-200 dark:hover:bg-flora-950'
          }`}
          title="پررنگ (Bold)"
        >
          B
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded-lg px-2.5 py-1.5 italic transition ${
            editor.isActive('italic')
              ? 'bg-flora-900 dark:bg-flora-700 text-white shadow-sm dark:shadow-none'
              : 'text-soil-800 dark:text-dust-200 hover:bg-dust-200 dark:hover:bg-flora-950'
          }`}
          title="مورب (Italic)"
        >
          I
        </button>

        <span className="mx-1 h-5 w-px bg-soil-900/10 dark:bg-dust-50/10" />

        {/* Heading 2 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded-lg px-2.5 py-1.5 font-bold transition ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-flora-900 dark:bg-flora-700 text-white shadow-sm dark:shadow-none'
              : 'text-soil-800 dark:text-dust-200 hover:bg-dust-200 dark:hover:bg-flora-950'
          }`}
          title="تیتر ۲"
        >
          H2
        </button>

        {/* Heading 3 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`rounded-lg px-2.5 py-1.5 font-bold transition ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-flora-900 dark:bg-flora-700 text-white shadow-sm dark:shadow-none'
              : 'text-soil-800 dark:text-dust-200 hover:bg-dust-200 dark:hover:bg-flora-950'
          }`}
          title="تیتر ۳"
        >
          H3
        </button>

        <span className="mx-1 h-5 w-px bg-soil-900/10 dark:bg-dust-50/10" />

        {/* Bullet List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
            editor.isActive('bulletList')
              ? 'bg-flora-900 dark:bg-flora-700 text-white shadow-sm dark:shadow-none'
              : 'text-soil-800 dark:text-dust-200 hover:bg-dust-200 dark:hover:bg-flora-950'
          }`}
          title="فهرست نشانه‌دار (Bullet list)"
        >
          • لیست
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
            editor.isActive('orderedList')
              ? 'bg-flora-900 dark:bg-flora-700 text-white shadow-sm dark:shadow-none'
              : 'text-soil-800 dark:text-dust-200 hover:bg-dust-200 dark:hover:bg-flora-950'
          }`}
          title="فهرست شماره‌دار"
        >
          ۱. لیست
        </button>

        <span className="mx-1 h-5 w-px bg-soil-900/10 dark:bg-dust-50/10" />

        {/* Link */}
        <button
          type="button"
          onClick={handleOpenLinkModal}
          className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
            editor.isActive('link')
              ? 'bg-flora-900 dark:bg-flora-700 text-white shadow-sm dark:shadow-none'
              : 'text-soil-800 dark:text-dust-200 hover:bg-dust-200 dark:hover:bg-flora-950'
          }`}
          title="افزودن / ویرایش لینک"
        >
          🔗 پیوند
        </button>

        {/* Image upload */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
        />
        <button
          type="button"
          disabled={isUploadingImage}
          onClick={() => imageInputRef.current?.click()}
          className="rounded-lg px-2.5 py-1.5 font-medium text-soil-800 dark:text-dust-200 hover:bg-dust-200 dark:hover:bg-flora-950 transition disabled:opacity-50"
          title="آپلود تصویر"
        >
          {isUploadingImage ? 'در حال آپلود...' : '🖼️ آپلود عکس'}
        </button>
        <button
          type="button"
          onClick={handleOpenImageUrlModal}
          className="rounded-lg px-2 py-1.5 font-medium text-soil-700/80 dark:text-dust-300 hover:bg-dust-200 dark:hover:bg-flora-950 transition text-[11px]"
          title="درج تصویر از طریق URL"
        >
          لینک عکس
        </button>

        <span className="mx-1 h-5 w-px bg-soil-900/10 dark:bg-dust-50/10" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="rounded-lg px-2 py-1.5 text-soil-800 dark:text-dust-200 hover:bg-dust-200 dark:hover:bg-flora-950 transition disabled:opacity-30"
          title="بازگشت (Undo)"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="rounded-lg px-2 py-1.5 text-soil-800 dark:text-dust-200 hover:bg-dust-200 dark:hover:bg-flora-950 transition disabled:opacity-30"
          title="تکرار (Redo)"
        >
          ↷
        </button>
      </div>

      {editorError && (
        <div className="bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800/40 px-3 py-1.5 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{editorError}</span>
          <button
            type="button"
            onClick={() => setEditorError(null)}
            aria-label="بستن پیام خطا"
            className="text-red-500 font-bold hover:text-red-700 cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-md px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div className="relative">
        <EditorContent editor={editor} />
      </div>

      {/* Link Dialog Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-soil-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-6 shadow-2xl dark:shadow-none text-start">
            <h3 className="text-base font-black text-soil-900 dark:text-dust-50">تنظیم پیوند</h3>
            <form onSubmit={handleApplyLink} className="mt-4 space-y-4">
              <div>
                <label htmlFor="rich-editor-link-url" className="block text-xs font-bold text-soil-700 dark:text-dust-200 mb-1">
                  آدرس اینترنتی (URL)
                </label>
                <input
                  id="rich-editor-link-url"
                  name="rich-editor-link-url"
                  type="url"
                  dir="ltr"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 text-soil-900 dark:text-dust-50 px-3 py-2 text-sm text-left focus:border-flora-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-soil-800 dark:text-dust-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkTargetBlank}
                  onChange={(e) => setLinkTargetBlank(e.target.checked)}
                  className="size-4 rounded border-soil-900/20 dark:border-dust-50/20 text-flora-700 focus:ring-flora-500"
                />
                <span>باز شدن در برگه جدید (target=&ldquo;_blank&rdquo;)</span>
              </label>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-soil-900/10 dark:border-dust-50/10">
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-flora-900 dark:bg-flora-700 px-4 py-2 text-xs font-bold text-white hover:bg-flora-700 dark:hover:bg-flora-900 transition"
                  >
                    تایید
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkModalOpen(false)}
                    className="rounded-xl bg-dust-100 dark:bg-flora-950 px-4 py-2 text-xs font-bold text-soil-800 dark:text-dust-100 hover:bg-dust-200 dark:hover:bg-flora-900 transition"
                  >
                    انصراف
                  </button>
                </div>
                {editor.isActive('link') && (
                  <button
                    type="button"
                    onClick={handleRemoveLink}
                    className="rounded-xl text-red-600 dark:text-red-400 px-2 py-2 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  >
                    حذف لینک
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image URL Modal */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-soil-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-6 shadow-2xl dark:shadow-none text-start">
            <h3 className="text-base font-black text-soil-900 dark:text-dust-50">درج تصویر با لینک</h3>
            <form onSubmit={handleApplyImageUrl} className="mt-4 space-y-4">
              <div>
                <label htmlFor="rich-editor-image-url" className="block text-xs font-bold text-soil-700 dark:text-dust-200 mb-1">
                  آدرس اینترنتی تصویر (URL)
                </label>
                <input
                  id="rich-editor-image-url"
                  name="rich-editor-image-url"
                  type="url"
                  dir="ltr"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 text-soil-900 dark:text-dust-50 px-3 py-2 text-sm text-left focus:border-flora-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-soil-900/10 dark:border-dust-50/10">
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-flora-900 dark:bg-flora-700 px-4 py-2 text-xs font-bold text-white hover:bg-flora-700 dark:hover:bg-flora-900 transition"
                  >
                    درج تصویر
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageModalOpen(false)}
                    className="rounded-xl bg-dust-100 dark:bg-flora-950 px-4 py-2 text-xs font-bold text-soil-800 dark:text-dust-100 hover:bg-dust-200 dark:hover:bg-flora-900 transition"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
