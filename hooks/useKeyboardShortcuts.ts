import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  modifiers?: {
    ctrl?: boolean
    alt?: boolean
    shift?: boolean
    meta?: boolean
  }
}

export function useKeyboardShortcuts() {
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      description: 'Búsqueda global',
      modifiers: { ctrl: true },
      action: () => {
        const searchButton = document.querySelector('[data-search-trigger]') as HTMLElement
        if (searchButton) {
          searchButton.click()
        }
      }
    },
    {
      key: 'n',
      description: 'Nuevo documento',
      modifiers: { ctrl: true },
      action: () => {
        router.push('/dashboard/documents/new')
      }
    },
    {
      key: 's',
      description: 'Guardar',
      modifiers: { ctrl: true },
      action: () => {
        const saveButton = document.querySelector('[data-save-trigger]') as HTMLElement
        if (saveButton) {
          saveButton.click()
        }
      }
    },
    {
      key: 'Escape',
      description: 'Cerrar modales',
      action: () => {
        const escapeHandler = new KeyboardEvent('keydown', { key: 'Escape' })
        document.dispatchEvent(escapeHandler)
      }
    },
    {
      key: '?',
      description: 'Mostrar ayuda',
      action: () => {
        setShowHelp(prev => !prev)
      }
    }
  ]

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find(s => {
        const modifiersMatch = !s.modifiers || Object.entries(s.modifiers).every(([modifier, required]) => {
          if (!required) return true
          switch (modifier) {
            case 'ctrl': return event.ctrlKey
            case 'alt': return event.altKey
            case 'shift': return event.shiftKey
            case 'meta': return event.metaKey
            default: return false
          }
        })
        
        return s.key.toLowerCase() === event.key.toLowerCase() && modifiersMatch
      })

      if (shortcut) {
        event.preventDefault()
        shortcut.action()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [router])

  return {
    shortcuts,
    showHelp,
    setShowHelp
  }
}

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const keys = []
  if (shortcut.modifiers?.ctrl) keys.push('Ctrl')
  if (shortcut.modifiers?.alt) keys.push('Alt')
  if (shortcut.modifiers?.shift) keys.push('Shift')
  if (shortcut.modifiers?.meta) keys.push('Cmd')
  keys.push(shortcut.key.toUpperCase())
  return keys.join(' + ')
} 