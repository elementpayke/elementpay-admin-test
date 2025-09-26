"use client"

import { useState, useEffect } from "react"
import { Globe, Shield, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { toast as sonnerToast } from "sonner"
import type { ApiKey } from "@/lib/types"

interface ApiKeyEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (apiKeyId: string, webhookUrl: string, webhookSecret: string) => Promise<void>
  apiKey: ApiKey | null
  isLoading?: boolean
}

export function ApiKeyEditModal({ isOpen, onClose, onSave, apiKey, isLoading }: ApiKeyEditModalProps) {
  const { toast } = useToast()
  const [webhookUrl, setWebhookUrl] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [errors, setErrors] = useState<{ url?: string; secret?: string }>({})

  useEffect(() => {
    if (apiKey && isOpen) {
      setWebhookUrl(apiKey.webhookUrl || "")
      setWebhookSecret(apiKey.webhookSecret || "")
      setShowSecret(false)
      setErrors({})
    }
  }, [apiKey, isOpen])

  // Auto-clear webhook secret when URL is empty
  useEffect(() => {
    if (webhookUrl.trim() === "" && webhookSecret.trim() !== "") {
      setWebhookSecret("")
    }
  }, [webhookUrl, webhookSecret])

  if (!apiKey) return null

  const validateUrl = (url: string): string | undefined => {
    if (!url.trim()) return undefined // Optional field

    try {
      new URL(url)
      return undefined
    } catch {
      return "Please enter a valid URL (e.g., https://api.example.com/webhooks)"
    }
  }

  const validateSecret = (secret: string): string | undefined => {
    if (!secret.trim()) return undefined // Optional field

    if (secret.length < 8) {
      return "Webhook secret should be at least 8 characters long"
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(secret)) {
      return "Webhook secret can only contain letters, numbers, hyphens, and underscores"
    }

    return undefined
  }

  const handleSave = async () => {
    const urlError = validateUrl(webhookUrl)
    const secretError = validateSecret(webhookSecret)

    setErrors({
      url: urlError,
      secret: secretError,
    })

    if (urlError || secretError) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below before saving.",
        variant: "destructive",
      })
      return
    }

    try {
      await onSave(apiKey.id, webhookUrl.trim(), webhookSecret.trim())
      sonnerToast.success("Webhook Configuration Updated", {
        description: "Your API key webhook settings have been updated successfully.",
        duration: 4000,
      })
      onClose()
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error occurred"
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const generateSecret = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setWebhookSecret(result)
  }

  const originalUrl = apiKey.webhookUrl || ""
  const originalSecret = apiKey.webhookSecret || ""
  const hasChanges = webhookUrl !== originalUrl || webhookSecret !== originalSecret
  const hasAnyValue = webhookUrl.trim() || webhookSecret.trim()
  const hasOriginalConfig = originalUrl || originalSecret
  const isRemovingConfig = hasOriginalConfig && !hasAnyValue

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            {hasOriginalConfig ? 'Edit Webhook Configuration' : 'Add Webhook Configuration'}
          </DialogTitle>
          <DialogDescription>
            {hasOriginalConfig
              ? 'Modify webhook settings for API key "' + apiKey.name + '". These settings will be used to send notifications to your application.'
              : 'Configure webhook settings for API key "' + apiKey.name + '". These settings will be used to send notifications to your application.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* API Key Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">API Key</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{apiKey.name}</span>
                <span className="text-xs text-muted-foreground">ID: {apiKey.id}</span>
              </div>
            </CardContent>
          </Card>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="webhookUrl" className="text-sm font-medium">
              Webhook URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="webhookUrl"
              type="url"
              placeholder="https://api.example.com/webhooks/payment"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className={errors.url ? "border-red-500" : ""}
            />
            {errors.url && (
              <p className="text-xs text-red-500">{errors.url}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The URL where ElementPay will send webhook notifications for payment events.
            </p>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-2">
            <Label htmlFor="webhookSecret" className="text-sm font-medium">
              Webhook Secret <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="webhookSecret"
                  type={showSecret ? "text" : "password"}
                  placeholder="Enter a secure webhook secret"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className={`pr-10 ${errors.secret ? "border-red-500" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button type="button" variant="outline" onClick={generateSecret}>
                Generate
              </Button>
            </div>
            {errors.secret && (
              <p className="text-xs text-red-500">{errors.secret}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Secret used to verify the authenticity of webhook requests from ElementPay.
            </p>
          </div>

          {/* Info Alert */}
          {hasAnyValue && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <div><strong>Webhook Security:</strong></div>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Your webhook endpoint should validate the request signature using the webhook secret.</li>
                    <li>Ensure your webhook URL is accessible from the internet and can handle HTTPS requests.</li>
                    <li>Test your webhook endpoint thoroughly before going live.</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning if removing config */}
          {isRemovingConfig && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <div><strong>Warning:</strong></div>
                  <p>You're about to remove all webhook configuration. This means ElementPay won't be able to send webhook notifications to your application.</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-none"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !hasChanges}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              isRemovingConfig ? "Remove Configuration" : hasOriginalConfig ? "Update Configuration" : "Add Configuration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
