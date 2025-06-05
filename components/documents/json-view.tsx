"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, CopyIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface JsonViewProps {
  data: any
  level?: number
  isLast?: boolean
  property?: string
}

export function JsonView({ data, level = 0, isLast = true, property }: JsonViewProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderValue = (value: any) => {
    if (value === null) return <span className="text-gray-500">null</span>
    if (value === undefined) return <span className="text-gray-500">undefined</span>
    if (typeof value === "boolean") return <span className="text-purple-600">{value.toString()}</span>
    if (typeof value === "number") return <span className="text-blue-600">{value}</span>
    if (typeof value === "string") return <span className="text-green-600">&quot;{value}&quot;</span>
    return null
  }

  const isObject = data !== null && typeof data === "object"
  const isArray = Array.isArray(data)
  const isEmpty = isObject && Object.keys(data).length === 0

  if (!isObject) {
    return (
      <div className="flex items-start">
        {property && <span className="text-red-600 mr-1">&quot;{property}&quot;:</span>}
        {renderValue(data)}
        {!isLast && <span>,</span>}
      </div>
    )
  }

  return (
    <div className={cn("pl-4", { "border-l border-gray-200 dark:border-gray-700": level > 0 })}>
      {level === 0 && (
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard} className="text-xs">
            <CopyIcon className="h-3 w-3 mr-1" />
            {copied ? "Copiado!" : "Copiar"}
          </Button>
        </div>
      )}

      <div className="flex items-start">
        {property && <span className="text-red-600 mr-1">&quot;{property}&quot;:</span>}

        <button
          onClick={toggleExpand}
          className="mr-1 focus:outline-none"
          aria-label={isExpanded ? "Colapsar" : "Expandir"}
        >
          {isEmpty ? null : isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>

        <span>{isArray ? "[" : "{"}</span>

        {isEmpty && <span>{isArray ? "]" : "}"}</span>}

        {!isLast && !isEmpty && <span>,</span>}
      </div>

      {!isEmpty && isExpanded && (
        <div className="ml-4">
          {Object.entries(data).map(([key, value], index, arr) => (
            <JsonView key={key} data={value} level={level + 1} isLast={index === arr.length - 1} property={key} />
          ))}
        </div>
      )}

      {!isEmpty && isExpanded && (
        <div>
          <span>{isArray ? "]" : "}"}</span>
          {!isLast && <span>,</span>}
        </div>
      )}
    </div>
  )
}

