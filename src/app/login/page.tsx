import { Suspense } from 'react';
import { LoginForm } from '@/features/auth';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-soil-700">
          در حال آماده‌سازی…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
