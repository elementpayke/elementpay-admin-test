"use client"

import { useState } from "react"
import { Trash, RefreshCw, Eye, EyeOff, AlertTriangle, Settings, Info } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import type { ApiKey, Environment } from "@/lib/types"

interface ApiKeyTableProps {
  apiKeys: ApiKey[]
  environment: Environment
  onRegenerate: (id: string) => void
  onRevoke: (id: string) => void
  onDelete: (id: string) => void
  onView: (apiKey: ApiKey) => void
  onEdit: (apiKey: ApiKey) => void
  isRegenerating: boolean
  isDeleting: boolean
}

export function ApiKeyTable({
  apiKeys,
  environment,
  onRegenerate,
  onRevoke,
  onDelete,
  onView,
  onEdit,
  isRegenerating,
  isDeleting
}: ApiKeyTableProps) {
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())

  const maskApiKey = (key: string): string => {
    if (!key || key.length <= 8) return key || 'N/A'
    return `${key.slice(0, 4)}${"*".repeat(Math.max(0, key.length - 8))}${key.slice(-4)}`
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

  const getEnvironmentBadge = (currentEnv: Environment) => {
    return currentEnv === "mainnet" ? (
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
      <div className="text-center py-12 text-muted-foreground space-y-4">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">No API keys found</p>
          <p className="text-sm">Create your first API key to start integrating with ElementPay</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* API Keys Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Keys</p>
                <p className="text-2xl font-bold text-green-700">
                  {apiKeys.filter(k => k.status === 'active').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Revoked Keys</p>
                <p className="text-2xl font-bold text-orange-700">
                  {apiKeys.filter(k => k.status === 'revoked').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Keys</p>
                <p className="text-2xl font-bold text-blue-700">{apiKeys.length}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* API Keys Table */}
        <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50 border-border/50">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">API Key</TableHead>
                <TableHead className="font-semibold">Environment</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey, index) => {
                const isRevealed = revealedKeys.has(apiKey.id)
                const safeKey = apiKey.key || 'N/A'
                const displayKey = isRevealed ? safeKey : maskApiKey(safeKey)
                
                return (
                  <TableRow 
                    key={apiKey.id} 
                    className={`hover:bg-muted/30 transition-colors border-border/50 ${
                      index % 2 === 0 ? 'bg-muted/10' : 'bg-background'
                    }`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                        {apiKey.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono text-sm">
                        <span className={`px-2 py-1 rounded-md border ${
                          isRevealed 
                            ? "text-foreground bg-background border-border" 
                            : "text-muted-foreground bg-muted/50 border-muted-foreground/20"
                        }`}>
                          {displayKey}
                        </span>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleReveal(apiKey.id)}
                                className="h-7 w-7 p-0 hover:bg-muted/50"
                              >
                                {isRevealed ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isRevealed ? "Hide preview" : "Show masked preview"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        {!isRevealed && (
                          <span className="text-xs text-muted-foreground/70 ml-2">
                            Full key shown only at creation
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getEnvironmentBadge(environment)}</TableCell>
                    <TableCell>{getStatusBadge(apiKey.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex flex-col">
                        <span className="text-sm">{new Date(apiKey.createdAt).toLocaleDateString()}</span>
                        <span className="text-xs text-muted-foreground/70">
                          {new Date(apiKey.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
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
                                  onClick={() => onView(apiKey)}
                                  className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View details</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEdit(apiKey)}
                                  className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit webhook config</TooltipContent>
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
      </div>
    </TooltipProvider>
  )
}
