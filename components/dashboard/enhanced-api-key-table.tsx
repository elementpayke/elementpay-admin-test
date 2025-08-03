"use client"

import { useState } from "react"
import { Copy, Trash, RefreshCw, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import type { ApiKey, Environment } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

interface ApiKeyTableProps {
  apiKeys: ApiKey[]
  environment: Environment
  onRegenerate: (id: string) => void
  onRevoke: (id: string) => void
  onDelete: (id: string) => void
  isRegenerating: boolean
  isDeleting: boolean
}

export function ApiKeyTable({ 
  apiKeys, 
  environment, 
  onRegenerate, 
  onRevoke, 
  onDelete, 
  isRegenerating, 
  isDeleting 
}: ApiKeyTableProps) {
  const { toast } = useToast()
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())

  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return key
    return `${key.slice(0, 4)}${"*".repeat(Math.max(0, key.length - 8))}${key.slice(-4)}`
  }

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key)
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard.",
    })
  }

  const toggleReveal = (keyId: string) => {
    const newRevealed = new Set(revealedKeys)
    if (newRevealed.has(keyId)) {
      newRevealed.delete(keyId)
    } else {
      newRevealed.add(keyId)
    }
    setRevealedKeys(newRevealed)
  }

  const getEnvironmentBadge = (env: Environment) => {
    return env === "mainnet" ? (
      <Badge variant="default" className="bg-green-600">Production</Badge>
    ) : (
      <Badge variant="secondary" className="bg-blue-600">Sandbox</Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="default" className="bg-green-600">Active</Badge>
    ) : (
      <Badge variant="destructive">Revoked</Badge>
    )
  }

  if (apiKeys.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No API keys found for {environment}.</p>
        <p className="text-sm">Create your first API key to get started.</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((apiKey) => {
              const isRevealed = revealedKeys.has(apiKey.id)
              const displayKey = isRevealed ? apiKey.key : maskApiKey(apiKey.key)
              
              return (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">{apiKey.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className={isRevealed ? "text-foreground" : "text-muted-foreground"}>
                        {displayKey}
                      </span>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleReveal(apiKey.id)}
                              className="h-6 w-6 p-0"
                            >
                              {isRevealed ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isRevealed ? "Hide key" : "Reveal key"}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(apiKey.key)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy to clipboard</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getEnvironmentBadge(apiKey.environment)}</TableCell>
                  <TableCell>{getStatusBadge(apiKey.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(apiKey.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {apiKey.status === "active" && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRegenerate(apiKey.id)}
                                disabled={isRegenerating}
                                className="h-8 w-8 p-0"
                              >
                                <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Regenerate key</TooltipContent>
                          </Tooltip>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke "{apiKey.name}"? This action will immediately 
                                  disable the API key and cannot be undone. Any applications using this key will stop working.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => onRevoke(apiKey.id)}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  Revoke Key
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isDeleting}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to permanently delete "{apiKey.name}"? 
                              This action cannot be undone and will remove all records of this API key.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDelete(apiKey.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
