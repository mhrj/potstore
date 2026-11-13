'use client';

import { useState, useTransition } from 'react';
import Container from '@/components/ui/Container';
import { submitWholesaleInquiryAction } from '@/features/landing/actions/wholesale-actions';

export default function WholesaleInquiryForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    businessName: '',
    estimatedQty: '۲۰ تا ۵۰ عدد',
    message: '',
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'لطفاً نام و نام خانوادگی خود را وارد کنید.';
    }
    const cleanPhone = formData.phone.trim();
    if (!cleanPhone) {
      newErrors.phone = 'لطفاً شماره تماس را وارد کنید.';
    } else if (!/^09\d{9}$/.test(cleanPhone.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))))) {
      newErrors.phone = 'شماره همراه باید ۱۱ رقم و با ۰۹ آغاز شود.';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    startTransition(async () => {
      const res = await submitWholesaleInquiryAction(formData);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSuccess(true);
    });
  };

  return (
    <section id="wholesale-inquiry" className="scroll-mt-24 py-20 relative">
      <div id="b2b-form" className="absolute -top-24" aria-hidden="true" />
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-flora-700/30 bg-gradient-to-br from-flora-950 via-flora-900 to-soil-950 p-8 text-white shadow-2xl sm:p-12 lg:p-16">
          {/* Subtle botanical glow background */}
          <div
            aria-hidden
            className="pointer-events-none absolute -end-24 -top-24 size-96 rounded-full bg-flora-500/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -start-24 size-96 rounded-full bg-dust-400/10 blur-3xl"
          />

          <div className="relative grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-flora-300/30 bg-flora-700/50 px-4 py-1.5 text-xs font-bold text-flora-300 backdrop-blur">
                🏢 بخش همکاری سازمانی و B2B
              </span>
              <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                تأمین عمده برای گلخانه‌ها، کافه‌ها، هتل‌ها و شرکت‌ها
              </h2>
              <p className="mt-5 text-sm leading-8 text-flora-100/85 sm:text-base">
                اگر قصد تجهیز یک پروژه بزرگ را دارید یا به <strong className="font-bold text-white">فاکتور رسمی و قرارداد سازمانی</strong> نیاز دارید، فرم زیر را تکمیل کنید تا کارشناسان ما بهترین شرایط را به شما ارائه دهند.
              </p>

              <div className="mt-8 space-y-3.5">
                {[
                  'تولید سفارشی با پالت رنگ و لعاب مدنظر شما',
                  'پالت‌بندی چوبی استاندارد برای حمل ایمن بین‌شهری',
                  'صدور پیش‌فاکتور رسمی و امکان پرداخت دو مرحله‌ای',
                  'ارسال نمونه رایگان برای پروژه‌های با تیراژ بالا',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-xs sm:text-sm text-flora-100/90">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-flora-500/30 text-flora-300">
                      ✓
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-xl backdrop-blur-md sm:p-8">
                {success ? (
                  <div className="py-8 text-center animate-fade-in">
                    <div className="mx-auto grid size-16 place-items-center rounded-full bg-flora-500/20 text-3xl text-flora-300">
                      🌿
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-white">
                      درخواست شما با موفقیت دریافت شد!
                    </h3>
                    <p className="mt-3 text-xs leading-6 text-flora-100/85 sm:text-sm">
                      اطلاعات سفارش شما به مدیریت فروش پات استور ارسال شد. کارشناسان ما ظرف حداکثر ۲۴ ساعت کاری با شماره ثبت‌شده تماس خواهند گرفت.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSuccess(false);
                        setFormData({
                          fullName: '',
                          phone: '',
                          businessName: '',
                          estimatedQty: '۲۰ تا ۵۰ عدد',
                          message: '',
                        });
                      }}
                      className="mt-6 inline-flex rounded-full bg-flora-500/30 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-flora-500/50"
                    >
                      ثبت درخواست جدید
                    </button>
                  </div>
                ) : (
                  <form noValidate onSubmit={handleSubmit} className="space-y-4">
                    <div className="border-b border-white/10 pb-3">
                      <h3 className="text-lg font-black text-white">
                        فرم استعلام و دریافت پیش‌فاکتور
                      </h3>
                      <p className="text-xs text-flora-300/70">
                        مشخصات خود را وارد کنید تا کارشناسان ما با شما ارتباط بگیرند.
                      </p>
                    </div>

                    {error && (
                      <div className="rounded-xl bg-rose-500/20 p-3 text-xs text-rose-200 border border-rose-500/30">
                        {error}
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="wholesale-fullname" className="block text-xs font-medium text-flora-100/90 mb-1.5">
                          نام و نام خانوادگی <span className="text-rose-400">*</span>
                        </label>
                        <input
                          id="wholesale-fullname"
                          name="fullName"
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="مثال: علی رضایی"
                          className="w-full rounded-xl border border-white/20 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-flora-300 focus:bg-white/10 focus:outline-none transition"
                        />
                        {fieldErrors.fullName && (
                          <p className="mt-1 text-[11px] text-rose-300">{fieldErrors.fullName}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="wholesale-phone" className="block text-xs font-medium text-flora-100/90 mb-1.5">
                          شماره تماس <span className="text-rose-400">*</span>
                        </label>
                        <input
                          id="wholesale-phone"
                          name="phone"
                          type="tel"
                          dir="ltr"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                          className="w-full rounded-xl border border-white/20 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-flora-300 focus:bg-white/10 focus:outline-none transition text-end"
                        />
                        {fieldErrors.phone && (
                          <p className="mt-1 text-[11px] text-rose-300">{fieldErrors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="wholesale-business-name" className="block text-xs font-medium text-flora-100/90 mb-1.5">
                          نام کسب‌وکار یا برند (اختیاری)
                        </label>
                        <input
                          id="wholesale-business-name"
                          name="businessName"
                          type="text"
                          value={formData.businessName}
                          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                          placeholder="کافه، گلخانه، شرکت..."
                          className="w-full rounded-xl border border-white/20 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-flora-300 focus:bg-white/10 focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="wholesale-estimated-qty" className="block text-xs font-medium text-flora-100/90 mb-1.5">
                          تیراژ تقریبی مدنظر
                        </label>
                        <select
                          id="wholesale-estimated-qty"
                          name="estimatedQty"
                          value={formData.estimatedQty}
                          onChange={(e) => setFormData({ ...formData, estimatedQty: e.target.value })}
                          className="w-full rounded-xl border border-white/20 bg-flora-950 px-3.5 py-2.5 text-xs text-white focus:border-flora-300 focus:outline-none transition"
                        >
                          <option value="۲۰ تا ۵۰ عدد">۲۰ تا ۵۰ عدد (تخفیف اولیه)</option>
                          <option value="۵۰ تا ۱۰۰ عدد">۵۰ تا ۱۰۰ عدد (تخفیف همکار)</option>
                          <option value="۱۰۰ تا ۵۰۰ عدد">۱۰۰ تا ۵۰۰ عدد (تخفیف ویژه کارگاهی)</option>
                          <option value="بیش از ۵۰۰ عدد">بیش از ۵۰۰ عدد (تولید اختصاصی)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="wholesale-message" className="block text-xs font-medium text-flora-100/90 mb-1.5">
                        توضیحات یا مدل‌های مدنظر (اختیاری)
                      </label>
                      <textarea
                        id="wholesale-message"
                        name="message"
                        rows={2}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="سایز، رنگ یا هر نکته دیگری که برای ما مهم است..."
                        className="w-full rounded-xl border border-white/20 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-white/40 focus:border-flora-300 focus:bg-white/10 focus:outline-none transition resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="group relative w-full overflow-hidden rounded-xl bg-flora-500 py-3 text-xs font-bold text-soil-950 shadow-lg shadow-flora-500/25 transition duration-300 hover:bg-flora-300 active:scale-[0.99] disabled:opacity-60"
                    >
                      <span className="flex items-center justify-center gap-2">
                        {isPending ? (
                          <>
                            <span className="size-4 animate-spin rounded-full border-2 border-soil-950 border-t-transparent" />
                            در حال ثبت استعلام...
                          </>
                        ) : (
                          <>
                            <span className="transition duration-300 group-hover:rotate-12 group-hover:scale-125">
                              🌱
                            </span>
                            ارسال درخواست استعلام و پیش‌فاکتور
                          </>
                        )}
                      </span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
