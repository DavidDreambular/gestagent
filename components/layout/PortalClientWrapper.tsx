'use client';

import { ThemeProvider } from '@/contexts/ThemeContext';

interface PortalClientWrapperProps {
  children: React.ReactNode;
}

export function PortalClientWrapper({ children }: PortalClientWrapperProps) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
} 