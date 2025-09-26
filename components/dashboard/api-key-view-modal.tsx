"use client"

import { Copy, Check, Eye, EyeOff, ExternalLink, Settings, Shield, Calendar, Globe } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { toast as sonnerToast } from "sonner"
import { useState } from "react"
import type { ApiKey } from "@/lib/types"

interface ApiKeyViewModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (apiKey: ApiKey) => void
  apiKey: ApiKey | null
}

export function ApiKeyViewModal({ isOpen, onClose, onEdit, apiKey }: ApiKeyViewModalProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)

  if (!apiKey) return null

  const maskedKey = (key: string): string => {
    if (key.length <= 8) return key
    return `${key.slice(0, 4)}${"*".repeat(Math.max(0, key.length - 8))}${key.slice(-4)}`
  }

  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "absolute"
        textArea.style.left = "-9999px"
        textArea.style.top = "-9999px"
        textArea.style.opacity = "0"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (!successful) {
          throw new Error('execCommand copy failed')
        }
      }

      setCopied(true)
      sonnerToast.success("Copied to clipboard", {
        description: "Value copied successfully",
        duration: 2000,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      sonnerToast.error("Copy Failed", {
        description: "Failed to copy to clipboard. Please select and copy manually.",
        duration: 3000,
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const hasWebhookConfig = apiKey.webhookUrl || apiKey.webhookSecret

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            API Key Details
          </DialogTitle>
          <DialogDescription>
            View detailed information about your API key and its configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Name</div>
                  <div className="text-sm font-medium text-foreground">{apiKey.name}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Environment</div>
                  <div>
                    <Badge variant={apiKey.environment === 'mainnet' ? 'default' : 'secondary'}>
                      {apiKey.environment === 'mainnet' ? 'Production' : 'Sandbox'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Status</div>
                  <div>
                    <Badge variant={apiKey.status === 'active' ? 'default' : 'destructive'}>
                      {apiKey.status === 'active' ? 'Active' : 'Revoked'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Created</div>
                  <div className="text-sm text-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(apiKey.createdAt)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Key */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-4 w-4" />
                API Key
              </CardTitle>
              <CardDescription>
                The API key used for authentication with ElementPay services.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Key Value Trailer</span>
                
              </div>
              <div className="p-3 rounded-md border bg-muted/50 font-mono text-sm">
                {showKey ? apiKey.key : maskedKey(apiKey.key)}
              </div>
            </CardContent>
          </Card>

          {/* Webhook Configuration */}
          {hasWebhookConfig && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Webhook Configuration
                </CardTitle>
                <CardDescription>
                  Settings for receiving webhook notifications from ElementPay.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiKey.webhookUrl && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase">Webhook URL</div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-foreground font-mono break-all flex-1 mr-2">
                        {apiKey.webhookUrl}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(apiKey.webhookUrl!)}
                      >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
                {apiKey.webhookSecret && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase">Webhook Secret</div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-foreground font-mono break-all flex-1 mr-2">
                        {showKey ? apiKey.webhookSecret : maskedKey(apiKey.webhookSecret)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setShowKey(!showKey)}>
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(showKey ? apiKey.webhookSecret! : maskedKey(apiKey.webhookSecret!))}
                        >
                          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <div><strong>Security Reminder:</strong></div>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Store API keys securely and never expose them in client-side code.</li>
                  <li>Use environment variables or secure key management systems.</li>
                  <li>Rotate keys immediately if you suspect they have been compromised.</li>
                  {hasWebhookConfig && <li>Webhook secrets are used to verify the authenticity of webhook requests.</li>}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={() => onEdit(apiKey)} className="flex-1 sm:flex-none">
            <Settings className="h-4 w-4 mr-2" />
            {hasWebhookConfig ? 'Edit Webhook Config' : 'Add Webhook Config'}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
