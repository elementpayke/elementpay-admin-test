"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Globe, TestTube } from "lucide-react"
import type { Environment } from "@/lib/types"

interface CreateApiKeyDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { name: string; environment: Environment }) => void
  isCreating: boolean
  defaultEnvironment?: Environment
}

export function CreateApiKeyDialog({ 
  isOpen, 
  onOpenChange, 
  onCreate, 
  isCreating, 
  defaultEnvironment = "testnet" 
}: CreateApiKeyDialogProps) {
  const [keyName, setKeyName] = useState("")
  // For now, we only support testnet
  const environment: Environment = "testnet"

  const handleSubmit = (e: React.FormEvent) => {
    console.log('CreateApiKeyDialog handleSubmit called')
    console.log('Form event:', e)
    console.log('keyName:', keyName)
    console.log('keyName.trim():', keyName.trim())
    
    e.preventDefault()
    if (keyName.trim()) {
      console.log('Calling onCreate with:', { name: keyName.trim(), environment })
      onCreate({ name: keyName.trim(), environment })
      setKeyName("")
      console.log('onCreate called, keyName cleared')
    } else {
      console.log('keyName is empty, not calling onCreate')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Testnet API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for Element Pay sandbox environment. This key will only work in the testnet environment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="name">API Key Name</Label>
              <Input
                id="name"
                placeholder="e.g., Test App Key, Development API"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="space-y-3">
              <Label>Environment</Label>
              <div className="flex items-center space-x-3 border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                <TestTube className="h-5 w-5 text-blue-600" />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="font-medium">Testnet (Sandbox)</div>
                    <p className="text-sm text-muted-foreground">Development and testing environment</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    Sandbox
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Mainnet (Production) keys are not available yet. Coming soon!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!keyName.trim() || isCreating}>
              {isCreating ? "Creating..." : "Create API Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
