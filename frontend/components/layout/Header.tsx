import React from 'react';
import { Cpu, Wifi, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-4 md:px-8 flex items-center justify-between shadow-sm shrink-0">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        {/* Local LLM indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-xs font-semibold text-primary-700 whitespace-nowrap">
          <Cpu className="h-4 w-4 md:h-4.5 md:w-4.5 animate-pulse text-primary-500" />
          <span className="hidden md:inline">Ollama Engine Active (Sarvam-2B)</span>
          <span className="md:hidden">Local AI</span>
        </div>

        {/* Database Status indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-50 border border-success-100 text-xs font-semibold text-success-700 whitespace-nowrap">
          <Wifi className="h-4 w-4 md:h-4.5 md:w-4.5 text-success-500" />
          <span className="hidden md:inline">TrustVault Ledger: Online</span>
          <span className="md:hidden">Online</span>
        </div>
      </div>
    </header>
  );
}
