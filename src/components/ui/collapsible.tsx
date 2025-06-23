'use client'

import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface CollapsibleProps {
  children: React.ReactNode
  title: string
  defaultOpen?: boolean
  className?: string
  icon?: React.ReactNode
}

export function Collapsible({ 
  children, 
  title, 
  defaultOpen = false, 
  className,
  icon 
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn("border rounded-lg bg-card shadow-sm", className)}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between p-4 h-auto font-medium text-left hover:bg-accent"
      >
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-foreground">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
      
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}
