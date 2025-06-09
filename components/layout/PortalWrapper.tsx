'use client';

import { ThemeProvider } from '@/contexts/ThemeContext';

export function PortalWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
} 