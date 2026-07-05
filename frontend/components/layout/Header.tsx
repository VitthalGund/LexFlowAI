"use client";

import React, { useState, useEffect } from "react";
import { Menu, Globe, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import "../../lib/i18n";

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  useEffect(() => {
    // Add Google Translate script if it doesn't exist
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);

      // Add initialization function
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: "en",
            layout:
              (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element",
        );
      };

    }
  }, []);

  const languages = [
    { code: "en", label: "English (EN)" },
    { code: "as", label: "অসমীয়া (Assamese)" },
    { code: "bn", label: "বাংলা (Bengali)" },
    { code: "brx", label: "बड़ो (Bodo)" },
    { code: "doi", label: "डोगरी (Dogri)" },
    { code: "gu", label: "ગુજરાતી (Gujarati)" },
    { code: "hi", label: "हिंदी (Hindi)" },
    { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
    { code: "ks", label: "कॉशुर (Kashmiri)" },
    { code: "gom", label: "कोंकणी (Konkani)" },
    { code: "mai", label: "मैथिली (Maithili)" },
    { code: "ml", label: "മലയാളം (Malayalam)" },
    { code: "mni-Mtei", label: "मৈতৈলোন (Manipuri)" },
    { code: "mr", label: "मराठी (Marathi)" },
    { code: "ne", label: "नेपाली (Nepali)" },
    { code: "or", label: "ଓଡ଼ିଆ (Odia)" },
    { code: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
    { code: "sa", label: "संस्कृतम् (Sanskrit)" },
    { code: "sat", label: "संताली (Santali)" },
    { code: "sd", label: "सिंधी (Sindhi)" },
    { code: "ta", label: "தமிழ் (Tamil)" },
    { code: "te", label: "తెలుగు (Telugu)" },
    { code: "ur", label: "اردو (Urdu)" },
  ];

  const handleLanguageChange = (langCode: string) => {
    // 1. Update i18next for offline fallback
    i18n.changeLanguage(langCode);

    // 2. Set Google Translate cookie (persists across reloads/pages)
    const cookieValue = `/en/${langCode}`;
    if (langCode === 'en') {
      // Clear the cookie to restore original English text
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname}`;
        if (hostname === 'localhost') {
          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost`;
        }
      }
    } else {
      document.cookie = `googtrans=${cookieValue}; path=/`;
      
      // Also try setting it with host domain
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        document.cookie = `googtrans=${cookieValue}; path=/; domain=.${hostname}`;
        // For local development on localhost
        if (hostname === 'localhost') {
          document.cookie = `googtrans=${cookieValue}; path=/; domain=localhost`;
        }
      }
    }

    // 3. Trigger Google Translate programmatically
    const translateSelect = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (translateSelect) {
      translateSelect.value = langCode;
      translateSelect.dispatchEvent(new Event('change'));
    } else {
      // Fallback: If Google Translate combo is not ready yet, reload so the cookie takes effect
      window.location.reload();
    }
    setLangDropdownOpen(false);
  };

  const getLanguageLabel = (code: string) => {
    const lang = languages.find((l) => l.code === code);
    return lang ? lang.code.split("-")[0].toUpperCase() : code.toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-4 md:px-8 flex items-center justify-between shadow-sm shrink-0">
      {/* Offscreen Google Translate container to allow proper initialization */}
      <div 
        id="google_translate_element" 
        className="absolute pointer-events-none opacity-0" 
        style={{ top: '-999px', left: '-999px', width: '1px', height: '1px', overflow: 'hidden' }} 
      />

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
        <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
          {t(title)}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Offline Language Switcher */}
        <div className="relative flex">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-md px-2.5 py-1.5 transition-colors focus:outline-none"
          >
            <Globe className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 uppercase min-w-[20px]">
              {getLanguageLabel(i18n.language)}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {langDropdownOpen && (
            <>
              {/* Invisible overlay to close dropdown on click outside */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setLangDropdownOpen(false)}
              />
              <div className="absolute top-full mt-1 right-0 w-48 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg z-50">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-primary-50 transition-colors ${
                      i18n.language === lang.code
                        ? "bg-primary-50 text-primary-700 font-bold"
                        : "text-slate-700"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
