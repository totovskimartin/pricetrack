'use client'

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  maxDisplay?: number
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  maxDisplay = 2
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const handleRemove = (value: string) => {
    onChange(selected.filter(item => item !== value))
  }

  const selectedOptions = options.filter(option => selected.includes(option.value))

  const displayText = () => {
    if (selected.length === 0) {
      return placeholder
    }

    if (selected.length <= maxDisplay) {
      return selectedOptions.map(option => option.label).join(", ")
    }

    return `${selectedOptions.slice(0, maxDisplay).map(option => option.label).join(", ")} +${selected.length - maxDisplay}`
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal h-10"
          onClick={() => setOpen(!open)}
        >
          <span className="truncate text-sm">{displayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />

            {/* Dropdown */}
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
              {options.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center px-3 py-2 hover:bg-muted cursor-pointer"
                  onClick={() => handleSelect(option.value)}
                >
                  <div className="flex items-center justify-center w-4 h-4 mr-3 border border-border rounded">
                    {selected.includes(option.value) && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <span className="text-sm text-foreground">{option.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Selected items as badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedOptions.slice(0, maxDisplay).map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="text-xs"
            >
              {option.label}
              <button
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRemove(option.value)
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={() => handleRemove(option.value)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          {selected.length > maxDisplay && (
            <Badge variant="secondary" className="text-xs">
              +{selected.length - maxDisplay} more
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
