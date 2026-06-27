'use client';

import { useRef, useEffect } from 'react';


export function useTelemetry(mapId: string, wordCount: number = 800) {
  const startTime = useRef<number>(0);
  const maxScroll = useRef<number>(0);
  const clickCount = useRef<number>(0);
  const tabSwitches = useRef<number>(0);

  useEffect(() => {
    startTime.current = Date.now();
    maxScroll.current = 0;
    clickCount.current = 0;
    tabSwitches.current = 0;

    // Track scroll depth
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        maxScroll.current = 100; // No scroll needed, already fully visible
        return;
      }
      const scrollPct = (window.scrollY / scrollHeight) * 100;
      maxScroll.current = Math.min(100, Math.max(maxScroll.current, Math.round(scrollPct)));
    };

    // Track clicks
    const handleClick = () => {
      clickCount.current += 1;
    };

    // Track tab switches / focus changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitches.current += 1;
      }
    };

    const handleBlur = () => {
      tabSwitches.current += 1;
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('click', handleClick);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // Initial check for scroll
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleClick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [mapId]);

  const getTelemetryData = () => {
    const timeOnPageSeconds = (Date.now() - startTime.current) / 1000;
    return {
      map_id: mapId,
      time_on_page_seconds: parseFloat(timeOnPageSeconds.toFixed(2)),
      max_scroll_percent: maxScroll.current,
      word_count: wordCount,
      click_count: clickCount.current,
      tab_switches: tabSwitches.current,
      submitted_at: new Date().toISOString()
    };
  };

  return { getTelemetryData };
}
