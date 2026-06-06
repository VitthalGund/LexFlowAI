'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/hooks/useAuth';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const getPageTitle = (path: string) => {
    if (path.startsWith('/dashboard')) {
      return 'Compliance Command Center';
    } else if (path.startsWith('/circulars/new')) {
      return 'Ingest Regulatory Circular';
    } else if (path.startsWith('/circulars')) {
      return 'Ingested Circulars';
    } else if (path.startsWith('/maps')) {
      return 'Measurable Action Points (MAPs)';
    } else if (path.startsWith('/vault')) {
      return 'TrustVault Ledger';
    } else if (path.startsWith('/risk-review')) {
      return 'BehaviorGuard Risk Review Queue';
    } else if (path.startsWith('/branch/')) {
      return 'Branch Compliance Portal';
    } else {
      return 'LexFlow AI';
    }
  };

  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    // Redirect to login if not authenticated (except for login page)
    if (!loading && !isAuthenticated && pathname !== '/') {
      router.push('/');
    }
  }, [pathname, loading, isAuthenticated, router]);

  // Don't wrap landing/login page
  if (pathname === '/') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-600">Verifying secure compliance credentials...</span>
        </div>
      </div>
    );
  }

  // Branch managers have a slightly cleaner desktop portal or custom sidebar
  const isBranchPortal = pathname.startsWith('/branch');

  return (
    <div className="flex min-h-screen bg-neutral-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={isBranchPortal ? 'Canara Bank Branch Portal' : pageTitle} />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
