'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  FilePlus2, 
  ListTodo, 
  ShieldAlert, 
  Database,
  LogOut,
  Building,
  UserCheck,
  X
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const menuItems = [
    { name: t('Dashboard'), href: '/dashboard', icon: LayoutDashboard, roles: ['COMPLIANCE_OFFICER', 'REGIONAL_HEAD'] },
    { name: t('Ingest Circular'), href: '/circulars/new', icon: FilePlus2, roles: ['COMPLIANCE_OFFICER'] },
    { name: t('MAP Management'), href: '/maps', icon: ListTodo, roles: ['COMPLIANCE_OFFICER', 'REGIONAL_HEAD'] },
    { name: t('TrustVault Ledger'), href: '/vault', icon: Database, roles: ['COMPLIANCE_OFFICER', 'AUDITOR'] },
    { name: t('Risk Review Queue'), href: '/risk-review', icon: ShieldAlert, roles: ['COMPLIANCE_OFFICER'] },
  ];

  // If user is a branch manager, show their localized links or suppress central sidebar
  const isBranchManager = user?.role === 'BRANCH_MANAGER';

  // Filter items based on user role
  const allowedItems = menuItems.filter(item => 
    !user || item.roles.includes(user.role)
  );

  if (isBranchManager) {
    return (
      <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col justify-between p-4 border-r border-slate-800">
        <div>
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-emerald-500" />
              <span className="font-bold text-lg tracking-wider">LexFlow Portal</span>
            </div>
            {onClose && (
              <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <nav className="space-y-1">
            <Link 
              href={`/branch/${user.branch_lgd_code}/maps`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                pathname.includes('/maps') 
                  ? 'bg-slate-800 text-white border-l-4 border-emerald-500 pl-2' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ListTodo className="h-5 w-5" />
              <span>{t('Compliance Tasks')}</span>
            </Link>
          </nav>
        </div>
        <div className="border-t border-slate-800 pt-4 px-2 space-y-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase">Branch Portal</span>
            <span className="text-sm font-medium text-slate-200 mt-1">{user.name}</span>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full w-max mt-1">
              LGD: {user.branch_lgd_code}
            </span>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>{t('Sign Out')}</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-[#0D1F3C] text-white flex flex-col justify-between border-r border-slate-800 shrink-0 h-full min-h-screen">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Building className="h-7 w-7 text-primary-300" />
            <div>
              <h1 className="font-bold text-lg tracking-tight">LexFlow AI</h1>
              <p className="text-[10px] text-primary-200 uppercase tracking-widest font-semibold">Canara Bank</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white p-1">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="space-y-1.5">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-slate-800 space-y-4">
        {user && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary-300" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Active User')}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{user.email}</p>
            </div>
            <span className="inline-block text-[10px] bg-primary-800 text-primary-200 px-2 py-0.5 rounded-full font-semibold">
              {t(user.role.replace('_', ' '))}
            </span>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors border border-red-900/30"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('Sign Out')}</span>
        </button>
      </div>
    </aside>
  );
}
