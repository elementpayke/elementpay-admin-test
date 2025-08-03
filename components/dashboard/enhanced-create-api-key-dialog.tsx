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
  const [environment, setEnvironment] = useState<Environment>(defaultEnvironment)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyName.trim()) {
      onCreate({ name: keyName.trim(), environment })
      setKeyName("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for your application. Choose the environment and give it a descriptive name.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="name">API Key Name</Label>
              <Input
                id="name"
                placeholder="e.g., Production API, Mobile App Key"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="space-y-3">
              <Label>Environment</Label>
              <RadioGroup
                value={environment}
                onValueChange={(value) => setEnvironment(value as Environment)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50">
                  <RadioGroupItem value="mainnet" id="mainnet" />
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-green-600" />
                      <div>
                        <Label htmlFor="mainnet" className="font-medium">Mainnet</Label>
                        <p className="text-sm text-muted-foreground">Production environment</p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-600">
                      Production
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50">
                  <RadioGroupItem value="testnet" id="testnet" />
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <TestTube className="h-5 w-5 text-blue-600" />
                      <div>
                        <Label htmlFor="testnet" className="font-medium">Testnet</Label>
                        <p className="text-sm text-muted-foreground">Development and testing</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-600">
                      Sandbox
                    </Badge>
                  </div>
                </div>
              </RadioGroup>
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
