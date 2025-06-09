'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SearchCommand from './SearchCommand';

interface KeyboardShortcutsProps {
  children: React.ReactNode;
}

export default function KeyboardShortcuts({ children }: KeyboardShortcutsProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar si estamos en un input, textarea o elemento editable
      const target = event.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.contentEditable === 'true';

      // Cmd/Ctrl + K para búsqueda global
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // Solo procesar otros atajos si no estamos en un input
      if (isInputElement) return;

      // Manejar otros atajos
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'n':
            event.preventDefault();
            router.push('/dashboard/documents/new');
            break;
          case 'd':
            event.preventDefault();
            router.push('/dashboard');
            break;
          case 'l':
            event.preventDefault();
            router.push('/dashboard/documents');
            break;
          case 'p':
            event.preventDefault();
            router.push('/dashboard/suppliers');
            break;
          case 'c':
            event.preventDefault();
            router.push('/dashboard/customers');
            break;
          case 's':
            event.preventDefault();
            // Buscar botón de guardar
            const saveButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
            if (saveButton && !saveButton.disabled) {
              saveButton.click();
            } else {
              const saveButtons = Array.from(document.querySelectorAll('button'))
                .filter(btn => btn.textContent?.toLowerCase().includes('guardar'));
              if (saveButtons.length > 0) {
                (saveButtons[0] as HTMLButtonElement).click();
              }
            }
            break;
        }
      }

      // Escape para cerrar modales
      if (event.key === 'Escape') {
        // Cerrar modales abiertos
        const modalCloseButtons = document.querySelectorAll('[data-dismiss="modal"], [role="dialog"] button[aria-label="Close"]');
        if (modalCloseButtons.length > 0) {
          (modalCloseButtons[modalCloseButtons.length - 1] as HTMLButtonElement).click();
        }
        
        // Cerrar dropdowns abiertos
        const openDropdowns = document.querySelectorAll('[data-state="open"]');
        openDropdowns.forEach(dropdown => {
          const closeButton = dropdown.querySelector('button');
          if (closeButton) {
            closeButton.click();
          }
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <>
      {children}
      <SearchCommand 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
} 