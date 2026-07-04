'use client';

import React, { useEffect, useState } from 'react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getPageTitle = (path: string) => {
    if (path.startsWith('/dashboard')) return 'Compliance Command Center';
    if (path.startsWith('/circulars/new')) return 'Ingest Regulatory Circular';
    if (path.startsWith('/circulars')) return 'Ingested Circulars';
    if (path.startsWith('/maps')) return 'Measurable Action Points (MAPs)';
    if (path.startsWith('/vault')) return 'TrustVault Ledger';
    if (path.startsWith('/risk-review')) return 'BehaviorGuard Risk Review Queue';
    if (path.startsWith('/branch/')) return 'Branch Compliance Portal';
    return 'LexFlow AI';
  };

  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/') {
      router.push('/');
    }
  }, [pathname, loading, isAuthenticated, router]);

  useEffect(() => {
    setIsSidebarOpen(false); // Close sidebar on navigation
  }, [pathname]);

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

  const isBranchPortal = pathname.startsWith('/branch');

  return (
    <div className="flex min-h-screen bg-neutral-bg relative overflow-hidden">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        <Header 
          title={isBranchPortal ? 'Canara Bank Branch Portal' : pageTitle} 
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
