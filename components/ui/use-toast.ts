import * as React from "react"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const toast = React.useCallback((props: ToastProps) => {
    // Simple implementation - you can enhance this with a proper toast system
    if (props.variant === "destructive") {
      console.error(`❌ ${props.title}: ${props.description}`)
      alert(`Error: ${props.title}\n${props.description}`)
    } else {
      console.log(`✅ ${props.title}: ${props.description}`)
      alert(`${props.title}\n${props.description}`)
    }
  }, [])

  return { toast }
}

export const toast = (props: ToastProps) => {
  if (props.variant === "destructive") {
    console.error(`❌ ${props.title}: ${props.description}`)
    alert(`Error: ${props.title}\n${props.description}`)
  } else {
    console.log(`✅ ${props.title}: ${props.description}`)
    alert(`${props.title}\n${props.description}`)
  }
}