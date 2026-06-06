import React from 'react';
import { Cpu, Wifi } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-8 flex items-center justify-between shadow-sm shrink-0">
      <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
      
      <div className="flex items-center gap-4">
        {/* Local LLM indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-xs font-semibold text-primary-700">
          <Cpu className="h-4.5 w-4.5 animate-pulse text-primary-500" />
          <span>Ollama Engine Active (Sarvam-2B)</span>
        </div>

        {/* Database Status indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-50 border border-success-100 text-xs font-semibold text-success-700">
          <Wifi className="h-4.5 w-4.5 text-success-500" />
          <span>TrustVault Ledger: Online</span>
        </div>
      </div>
    </header>
  );
}
