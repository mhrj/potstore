import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TestBanner from '@/components/layout/TestBanner';
import PersianChatbot from '@/components/layout/PersianChatbot';
import PageViewTracker from '@/components/layout/PageViewTracker';

const vazirmatn = localFont({
  src: './fonts/Vazirmatn.woff2',
  display: 'swap',
  variable: '--font-vazirmatn',
});

export const metadata: Metadata = {
  // Required for the relative canonical URLs and Open Graph image paths set by
  // the pages below to resolve into absolute ones.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'پات استور | گلدان، خاک و ملزومات گیاهان',
    template: '%s | پات استور',
  },
  description:
    'خرید و تأمین گلدان سفالی، پلیمری، پلاستیکی، سرامیکی، بتنی، خاک و ابزار گیاهان — خرده و عمده با ارسال به سراسر ایران و پرداخت امن.',
  keywords: ['گلدان', 'خاک گیاه', 'ابزار باغبانی', 'سفال', 'سرامیک', 'گلدان عمده', 'پات استور'],
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: 'پات استور',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#1B4332',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preload" as="image" href="/hero-poster.jpg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      {/* `min-h-dvh` + `flex-col` and a `flex-1` wrapper around the page content
          keep the footer pinned to the bottom of the viewport. Without the
          growing wrapper, a short page (`/checkout/success`, an empty `/cart`,
          `/login`) leaves the footer floating mid-screen with dead space below
          it, because the body is only as tall as its content. */}
      <body className="flex min-h-dvh flex-col bg-dust-50 font-sans text-soil-900 selection:bg-flora-300 selection:text-flora-950 dark:bg-flora-950 dark:text-dust-50">
        <PageViewTracker />
        <TestBanner />
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
        <PersianChatbot />
      </body>
    </html>
  );
}
