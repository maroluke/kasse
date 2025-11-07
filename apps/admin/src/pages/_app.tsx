import type { AppProps } from 'next/app';
import React from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../lib/AuthProvider';
import { TenantProvider } from '../lib/TenantProvider';
import '../styles/globals.css';
import Link from 'next/link';
import { Button } from '@kasse/ui';
import { Toaster } from 'sonner';

function Guard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const currentPath = (typeof window !== 'undefined' ? window.location.pathname : router.asPath) || router.asPath;
  const isLogin = currentPath === '/login';
  React.useEffect(() => {
    if (!loading) {
      if (!user && !isLogin) router.replace('/login');
      if (user && isLogin) router.replace('/');
    }
  }, [user, loading, isLogin, router]);
  if (loading) return <div className="p-4">Loading…</div>;
  if (!user && !isLogin) return null;
  return (
    <>
      {!isLogin && (
        <div className="sticky top-0 z-20 bg-foreground text-background">
          <div className="flex items-center gap-2 px-3 py-2">
            <Link href="/" className="font-bold mr-2">Admin</Link>
            <Button asChild variant="secondary" size="sm"><Link href="/products">Products</Link></Button>
            <Button asChild variant="secondary" size="sm"><Link href="/outlets">Outlets</Link></Button>
            <Button asChild variant="secondary" size="sm"><Link href="/categories">Categories</Link></Button>
            <Button asChild variant="secondary" size="sm"><Link href="/outlet-pricing">Outlet Pricing</Link></Button>
            <Button asChild variant="secondary" size="sm"><Link href="/settings/vat">VAT</Link></Button>
            <Button asChild variant="secondary" size="sm"><Link href="/reports/daily">Daily</Link></Button>
            <Button asChild variant="secondary" size="sm"><Link href="/reports/overview">Overview</Link></Button>
          </div>
        </div>
      )}
      <div className="p-4">{children}</div>
      <Toaster richColors />
    </>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <TenantProvider>
        <Guard>
          <Component {...pageProps} />
        </Guard>
      </TenantProvider>
    </AuthProvider>
  );
}
