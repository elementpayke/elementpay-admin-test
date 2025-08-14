"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Globe, TestTube } from "lucide-react"

interface EnvironmentToggleProps {
  currentEnvironment: 'sandbox' | 'live'
  onEnvironmentChange: (environment: 'sandbox' | 'live') => void
}

export function EnvironmentToggle({ currentEnvironment, onEnvironmentChange }: EnvironmentToggleProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
      <Button
        variant={currentEnvironment === "live" ? "default" : "ghost"}
        size="sm"
        onClick={() => onEnvironmentChange("live")}
        className="flex items-center gap-2"
      >
        <Globe className="h-4 w-4" />
        Live
        <Badge 
          variant={currentEnvironment === "live" ? "secondary" : "outline"} 
          className="ml-1 text-xs"
        >
          Production
        </Badge>
      </Button>
      <Button
        variant={currentEnvironment === "sandbox" ? "default" : "ghost"}
        size="sm"
        onClick={() => onEnvironmentChange("sandbox")}
        className="flex items-center gap-2"
      >
        <TestTube className="h-4 w-4" />
        Sandbox
        <Badge 
          variant={currentEnvironment === "sandbox" ? "secondary" : "outline"} 
          className="ml-1 text-xs"
        >
          Test
        </Badge>
      </Button>
    </div>
  )
}
