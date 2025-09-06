"use client"

import { useMemo, useState } from "react"
import { Copy, Check, AlertTriangle, Eye, EyeOff, Download, Shield } from "lucide-react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"

interface ApiKeyRevealModalProps {
  isOpen: boolean
  onClose: () => void
  apiKey: {
    name: string
    key: string
    environment: string
  } | null
}

export function ApiKeyRevealModal({ isOpen, onClose, apiKey }: ApiKeyRevealModalProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [showKey, setShowKey] = useState(true)
  

  const maskedKey = useMemo(() => {
    if (!apiKey?.key) return ""
    const k = apiKey.key
    if (k.length <= 8) return k
    return `${k.slice(0, 4)}${"*".repeat(Math.max(0, k.length - 8))}${k.slice(-4)}`
  }, [apiKey?.key])

  const handleCopy = async () => {
    if (!apiKey?.key) {
      toast({
        title: "Copy Failed",
        description: "No API key available to copy.",
      })
      return
    }
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(apiKey.key)
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        const textArea = document.createElement("textarea")
        textArea.value = apiKey.key
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
      toast({
        title: "API Key Copied",
        description: "The API key has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy API key to clipboard. Please select and copy manually.",
      })
    }
  }

  const handleDownload = () => {
    if (!apiKey?.key) {
      toast({
        title: "Download Failed",
        description: "No API key available to download.",
      })
      return
    }
    
    try {
      const content = `Element Pay API Key

Name: ${apiKey.name || 'Unnamed Key'}
Environment: ${apiKey.environment || 'unknown'}
API Key: ${apiKey.key}
Generated: ${new Date().toISOString()}

IMPORTANT: Store this securely. Do not share publicly or commit to version control.`

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      
      const safeName = (apiKey.name || 'api-key')
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
        
      link.href = url
      link.download = `${safeName}-${apiKey.environment || 'unknown'}-${Date.now()}.txt`
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Downloaded",
        description: "API key has been downloaded as a text file.",
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download API key file.",
      })
    }
  }


  const handleClose = (force = false) => {
    if (!force && !acknowledged) {
      toast({
        title: "Please Acknowledge",
        description: "You must acknowledge that you've saved the API key before closing.",
      })
      return
    }
    setAcknowledged(false)
    setCopied(false)
    setShowKey(true) // Reset to show key for next time
    onClose()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Allow force close when using X button or clicking outside
      handleClose(true)
    }
  }

  if (!apiKey) return null

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleOpenChange}
    >
      <DialogContent 
        className="sm:max-w-[620px]"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            API key created successfully
          </DialogTitle>
          <DialogDescription>
            Copy and store it securely now. This is the only time the full key will be visible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Key Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase">Name</div>
              <div className="text-sm font-medium text-foreground truncate" title={apiKey.name || 'Unnamed Key'}>
                {apiKey.name || 'Unnamed Key'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase">Environment</div>
              <div>
                <Badge variant="outline" className="capitalize text-foreground">
                  {apiKey.environment || 'unknown'}
                </Badge>
              </div>
            </div>
          </div>

          {/* API Key Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">API Key</label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Download</span>
                </Button>
              </div>
            </div>
            <div className="p-4 rounded-md border bg-card text-card-foreground">
              {apiKey.key && apiKey.key.trim() ? (
                <code className="block text-sm font-mono break-all select-all text-foreground">
                  {showKey ? apiKey.key : maskedKey}
                </code>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <div className="font-medium text-amber-600 mb-2">⚠️ Full API Key Not Available</div>
                  <p>The API key was created successfully, but there was an issue retrieving the full key for display.</p>
                  <p className="mt-2">You can find your complete API key in the list above once the page refreshes.</p>
                </div>
              )}
            </div>
          </div>

          {/* Security Warning */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="space-y-1 text-sm">
                <div><strong>Important:</strong> This is the only time you can view the full key.</div>
                <ul className="list-disc ml-5">
                  <li>Store it in a secure password manager.</li>
                  <li>Don’t share it publicly or commit it to git.</li>
                  <li>Rotate keys immediately if exposed.</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Acknowledgment Checkbox - Optional */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="acknowledge"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="acknowledge" className="text-sm text-muted-foreground cursor-pointer">
              I've copied and securely stored this API key (recommended)
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(true)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
