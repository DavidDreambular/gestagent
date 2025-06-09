'use client'

import { useKeyboardShortcuts, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts'

export function KeyboardShortcutsHelp({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean
  onClose: () => void 
}) {
  const { shortcuts } = useKeyboardShortcuts()

  if (!isOpen) return null

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const parts: string[] = []
    
    if (shortcut.modifiers?.ctrl) parts.push('Ctrl')
    if (shortcut.modifiers?.alt) parts.push('Alt')
    if (shortcut.modifiers?.shift) parts.push('Shift')
    if (shortcut.modifiers?.meta) parts.push('Cmd')
    
    parts.push(shortcut.key === ' ' ? 'Espacio' : shortcut.key.toUpperCase())
    
    return parts.join(' + ')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Atajos de Teclado
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              data-close-modal
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <span className="text-gray-700 dark:text-gray-300">
                  {shortcut.description}
                </span>
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                  {formatShortcut(shortcut)}
                </kbd>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            <p>Los atajos no funcionan cuando estás escribiendo en campos de texto.</p>
            <p>Presiona <kbd className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded">?</kbd> para mostrar/ocultar esta ayuda.</p>
          </div>
        </div>
      </div>
    </div>
  )
} 