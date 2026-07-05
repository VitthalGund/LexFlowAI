'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);

          // Check for updates periodically (every 30 minutes)
          const updateInterval = setInterval(() => {
            registration.update();
          }, 30 * 60 * 1000);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('New service worker version detected, preparing activation...');
                  } else {
                    console.log('Content is cached for offline use.');
                  }
                }
              });
            }
          });

          return () => clearInterval(updateInterval);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      // Reload page automatically when the new service worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  return null;
}

