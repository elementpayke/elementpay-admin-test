"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Globe, TestTube } from "lucide-react"
import type { Environment } from "@/lib/types"

interface EnvironmentToggleProps {
  currentEnvironment: Environment
  onEnvironmentChange: (environment: Environment) => void
}

export function EnvironmentToggle({ currentEnvironment, onEnvironmentChange }: EnvironmentToggleProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
      <Button
        variant={currentEnvironment === "mainnet" ? "default" : "ghost"}
        size="sm"
        onClick={() => onEnvironmentChange("mainnet")}
        className="flex items-center gap-2"
      >
        <Globe className="h-4 w-4" />
        Mainnet
        <Badge 
          variant={currentEnvironment === "mainnet" ? "secondary" : "outline"} 
          className="ml-1 text-xs"
        >
          Production
        </Badge>
      </Button>
      <Button
        variant={currentEnvironment === "testnet" ? "default" : "ghost"}
        size="sm"
        onClick={() => onEnvironmentChange("testnet")}
        className="flex items-center gap-2"
      >
        <TestTube className="h-4 w-4" />
        Testnet
        <Badge 
          variant={currentEnvironment === "testnet" ? "secondary" : "outline"} 
          className="ml-1 text-xs"
        >
          Sandbox
        </Badge>
      </Button>
    </div>
  )
}
